"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { generateSmartTemplate } from '../../lib/diagramGenerator';
import { exportToPDF, getCurrentDateTime } from '../../lib/pdfExport';
import { motion } from 'framer-motion';

interface AnimationEditorProps {
  code: string;
  onSave: (code: string) => void;
  onClose: () => void;
}

function AnimationEditor({ code, onSave, onClose }: AnimationEditorProps) {
  const [value, setValue] = useState(code);
  
  React.useEffect(() => {
    // Prevent background scroll and interaction when modal is open
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl text-gray-900" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">Edit Diagram Code</h2>
        
        <textarea
          className="w-full h-64 border rounded p-2 mb-4 font-mono text-sm text-gray-900 bg-gray-100 placeholder-gray-500 caret-gray-900"
          placeholder="Paste your Mermaid diagram code here..."
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        
        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(value)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

interface AnimationCanvasProps {
  code: string;
  onClick: () => void;
  idx: number;
  onGenerateAI?: () => void;
  generating?: boolean;
}

// Add type declarations for window properties
declare global {
  interface Window {
    mermaid?: any;
    __mermaidLoading?: boolean;
  }
}

function AnimationCanvas({ code, onClick, idx, onGenerateAI, generating }: AnimationCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [svgNode, setSvgNode] = useState<SVGSVGElement | null>(null);
  const [mermaidLoading, setMermaidLoading] = useState(false);
  const uniqueId = `mermaid-svg-${idx}`;

  // Helper to load Mermaid from installed package (client only)
  function loadMermaidScript(): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('Not in browser'));
        return;
      }
      if (window.mermaid) {
        resolve(window.mermaid);
        return;
      }
      import('mermaid').then((mermaidModule) => {
        window.mermaid = mermaidModule.default || mermaidModule;
        if (window.mermaid && typeof window.mermaid.initialize === 'function') {
          window.mermaid.initialize({ startOnLoad: false });
        }
        resolve(window.mermaid);
      }).catch(reject);
    });
  }

  function isValidMermaidFlowchart(code: string): boolean {
    const validTypes = [
      'flowchart', 'graph', 'sequenceDiagram', 'classDiagram', 
      'erDiagram', 'gantt', 'pie', 'journey', 'gitgraph', 'stateDiagram'
    ];
    const trimmedCode = code.trim();
    if (!trimmedCode) return false;
    return validTypes.some(type => 
      trimmedCode.toLowerCase().startsWith(type.toLowerCase())
    );
  }

  async function renderMermaid() {
    // Defensive: Only run on client and when ref.current is available
    if (typeof window === 'undefined' || !ref.current || !code.trim()) {
      setLoading(false);
      setError(null);
      return;
    }

    if (!isValidMermaidFlowchart(code)) {
      setError('Invalid Mermaid diagram code. Please check the syntax.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mermaid = await loadMermaidScript();
      setMermaidLoading(false);

      // Defensive: Check again for ref.current
      if (!ref.current) {
        setLoading(false);
        setError('Diagram container not found.');
        return;
      }

      // Clear previous content
      ref.current.innerHTML = '';

      // Create a unique ID for this diagram
      const diagramId = `mermaid-diagram-${uniqueId}`;

      // Log the Mermaid code being rendered
      console.log('Rendering Mermaid code:', code);

      // Render the diagram
      let svg;
      try {
        const result = await mermaid.render(diagramId, code);
        svg = result.svg;
      } catch (err) {
        console.error('Mermaid render error:', err, 'Code:', code);
        setError(`Failed to render diagram: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
        return;
      }

      // Insert the SVG into the container
      ref.current.innerHTML = svg;

      // Store the SVG node for fullscreen functionality
      const svgElement = ref.current.querySelector('svg');
      if (svgElement) {
        setSvgNode(svgElement as SVGSVGElement);
      }

      setLoading(false);
    } catch (err) {
      console.error('Mermaid rendering error:', err);
      setError(`Failed to render diagram: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoading(false);
    }
  }

  const renderFullscreenSVG = () => {
    if (!svgNode) return null;
    // Clone the SVG node to avoid modifying the original
    const clonedSvg = svgNode.cloneNode(true) as SVGSVGElement;
    // Remove any existing viewBox and set appropriate dimensions
    // (If the SVG already has a viewBox, keep it for scaling)
    // Set width/height to 100% for fullscreen
    clonedSvg.style.width = '100%';
    clonedSvg.style.height = '100%';
    clonedSvg.style.maxWidth = '100%';
    clonedSvg.style.maxHeight = '100%';
    clonedSvg.removeAttribute('width');
    clonedSvg.removeAttribute('height');
    return (
      <div className="fullscreen-svg-container">
        {/* Render the SVG directly as a React element */}
        {clonedSvg.outerHTML ? (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ width: '90vw', height: '90vh', overflow: 'auto', background: '#fff', borderRadius: 16 }}
            dangerouslySetInnerHTML={{ __html: clonedSvg.outerHTML }}
          />
        ) : null}
      </div>
    );
  };

  useEffect(() => {
    // Only attempt to render if ref.current is available and on client
    if (typeof window !== 'undefined' && ref.current) {
      renderMermaid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <>
      <style jsx>{`
        .fullscreen-modal-bg {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fullscreen-modal-content {
          background: transparent;
          border-radius: 0;
          width: 90vw;
          height: 90vh;
          max-width: 90vw;
          max-height: 90vh;
          padding: 0;
          position: relative;
          box-shadow: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fullscreen-svg-container {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.25);
          padding: 0;
          width: 90vw;
          height: 90vh;
          max-width: 90vw;
          max-height: 90vh;
          overflow: auto;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fullscreen-svg {
          width: 100% !important;
          height: 100% !important;
          max-width: 100% !important;
          max-height: 100% !important;
          display: block;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        }
        .fullscreen-close-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          background: #fff;
          border: none;
          border-radius: 50%;
          width: 2.5rem;
          height: 2.5rem;
          font-size: 1.5rem;
          color: #333;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1001;
        }
        .fullscreen-btn {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 50%;
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.3rem;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          cursor: pointer;
          z-index: 10;
        }
        .fullscreen-btn:hover {
          background: #1d4ed8;
        }
        /* Responsive SVG in placeholder */
        .mermaid svg {
          width: 100% !important;
          height: auto !important;
          max-width: 100% !important;
          max-height: 400px !important;
          display: block;
          margin: 0 auto;
          background: #f8fafc;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }
      `}</style>
      <div
        className="w-full bg-gray-100 border-2 border-dashed border-gray-400 flex flex-col items-center justify-center cursor-pointer mt-6 mb-4 relative overflow-visible p-4"
        onClick={onClick}
      >
        {(loading || mermaidLoading) && <span className="text-gray-400">{mermaidLoading ? "Loading diagram engine..." : "Rendering diagram..."}</span>}
        {error && (
          <div className="text-red-500 text-sm">
            {error}
            <pre className="bg-gray-50 text-xs text-gray-700 mt-2 p-2 border rounded overflow-x-auto">{code}</pre>
          </div>
        )}
        {!code.trim() && !loading && !error && (
          <div className="w-full flex flex-col items-center justify-center gap-2 bg-white bg-opacity-90 py-6">
            <p className="text-gray-600 mb-2 text-center">Click to add a diagram</p>
            <p className="text-xs text-gray-400 text-center">Paste your Mermaid diagram code</p>
            {onGenerateAI && (
              <button
                className="mt-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow"
                onClick={e => { e.stopPropagation(); onGenerateAI(); }}
                disabled={generating}
              >
                {generating ? 'Generating...' : '✨ Generate AI Image'}
              </button>
            )}
          </div>
        )}
        <div ref={ref} className="w-full h-full flex items-center justify-center" />
        {/* Fullscreen button, only show if diagram is present */}
        {svgNode && (
          <button
            className="fullscreen-btn"
            title="View Fullscreen"
            onClick={e => {
              e.stopPropagation();
              setIsFullscreen(true);
            }}
          >
            <span role="img" aria-label="Expand">⛶</span>
          </button>
        )}
        {/* Fullscreen Modal */}
        {isFullscreen && (
          <div className="fullscreen-modal-bg" onClick={() => setIsFullscreen(false)}>
            <div className="fullscreen-modal-content" onClick={e => e.stopPropagation()}>
              <button className="fullscreen-close-btn" onClick={() => setIsFullscreen(false)} title="Close Fullscreen">×</button>
              {/* Render the cloned SVG node as HTML in a white, padded, scrollable container */}
              {renderFullscreenSVG()}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Debounce hook
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}

function extractHeadingsAndContent(markdown: string) {
  // Returns an array of { heading: string, level: number, content: string }
  const lines = markdown.split('\n');
  const result: { heading: string, level: number, content: string }[] = [];
  let currentHeading = null;
  let currentLevel = 0;
  let currentContent: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,6})\s*(.+)$/);
    if (match) {
      if (currentHeading !== null) {
        result.push({ heading: currentHeading, level: currentLevel, content: currentContent.join('\n').trim() });
      }
      currentHeading = match[2].trim();
      currentLevel = match[1].length;
      currentContent = [];
    } else if (currentHeading !== null) {
      currentContent.push(lines[i]);
    }
  }
  if (currentHeading !== null) {
    result.push({ heading: currentHeading, level: currentLevel, content: currentContent.join('\n').trim() });
  }
  return result;
}

export default function MarkdownWithAnimations() {
  const [markdown, setMarkdown] = useState("");
  const [animations, setAnimations] = useState<{ [key: number]: string }>({});
  const [summaries, setSummaries] = useState<{ [key: number]: string }>({});
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [inputOpen, setInputOpen] = useState(true);
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Debounce markdown input
  const debouncedMarkdown = useDebouncedValue(markdown, 300);

  // Extract headings and content
  const headingsAndContent = extractHeadingsAndContent(debouncedMarkdown);

  // Auto-resize textarea when markdown changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      // Set a max height (e.g., 20rem = 320px)
      const maxHeight = 320;
      const newHeight = Math.min(textareaRef.current.scrollHeight, maxHeight);
      textareaRef.current.style.height = newHeight + 'px';
      textareaRef.current.scrollTop = 0; // Always show the top
    }
  }, [markdown]);

  function handleGenerateAI(idx: number) {
    setGeneratingIdx(idx);
    const { heading, content } = headingsAndContent[idx];
    // Use template-based generator as fallback/default
    const diagram = generateSmartTemplate({
      title: heading,
      description: content,
      type: 'flowchart',
    });
    setAnimations(prev => ({ ...prev, [idx]: diagram.mermaidCode }));
    // For summary, just use the first 1-2 sentences of content as a simple summary
    const summary = content.split('. ').slice(0, 2).join('. ') + (content.includes('.') ? '.' : '');
    setSummaries(prev => ({ ...prev, [idx]: summary }));
    setGeneratingIdx(null);
  }

  async function handleExportPDF() {
    if (!previewRef.current) {
      setExportError('Preview content not found');
      return;
    }

    if (headingsAndContent.length === 0) {
      setExportError('No content to export. Please add some markdown content first.');
      return;
    }

    setExporting(true);
    setExportError(null);
    setExportSuccess(false);

    try {
      // Wait for any pending animations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      const timestamp = getCurrentDateTime();
      const filename = `markdown-export-${timestamp}.pdf`;
      
      await exportToPDF(previewRef.current, {
        filename,
        title: 'Markdown & Diagram Export',
        author: 'AI Markdown Generator',
        subject: 'Generated content with diagrams'
      });
      
      setExportSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
      setExportError(error instanceof Error ? error.message : 'Failed to export PDF');
    } finally {
      setExporting(false);
    }
  }

  const sampleMarkdown = `# AI's Competitive Landscape: A Game Theory Perspective

Major tech companies — OpenAI, Google DeepMind, Meta, Microsoft, Anthropic, and others — are engaged in a high-stakes "game" to develop advanced AI. We can analyze this landscape through game theory, which helps explain their competitive and cooperative moves.

## Competition vs. Cooperation in the AI Industry

1. Racing to build the best models
2. Open-sourcing vs. keeping secrets
3. Forming alliances or partnerships
4. Competing for top talent
5. Balancing safety and speed

- OpenAI (GPT-3.5, GPT-4)
- Claude (Anthropic)
- Replicate / Stability for image generation
- Custom REST APIs

**Bold text** and _italic text_ are supported!`;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-8 py-10">
      {/* Modern animated intro message */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.025, boxShadow: '0 8px 32px rgba(56,189,248,0.10)' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="w-full max-w-xl mx-auto mb-4 p-4 md:p-5 bg-gradient-to-br from-blue-100 via-white to-cyan-100 border border-blue-200 rounded-xl shadow-lg flex flex-col items-start gap-2 hover:shadow-xl transition-all"
        style={{ zIndex: 1 }}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <span className="text-2xl md:text-3xl">✨</span>
          <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-blue-900">AI Markdown & Diagram Generator</h1>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="text-blue-900/80 text-sm md:text-base mt-1"
        >
          Paste your markdown content with headings and lists below. For each section, you can generate a visual flowchart using the <b>✨ Generate AI Image</b> button.<br />
          <span className="inline-block mt-1">This app turns structured notes, workflows, or processes into beautiful, interactive Mermaid diagrams—perfect for docs, presentations, or brainstorming!</span><br />
          <span className="inline-block mt-1 text-cyan-700 font-semibold">Tip: Use numbered or bulleted lists under your headings for the best diagrams.</span>
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mt-2 w-full"
        >
          <div className="text-blue-800 font-semibold mb-1">What is markdown content?</div>
          <div className="text-blue-900/70 text-xs md:text-sm leading-relaxed">
            Markdown is a simple way to format text using special characters. You can create <b>headings</b>, <i>lists</i>, <b>bold</b> or <i>italic</i> text, and more.<br />
            <span className="block mt-1 text-cyan-700/80">Example:</span>
            <pre className="bg-blue-50 border border-blue-200 rounded-lg p-2 mt-1 text-xs md:text-xs text-blue-900 overflow-x-auto font-mono">
{`# My Heading

1. First step
2. Second step

- Bullet point
- Another bullet

**Bold text** and _italic text_`}
            </pre>
          </div>
        </motion.div>
      </motion.div>
      {/* Collapsible Markdown Input */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-md">
        <div className="flex items-center justify-between px-6 py-4">
          <span className="text-xl font-bold text-gray-800">📝 Paste your content here.</span>
          <div className="flex gap-2">
            <button
              className="px-4 py-1 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700 transition-colors text-sm"
              onClick={() => setMarkdown(sampleMarkdown)}
            >
              Sample Markdown
            </button>
            <button
              className={`px-4 py-1 rounded-lg font-semibold shadow transition-colors text-sm flex items-center gap-1 ${
                headingsAndContent.length > 0 && !exporting
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }`}
              onClick={handleExportPDF}
              disabled={headingsAndContent.length === 0 || exporting}
            >
              <Download size={14} />
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          </div>
        </div>
        {inputOpen && (
          <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl transition-all duration-300">
            <textarea
              ref={textareaRef}
              className="w-full h-28 min-h-[80px] max-h-80 border border-blue-200 rounded-xl p-3 font-mono text-base resize-none shadow focus:ring-2 focus:ring-blue-200 focus:outline-none bg-white text-black transition-all duration-200"
              style={{ color: '#000' }}
              placeholder="Input your content over here!"
              value={markdown}
              onChange={e => setMarkdown(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Export Error Display */}
      {exportError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4"
        >
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-lg">⚠️</span>
            <span className="font-semibold">Export Error:</span>
            <span>{exportError}</span>
          </div>
          <button
            onClick={() => setExportError(null)}
            className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* Export Success Display */}
      {exportSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4"
        >
          <div className="flex items-center gap-2 text-green-800">
            <span className="text-lg">✅</span>
            <span className="font-semibold">PDF Export Successful!</span>
            <span>Your document has been downloaded.</span>
          </div>
        </motion.div>
      )}

      {/* Preview below input */}
      <div ref={previewRef} className="w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200 text-gray-900">
        <div className="mb-8">
          <h2 className="text-5xl font-extrabold text-gray-900 mb-2 tracking-tight leading-tight">Preview</h2>
          <div className="h-1 w-16 bg-blue-500 rounded-full mb-6" />
        </div>
        {headingsAndContent.length > 0 ? (
          <div>
            {headingsAndContent.map((item, idx) => (
              <div key={idx} className="mb-10">
                <div className={`text-${item.level === 1 ? '5xl' : item.level === 2 ? '4xl' : '3xl'} font-extrabold tracking-tight text-gray-900 mb-4 drop-shadow-sm`}>{item.heading}</div>
                <AnimationCanvas
                  code={animations[idx] || ""}
                  onClick={() => setEditingIndex(idx)}
                  idx={idx}
                  onGenerateAI={() => handleGenerateAI(idx)}
                  generating={generatingIdx === idx}
                />
                {summaries[idx] && (
                  <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-200">
                    <strong>Summary:</strong> {summaries[idx]}
                  </div>
                )}
                <div className="mt-2 text-gray-700 whitespace-pre-line">{item.content}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-center mt-20">
            <p className="text-lg mb-4">Live preview will appear here...</p>
            <p className="text-sm">Try adding some headings to see diagrams!</p>
          </div>
        )}
      </div>
      {editingIndex !== null && (
        <AnimationEditor
          code={animations[editingIndex] || ""}
          onSave={code => {
            setAnimations({ ...animations, [editingIndex]: code });
            setEditingIndex(null);
          }}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </div>
  );
} 