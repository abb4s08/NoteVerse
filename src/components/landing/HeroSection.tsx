"use client";

import { motion } from "framer-motion";
import { Rocket, ChevronDown } from "lucide-react";
import Link from "next/link";

export default function HeroSection() {
  return (
    <div className="relative z-20 flex min-h-screen flex-col items-center justify-center px-4 text-center">
      {/* Overline badge */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.8 }}
        className="glass mb-8 inline-flex items-center gap-2 rounded-full px-5 py-2"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-gold opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-gold" />
        </span>
        <span className="text-sm font-medium text-white/80">
          AI-Powered Collaborative Learning
        </span>
      </motion.div>

      {/* Main headline */}
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="font-[var(--font-outfit)] mb-6 max-w-4xl text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
      >
        Where Learning{" "}
        <span className="relative inline-block">
          <span className="relative z-10 bg-gradient-to-r from-accent-blue via-blue-400 to-accent-gold bg-clip-text text-transparent">
            Takes Flight
          </span>
          {/* Underline glow */}
          <motion.span
            className="absolute -bottom-2 left-0 h-1 rounded-full bg-gradient-to-r from-accent-blue to-accent-gold"
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ delay: 1.2, duration: 0.8, ease: "easeOut" }}
          />
        </span>
      </motion.h1>

      {/* Sub-headline */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.8 }}
        className="mb-10 max-w-2xl text-lg leading-relaxed text-white/50 sm:text-xl"
      >
        NoteVerse is your cinematic classroom — AI-generated quizzes,
        real-time collaboration, smart note vaults, and a learning experience
        that feels like the future.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9, duration: 0.8 }}
        className="flex flex-col items-center gap-4 sm:flex-row"
      >
        <Link href="/auth">
          <motion.button
            className="group relative flex items-center gap-2.5 overflow-hidden rounded-2xl bg-accent-blue px-8 py-4 text-base font-bold text-white shadow-xl shadow-accent-blue/30"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 0 40px rgba(0, 123, 255, 0.5)",
            }}
            whileTap={{ scale: 0.97 }}
          >
            {/* Shimmer effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-200%", "200%"] }}
              transition={{
                repeat: Infinity,
                repeatDelay: 2,
                duration: 1.2,
                ease: "easeInOut",
              }}
            />
            <Rocket className="relative z-10 h-5 w-5" />
            <span className="relative z-10">Launch Your Classroom</span>
          </motion.button>
        </Link>

        <motion.a
          href="#features"
          className="glass flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-medium text-white/70 transition-colors hover:text-white"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          Explore Features
        </motion.a>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 1 }}
        className="absolute bottom-10 flex flex-col items-center gap-2"
      >
        <span className="text-xs font-medium tracking-widest text-white/30 uppercase">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="h-5 w-5 text-white/30" />
        </motion.div>
      </motion.div>
    </div>
  );
}
