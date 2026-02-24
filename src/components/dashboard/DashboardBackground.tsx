"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform, MotionValue } from "framer-motion";

/**
 * Volumetric Parallax Dashboard Background.
 *
 * - Base: solid Dark Grey (#12141D)
 * - 5 abstract floating elements at varying "depths"
 * - Mouse parallax: elements shift opposite to cursor, speed varies by depth
 */

interface ElementConfig {
  /** CSS for the shape */
  style: React.CSSProperties;
  /** Parallax strength — higher = closer to viewer, moves more */
  depth: number;
  /** Starting position (%) */
  x: string;
  y: string;
}

const elements: ElementConfig[] = [
  {
    // Large Electric Blue orb — deep layer
    style: {
      width: 420,
      height: 420,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(0,123,255,0.18) 0%, transparent 70%)",
      filter: "blur(80px)",
    },
    depth: 0.015,
    x: "12%",
    y: "18%",
  },
  {
    // Hollow white ring — mid layer
    style: {
      width: 280,
      height: 280,
      borderRadius: "50%",
      background: "transparent",
      border: "1.5px solid rgba(255,255,255,0.06)",
      boxShadow: "0 0 60px rgba(255,255,255,0.03)",
    },
    depth: 0.025,
    x: "72%",
    y: "22%",
  },
  {
    // Small Electric Blue orb — closer layer
    style: {
      width: 200,
      height: 200,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(0,123,255,0.12) 0%, transparent 70%)",
      filter: "blur(50px)",
    },
    depth: 0.035,
    x: "65%",
    y: "65%",
  },
  {
    // Large hollow ring — deep layer
    style: {
      width: 500,
      height: 500,
      borderRadius: "50%",
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.04)",
      boxShadow: "inset 0 0 80px rgba(0,123,255,0.03)",
    },
    depth: 0.012,
    x: "35%",
    y: "55%",
  },
  {
    // Soft Gold accent orb — closest layer
    style: {
      width: 160,
      height: 160,
      borderRadius: "50%",
      background: "radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)",
      filter: "blur(60px)",
    },
    depth: 0.04,
    x: "20%",
    y: "72%",
  },
];

/** Individual element component — lets us safely call hooks per element */
function ParallaxElement({
  config,
  smoothX,
  smoothY,
}: {
  config: ElementConfig;
  smoothX: MotionValue<number>;
  smoothY: MotionValue<number>;
}) {
  const tx = useTransform(smoothX, (v: number) => v * -config.depth * (typeof window !== "undefined" ? window.innerWidth : 1400));
  const ty = useTransform(smoothY, (v: number) => v * -config.depth * (typeof window !== "undefined" ? window.innerHeight : 900));

  return (
    <motion.div
      className="absolute"
      style={{
        ...config.style,
        left: config.x,
        top: config.y,
        translateX: tx,
        translateY: ty,
        willChange: "transform",
      }}
    />
  );
}

export default function DashboardBackground() {
  // Raw mouse position on window (px)
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  // Smooth spring for buttery movement
  const smoothX = useSpring(rawX, { stiffness: 40, damping: 25 });
  const smoothY = useSpring(rawY, { stiffness: 40, damping: 25 });

  useEffect(() => {
    const handleMouse = (e: MouseEvent) => {
      // Normalize to center of viewport: -0.5 ... +0.5
      rawX.set(e.clientX / window.innerWidth - 0.5);
      rawY.set(e.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, [rawX, rawY]);

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -10, background: "#12141D" }}
      aria-hidden="true"
    >
      {/* Subtle radial ambient light */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(0,123,255,0.04), transparent)",
        }}
      />

      {elements.map((el, i) => (
        <ParallaxElement key={i} config={el} smoothX={smoothX} smoothY={smoothY} />
      ))}
    </div>
  );
}
