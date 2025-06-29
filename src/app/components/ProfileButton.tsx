"use client";
import { useState } from "react";
import { useAuth } from "../../lib/hooks/useAuth";

export default function ProfileButton() {
  const { user } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        className="fixed top-4 right-6 z-50 px-5 py-2 bg-black text-white rounded-full font-semibold shadow hover:bg-gray-900 transition-colors"
        onClick={() => setShowProfile(true)}
      >
        Profile
      </button>
      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 text-2xl"
              onClick={() => setShowProfile(false)}
            >
              ×
            </button>
            <h2 className="text-2xl font-bold mb-4">Your Reports</h2>
            <div className="text-gray-500">(Reports list will appear here...)</div>
          </div>
        </div>
      )}
    </>
  );
} 