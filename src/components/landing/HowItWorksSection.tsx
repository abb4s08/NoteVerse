"use client";

import { motion } from "framer-motion";
import { Upload, Brain, Sparkles } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: <Upload className="h-8 w-8" />,
    title: "Upload Your Notes",
    description:
      "Drop PDFs, text files, or type directly. Your content is securely stored in the cloud.",
    color: "text-accent-blue",
    borderColor: "border-accent-blue/30",
  },
  {
    step: "02",
    icon: <Brain className="h-8 w-8" />,
    title: "AI Does the Heavy Lifting",
    description:
      "Gemini AI reads, understands, and summarizes your notes. Ask follow-up questions in real-time.",
    color: "text-accent-gold",
    borderColor: "border-accent-gold/30",
  },
  {
    step: "03",
    icon: <Sparkles className="h-8 w-8" />,
    title: "Learn, Quiz, Collaborate",
    description:
      "Take AI-generated quizzes, discuss with classmates, and track your progress — all in NoteVerse.",
    color: "text-emerald-400",
    borderColor: "border-emerald-400/30",
  },
];

export default function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative z-20 px-4 py-32"
    >
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-accent-gold/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-accent-gold uppercase">
            How It Works
          </span>
          <h2 className="font-[var(--font-outfit)] mb-4 text-4xl font-bold text-white sm:text-5xl">
            Three Steps to{" "}
            <span className="bg-gradient-to-r from-accent-gold to-accent-blue bg-clip-text text-transparent">
              Smarter Learning
            </span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="relative space-y-8 md:space-y-0 md:grid md:grid-cols-3 md:gap-8">
          {/* Connecting line (desktop) */}
          <div className="absolute top-16 left-[16.67%] right-[16.67%] hidden h-px bg-gradient-to-r from-accent-blue/30 via-accent-gold/30 to-emerald-400/30 md:block" />

          {steps.map((step, index) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                delay: index * 0.2,
                duration: 0.7,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="relative flex flex-col items-center text-center"
            >
              {/* Step number circle */}
              <motion.div
                className={`glass mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border ${step.borderColor}`}
                whileHover={{ scale: 1.1, rotate: 5 }}
              >
                <div className={step.color}>{step.icon}</div>
              </motion.div>

              {/* Step label */}
              <span
                className={`mb-2 text-xs font-bold tracking-widest ${step.color} uppercase`}
              >
                Step {step.step}
              </span>

              <h3 className="font-[var(--font-outfit)] mb-3 text-xl font-bold text-white">
                {step.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-white/50">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
