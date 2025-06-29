"use client";
import React from "react";
import { useAuth } from "../lib/hooks/useAuth";
import SignInWithGoogle from "../components/SignInWithGoogle";
import MarkdownWithAnimations from "./components/MarkdownWithAnimations";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <SignInWithGoogle />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <MarkdownWithAnimations />
    </main>
  );
}
