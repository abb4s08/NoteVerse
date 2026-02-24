"use client";

import { motion } from "framer-motion";

const orbs = [
  {
    // Deep Indigo — massive base orb, slow drift
    className: "h-[800px] w-[800px] bg-[#1A2B4D]",
    initial: { x: "-10%", y: "-20%", scale: 1, rotate: 0 },
    animate: {
      x: ["- 10%", "15%", "-5%", "-10%"],
      y: ["-20%", "10%", "-15%", "-20%"],
      scale: [1, 1.15, 0.95, 1],
      rotate: [0, 60, -30, 0],
    },
    duration: 28,
    blur: "blur-[150px]",
    opacity: 0.7,
  },
  {
    // Electric Blue — hero accent, medium drift
    className: "h-[700px] w-[700px] bg-[#007BFF]",
    initial: { x: "60%", y: "-30%", scale: 1, rotate: 0 },
    animate: {
      x: ["60%", "30%", "70%", "60%"],
      y: ["-30%", "20%", "-10%", "-30%"],
      scale: [1, 1.2, 0.9, 1],
      rotate: [0, -90, 45, 0],
    },
    duration: 32,
    blur: "blur-[140px]",
    opacity: 0.45,
  },
  {
    // Indigo-Blue blend — depth layer
    className: "h-[650px] w-[650px] bg-[#122347]",
    initial: { x: "20%", y: "50%", scale: 1, rotate: 0 },
    animate: {
      x: ["20%", "50%", "10%", "20%"],
      y: ["50%", "20%", "60%", "50%"],
      scale: [1, 0.85, 1.1, 1],
      rotate: [0, 120, -60, 0],
    },
    duration: 36,
    blur: "blur-[130px]",
    opacity: 0.55,
  },
  {
    // Soft Gold — subtle warm highlight
    className: "h-[500px] w-[500px] bg-[#FFD700]",
    initial: { x: "70%", y: "60%", scale: 1, rotate: 0 },
    animate: {
      x: ["70%", "40%", "80%", "70%"],
      y: ["60%", "30%", "70%", "60%"],
      scale: [1, 1.25, 0.8, 1],
      rotate: [0, -45, 90, 0],
    },
    duration: 30,
    blur: "blur-[160px]",
    opacity: 0.12,
  },
];

export default function AnimatedBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -10 }}
      aria-hidden="true"
    >
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${orb.className} ${orb.blur}`}
          style={{ opacity: orb.opacity }}
          initial={orb.initial}
          animate={orb.animate}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            repeatType: "loop",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
