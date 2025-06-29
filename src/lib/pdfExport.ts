import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export interface PDFExportOptions {
  filename?: string;
  title?: string;
  author?: string;
  subject?: string;
}

export async function exportToPDF(
  element: HTMLElement,
  options: PDFExportOptions = {}
): Promise<void> {
  try {
    // Show loading state
    const loadingElement = document.createElement('div');
    loadingElement.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        color: white;
        font-family: Arial, sans-serif;
      ">
        <div style="
          background: white;
          color: black;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        ">
          <div style="margin-bottom: 10px;">🔄</div>
          <div>Generating PDF...</div>
          <div style="font-size: 12px; margin-top: 5px;">This may take a few seconds</div>
        </div>
      </div>
    `;
    document.body.appendChild(loadingElement);

    // Wait a bit for any animations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Capture the element as canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    // Remove loading element
    document.body.removeChild(loadingElement);

    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Add metadata
    if (options.title) pdf.setProperties({ title: options.title });
    if (options.author) pdf.setProperties({ author: options.author });
    if (options.subject) pdf.setProperties({ subject: options.subject });

    let position = 0;

    // Add pages as needed
    while (heightLeft >= pageHeight) {
      pdf.addImage(
        canvas,
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight,
        '',
        'FAST'
      );
      heightLeft -= pageHeight;
      if (heightLeft >= pageHeight) {
        pdf.addPage();
      }
      position -= pageHeight;
    }

    // Add remaining content
    if (heightLeft > 0) {
      pdf.addImage(
        canvas,
        'PNG',
        0,
        position,
        imgWidth,
        imgHeight,
        '',
        'FAST'
      );
    }

    // Save the PDF
    const filename = options.filename || `export-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF:', error);
    // Remove loading element if it exists
    const loadingElement = document.querySelector('div[style*="position: fixed"]');
    if (loadingElement) {
      document.body.removeChild(loadingElement);
    }
    throw new Error('Failed to generate PDF. Please try again.');
  }
}

export function getCurrentDateTime(): string {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).replace(/[/:]/g, '-').replace(',', '');
} 