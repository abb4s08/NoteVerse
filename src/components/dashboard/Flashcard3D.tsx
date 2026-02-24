"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { cn } from "@/lib/utils";

interface Flashcard3DProps {
  front: string;
  back: string;
  flipped: boolean;
  onFlip: () => void;
}

/**
 * Premium 3D Interactive Flashcard.
 *
 * - Real rotateY 0↔180 flip with backface-visibility: hidden
 * - perspective: 1000px container, preserve-3d card
 * - Custom spring transition (stiffness 260, damping 20)
 * - Mouse-tracking tilt + scale 1.02 hover invite
 * - Animated glare layer that catches light during flip
 * - Glassmorphism front/back faces
 */
export default function Flashcard3D({
  front,
  back,
  flipped,
  onFlip,
}: Flashcard3DProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // ── Mouse tilt tracking ───────────────────────────────────────────────
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);

  const tiltX = useSpring(useTransform(mouseY, [0, 1], [8, -8]), {
    stiffness: 200,
    damping: 20,
  });
  const tiltY = useSpring(useTransform(mouseX, [0, 1], [-8, 8]), {
    stiffness: 200,
    damping: 20,
  });

  // Glare follows cursor across both faces
  const glareX = useTransform(mouseX, [0, 1], ["0%", "100%"]);
  const glareY = useTransform(mouseY, [0, 1], ["0%", "100%"]);
  const glareBackground = useTransform(
    [glareX, glareY],
    ([x, y]: string[]) =>
      `radial-gradient(500px circle at ${x} ${y}, rgba(255,255,255,0.12), transparent 60%)`
  );

  const [hovering, setHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width);
    mouseY.set((e.clientY - rect.top) / rect.height);
  };

  const handleMouseLeave = () => {
    mouseX.set(0.5);
    mouseY.set(0.5);
    setHovering(false);
  };

  // ── Spring config for the flip ────────────────────────────────────────
  const flipSpring = {
    type: "spring" as const,
    stiffness: 260,
    damping: 20,
  };

  // ── Shared face styles ────────────────────────────────────────────────
  const faceBase =
    "absolute inset-0 flex flex-col items-center justify-center rounded-3xl p-8 text-center";
  const glassStyle =
    "bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] shadow-[0_8px_32px_rgba(0,0,0,0.3)]";

  return (
    <div
      style={{ perspective: 1000 }}
      className="mx-auto w-full max-w-xl"
    >
      <motion.div
        ref={cardRef}
        onClick={onFlip}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={handleMouseLeave}
        className="relative cursor-pointer"
        style={{
          transformStyle: "preserve-3d",
          rotateX: hovering ? tiltX : 0,
          rotateY: flipped ? 180 : 0,
          minHeight: 300,
        }}
        animate={{
          rotateY: flipped ? 180 : 0,
          scale: hovering ? 1.02 : 1,
        }}
        transition={flipSpring}
      >
        {/* ── Front face ─────────────────────────────────────────────── */}
        <div
          className={cn(faceBase, glassStyle)}
          style={{ backfaceVisibility: "hidden" }}
        >
          {/* Glare layer — front */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{ background: glareBackground, opacity: hovering ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Edge highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/[0.06]" />

          <span className="mb-5 rounded-full bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Question — tap to flip
          </span>
          <p className="relative z-10 text-lg leading-relaxed text-white">
            {front}
          </p>

          {/* Subtle bottom accent line */}
          <div className="absolute bottom-0 left-1/2 h-[1px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent-blue/20 to-transparent" />
        </div>

        {/* ── Back face ──────────────────────────────────────────────── */}
        <div
          className={cn(faceBase, glassStyle)}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          {/* Glare layer — back */}
          <motion.div
            className="pointer-events-none absolute inset-0 rounded-3xl"
            style={{ background: glareBackground, opacity: hovering ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Edge highlight */}
          <div className="pointer-events-none absolute inset-0 rounded-3xl border border-accent-gold/[0.08]" />

          <span className="mb-5 rounded-full bg-accent-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-accent-gold/60">
            Answer — tap to flip
          </span>
          <p className="relative z-10 text-lg leading-relaxed text-accent-gold">
            {back}
          </p>

          {/* Subtle bottom accent line */}
          <div className="absolute bottom-0 left-1/2 h-[1px] w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent" />
        </div>

        {/* ── Flip glare burst — animated accent during rotation ──────── */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            transformStyle: "preserve-3d",
            background:
              "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)",
          }}
          animate={{
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 0.4,
            ease: "easeOut",
          }}
          key={flipped ? "flip-b" : "flip-f"}
        />
      </motion.div>
    </div>
  );
}
