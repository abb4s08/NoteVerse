"use client";

import { motion } from "framer-motion";

/**
 * Cosmic Aurora Background for the Authentication screen.
 * 3 massive irregularly-shaped blobs with vibrant gradients,
 * heavy blur, mix-blend-screen, infinite liquid aurora animation.
 */

const blobs = [
  {
    // Deep Indigo → Electric Blue — massive primary blob
    style: {
      background:
        "radial-gradient(ellipse at 30% 40%, #1A2B4D 0%, #007BFF 60%, transparent 100%)",
      width: "130vw",
      height: "90vh",
      borderRadius: "40% 60% 55% 45% / 55% 35% 65% 45%",
    },
    initial: { x: "-20%", y: "-30%", scale: 1, rotate: 0, opacity: 0.8 },
    animate: {
      x: ["-20%", "10%", "-15%", "5%", "-20%"],
      y: ["-30%", "-10%", "-25%", "-5%", "-30%"],
      scale: [1, 1.15, 0.95, 1.1, 1],
      rotate: [0, 25, -15, 35, 0],
    },
    duration: 24,
  },
  {
    // Electric Blue → Soft Gold — secondary accent
    style: {
      background:
        "radial-gradient(ellipse at 70% 60%, #007BFF 0%, #FFD700 50%, transparent 100%)",
      width: "100vw",
      height: "80vh",
      borderRadius: "55% 45% 40% 60% / 35% 65% 35% 65%",
    },
    initial: { x: "30%", y: "10%", scale: 1, rotate: 0, opacity: 0.5 },
    animate: {
      x: ["30%", "5%", "40%", "15%", "30%"],
      y: ["10%", "30%", "-5%", "20%", "10%"],
      scale: [1, 1.2, 0.85, 1.1, 1],
      rotate: [0, -40, 20, -60, 0],
    },
    duration: 30,
  },
  {
    // Soft Gold → Indigo — warm undercurrent
    style: {
      background:
        "radial-gradient(ellipse at 50% 80%, #FFD700 0%, #1A2B4D 60%, transparent 100%)",
      width: "110vw",
      height: "70vh",
      borderRadius: "45% 55% 50% 50% / 60% 40% 55% 45%",
    },
    initial: { x: "-10%", y: "40%", scale: 1, rotate: 0, opacity: 0.4 },
    animate: {
      x: ["-10%", "20%", "-5%", "25%", "-10%"],
      y: ["40%", "15%", "50%", "25%", "40%"],
      scale: [1, 0.9, 1.2, 0.95, 1],
      rotate: [0, 50, -30, 70, 0],
    },
    duration: 28,
  },
];

export default function AuthBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1, background: "#0a0e1a" }}
      aria-hidden="true"
    >
      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            ...blob.style,
            filter: "blur(150px)",
            mixBlendMode: "screen",
            willChange: "transform",
          }}
          initial={blob.initial}
          animate={blob.animate}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Extra shimmer layer for depth */}
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0, 123, 255, 0.06), transparent)",
        }}
        animate={{ opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
