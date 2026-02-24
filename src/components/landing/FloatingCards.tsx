"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  Brain,
  BookOpen,
  Users,
  Zap,
  GraduationCap,
} from "lucide-react";

interface FloatingCard {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  glowColor: string;
  initialX: number;
  initialY: number;
  floatDelay: number;
  floatDuration: number;
  floatRange: number;
}

const cards: FloatingCard[] = [
  {
    id: 1,
    icon: <Brain className="h-8 w-8" />,
    title: "AI-Powered Learning",
    description: "Gemini AI summarizes your notes, answers questions, and generates quizzes instantly.",
    color: "text-blue-400",
    glowColor: "rgba(59, 130, 246, 0.15)",
    initialX: -320,
    initialY: -180,
    floatDelay: 0,
    floatDuration: 7,
    floatRange: 25,
  },
  {
    id: 2,
    icon: <Users className="h-8 w-8" />,
    title: "Real-Time Collaboration",
    description: "Join classrooms, share notes, and discuss with peers in live chat channels.",
    color: "text-emerald-400",
    glowColor: "rgba(52, 211, 153, 0.15)",
    initialX: 300,
    initialY: -140,
    floatDelay: 1.2,
    floatDuration: 8,
    floatRange: 20,
  },
  {
    id: 3,
    icon: <BookOpen className="h-8 w-8" />,
    title: "Smart Note Vault",
    description: "Upload, organize, and access all your study materials from anywhere in the cloud.",
    color: "text-purple-400",
    glowColor: "rgba(168, 85, 247, 0.15)",
    initialX: -380,
    initialY: 120,
    floatDelay: 0.6,
    floatDuration: 6.5,
    floatRange: 22,
  },
  {
    id: 4,
    icon: <Zap className="h-8 w-8" />,
    title: "Quiz Architect",
    description: "Teachers auto-generate MCQ quizzes from notes. Students take them in real-time.",
    color: "text-amber-400",
    glowColor: "rgba(251, 191, 36, 0.15)",
    initialX: 340,
    initialY: 160,
    floatDelay: 1.8,
    floatDuration: 7.5,
    floatRange: 18,
  },
  {
    id: 5,
    icon: <GraduationCap className="h-8 w-8" />,
    title: "Role-Based Access",
    description: "Students and teachers get tailored dashboards with role-specific powers.",
    color: "text-rose-400",
    glowColor: "rgba(251, 113, 133, 0.15)",
    initialX: 0,
    initialY: 260,
    floatDelay: 2.4,
    floatDuration: 8.5,
    floatRange: 15,
  },
];

function FloatingCardItem({ card, mouseX, mouseY }: {
  card: FloatingCard;
  mouseX: ReturnType<typeof useMotionValue<number>>;
  mouseY: ReturnType<typeof useMotionValue<number>>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Parallax / magnetic repulsion: cards shift AWAY from the cursor
  const springConfig = { stiffness: 50, damping: 20, mass: 1.5 };

  const offsetX = useSpring(
    useTransform(mouseX, (latest) => {
      if (!cardRef.current) return 0;
      const rect = cardRef.current.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const dx = latest - cardCenterX;
      const distance = Math.sqrt(dx * dx);
      const maxRepulsion = 40;
      const effectRadius = 500;
      if (distance > effectRadius) return 0;
      const force = (1 - distance / effectRadius) * maxRepulsion;
      return dx > 0 ? -force : force;
    }),
    springConfig
  );

  const offsetY = useSpring(
    useTransform(mouseY, (latest) => {
      if (!cardRef.current) return 0;
      const rect = cardRef.current.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;
      const dy = latest - cardCenterY;
      const distance = Math.sqrt(dy * dy);
      const maxRepulsion = 30;
      const effectRadius = 500;
      if (distance > effectRadius) return 0;
      const force = (1 - distance / effectRadius) * maxRepulsion;
      return dy > 0 ? -force : force;
    }),
    springConfig
  );

  const rotateX = useSpring(
    useTransform(mouseY, (latest) => {
      if (!cardRef.current) return 0;
      const rect = cardRef.current.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;
      const dy = latest - cardCenterY;
      return -(dy / 40);
    }),
    { stiffness: 80, damping: 25 }
  );

  const rotateY = useSpring(
    useTransform(mouseX, (latest) => {
      if (!cardRef.current) return 0;
      const rect = cardRef.current.getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const dx = latest - cardCenterX;
      return dx / 40;
    }),
    { stiffness: 80, damping: 25 }
  );

  return (
    <motion.div
      ref={cardRef}
      className="absolute left-1/2 top-1/2 w-[260px] cursor-default"
      initial={{
        x: card.initialX - 130,
        y: card.initialY - 90,
        opacity: 0,
        scale: 0.6,
      }}
      animate={{
        x: card.initialX - 130,
        y: card.initialY - 90,
        opacity: 1,
        scale: 1,
      }}
      transition={{
        delay: 0.3 + card.floatDelay * 0.3,
        duration: 1,
        ease: [0.22, 1, 0.36, 1],
      }}
      style={{
        x: useTransform(offsetX, (v) => card.initialX - 130 + v),
        y: useTransform(offsetY, (v) => card.initialY - 90 + v),
        rotateX,
        rotateY,
        perspective: 1000,
      }}
    >
      {/* Floating animation wrapper */}
      <motion.div
        animate={{
          y: [-card.floatRange / 2, card.floatRange / 2, -card.floatRange / 2],
        }}
        transition={{
          duration: card.floatDuration,
          repeat: Infinity,
          ease: "easeInOut",
          delay: card.floatDelay,
        }}
      >
        <div
          className="glass-strong rounded-2xl p-6 transition-all duration-300 hover:bg-white/15"
          style={{
            boxShadow: `0 8px 32px ${card.glowColor}, 0 0 60px ${card.glowColor}`,
          }}
        >
          <div className={`mb-3 ${card.color}`}>{card.icon}</div>
          <h3 className="font-[var(--font-outfit)] mb-2 text-lg font-bold text-white">
            {card.title}
          </h3>
          <p className="text-sm leading-relaxed text-white/55">
            {card.description}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function FloatingCards() {
  const mouseX = useMotionValue(
    typeof window !== "undefined" ? window.innerWidth / 2 : 960
  );
  const mouseY = useMotionValue(
    typeof window !== "undefined" ? window.innerHeight / 2 : 540
  );

  const handleMouseMove = (e: React.MouseEvent) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  return (
    <div
      className="absolute inset-0 z-10 overflow-hidden"
      onMouseMove={handleMouseMove}
    >
      <div className="relative h-full w-full">
        {cards.map((card) => (
          <FloatingCardItem
            key={card.id}
            card={card}
            mouseX={mouseX}
            mouseY={mouseY}
          />
        ))}
      </div>
    </div>
  );
}
