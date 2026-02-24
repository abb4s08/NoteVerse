"use client";

import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative z-20 border-t border-white/5 px-4 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-gold" />
          <span className="font-[var(--font-outfit)] text-lg font-bold text-white">
            Note<span className="text-accent-blue">Verse</span>
          </span>
        </div>
        <p className="text-sm text-white/30">
          &copy; {new Date().getFullYear()} NoteVerse. Where Learning Takes
          Flight.
        </p>
      </div>
    </footer>
  );
}
