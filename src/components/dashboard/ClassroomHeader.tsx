"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check } from "lucide-react";

interface ClassroomHeaderProps {
  className: string;
  subject?: string;
  classCode?: string;
  /** Optional banner URL — falls back to a generated gradient if missing */
  bannerUrl?: string;
}

/**
 * Premium Classroom Banner & Header
 *
 * - Wide rounded banner image (h-[200px]) with dark gradient overlay
 * - Class name in bold Outfit text, bottom-left
 * - Glassmorphism join-code badge with one-click copy + "Copied!" toast
 */
export default function ClassroomHeader({
  className: classTitle,
  subject,
  classCode,
  bannerUrl,
}: ClassroomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!classCode) return;
    try {
      await navigator.clipboard.writeText(classCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select + copy
      const el = document.createElement("textarea");
      el.value = classCode;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Deterministic gradient seed from class title
  const seed = classTitle
    .split("")
    .reduce((a, c) => a + c.charCodeAt(0), 0);
  const hue1 = seed % 360;
  const hue2 = (seed * 7) % 360;
  const fallbackGradient = `linear-gradient(135deg, hsl(${hue1} 60% 25%) 0%, hsl(${hue2} 50% 15%) 100%)`;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative mb-6 h-[200px] w-full overflow-hidden rounded-2xl"
    >
      {/* Banner image or gradient */}
      {bannerUrl ? (
        <img
          src={bannerUrl}
          alt={`${classTitle} banner`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ background: fallbackGradient }}
        />
      )}

      {/* Subtle noise texture */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%270 0 256 256%27 xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.9%27 numOctaves=%274%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
        }}
      />

      {/* Dark gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#12141D] via-[#12141D]/60 to-transparent" />

      {/* Inner glow accents */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-60 w-60 rounded-full bg-accent-blue/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-accent-gold/8 blur-2xl" />

      {/* Content overlay — bottom section */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between px-6 pb-5">
        {/* Left — name & subject */}
        <div className="min-w-0 flex-1">
          <h1 className="font-[var(--font-outfit)] text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl">
            {classTitle}
          </h1>
          {subject && (
            <p className="mt-1 text-sm font-medium text-white/50">{subject}</p>
          )}
        </div>

        {/* Right — join code badge */}
        {classCode && (
          <motion.button
            onClick={handleCopy}
            whileTap={{ scale: 0.95 }}
            className="relative ml-4 flex shrink-0 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-md transition-colors hover:bg-white/15"
          >
            <span className="text-xs font-semibold tracking-wider text-white/70 uppercase">
              Class&nbsp;Code
            </span>
            <span className="font-mono text-sm font-bold text-white">
              {classCode}
            </span>

            <AnimatePresence mode="wait">
              {copied ? (
                <motion.span
                  key="check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Check className="h-4 w-4 text-green-400" />
                </motion.span>
              ) : (
                <motion.span
                  key="copy"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  <Copy className="h-4 w-4 text-white/50" />
                </motion.span>
              )}
            </AnimatePresence>

            {/* "Copied!" floating toast */}
            <AnimatePresence>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: -8 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-green-500/90 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg"
                >
                  Copied!
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
