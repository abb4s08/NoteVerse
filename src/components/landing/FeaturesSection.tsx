"use client";

import { motion } from "framer-motion";
import {
  Brain,
  Users,
  BookOpen,
  Zap,
  Shield,
  MessageSquare,
} from "lucide-react";

const features = [
  {
    icon: <Brain className="h-7 w-7" />,
    title: "AI Chat & Summaries",
    description:
      "Ask questions, upload PDFs or text — Gemini AI delivers instant, intelligent summaries.",
    color: "text-blue-400",
    glow: "group-hover:shadow-blue-500/20",
  },
  {
    icon: <Zap className="h-7 w-7" />,
    title: "Quiz Architect",
    description:
      "Teachers auto-generate multiple-choice quizzes from any notes, pushed live to students.",
    color: "text-amber-400",
    glow: "group-hover:shadow-amber-500/20",
  },
  {
    icon: <Users className="h-7 w-7" />,
    title: "Classroom Hub",
    description:
      "Create or join classrooms, see members, and collaborate seamlessly in one unified space.",
    color: "text-emerald-400",
    glow: "group-hover:shadow-emerald-500/20",
  },
  {
    icon: <MessageSquare className="h-7 w-7" />,
    title: "Real-Time Chat",
    description:
      "Live discussion channels powered by Firestore — every message syncs instantly.",
    color: "text-purple-400",
    glow: "group-hover:shadow-purple-500/20",
  },
  {
    icon: <BookOpen className="h-7 w-7" />,
    title: "Smart Note Vault",
    description:
      "Upload, organize, and access study materials from Firebase Storage — anywhere, anytime.",
    color: "text-rose-400",
    glow: "group-hover:shadow-rose-500/20",
  },
  {
    icon: <Shield className="h-7 w-7" />,
    title: "Role-Based Access",
    description:
      "Student and teacher dashboards with tailored permissions and admin-lite controls.",
    color: "text-cyan-400",
    glow: "group-hover:shadow-cyan-500/20",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
    },
  },
};

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative z-20 px-4 py-32"
    >
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-accent-blue/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-accent-blue uppercase">
            Features
          </span>
          <h2 className="font-[var(--font-outfit)] mb-4 text-4xl font-bold text-white sm:text-5xl">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-accent-blue to-accent-gold bg-clip-text text-transparent">
              Learn Smarter
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-white/50">
            A complete toolkit for modern classrooms — from AI-driven study aids
            to real-time collaboration.
          </p>
        </motion.div>

        {/* Feature grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              className={`glass group rounded-2xl p-8 transition-all duration-300 hover:bg-white/10 hover:shadow-2xl ${feature.glow}`}
            >
              <div className={`mb-4 ${feature.color}`}>{feature.icon}</div>
              <h3 className="font-[var(--font-outfit)] mb-2 text-lg font-bold text-white">
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed text-white/50">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
