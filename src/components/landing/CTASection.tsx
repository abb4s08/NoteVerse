"use client";

import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import Link from "next/link";

export default function CTASection() {
  return (
    <section id="ai-lab" className="relative z-20 px-4 py-32">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="glass-strong relative overflow-hidden rounded-3xl p-12 text-center sm:p-16"
        >
          {/* Background glow orbs */}
          <div className="pointer-events-none absolute -top-20 -left-20 h-60 w-60 rounded-full bg-accent-blue/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-60 w-60 rounded-full bg-accent-gold/10 blur-3xl" />

          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/20"
          >
            <Rocket className="h-8 w-8 text-accent-blue" />
          </motion.div>

          <h2 className="font-[var(--font-outfit)] mb-4 text-3xl font-bold text-white sm:text-4xl">
            Ready to Transform Your{" "}
            <span className="bg-gradient-to-r from-accent-blue to-accent-gold bg-clip-text text-transparent">
              Classroom?
            </span>
          </h2>

          <p className="mx-auto mb-8 max-w-xl text-lg text-white/50">
            Join NoteVerse today. AI-powered learning, real-time collaboration,
            and a premium experience — completely free for students and teachers.
          </p>

          <Link href="/auth">
            <motion.button
              className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-accent-blue to-blue-600 px-10 py-4 text-base font-bold text-white shadow-2xl shadow-accent-blue/30"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 0 50px rgba(0, 123, 255, 0.4)",
              }}
              whileTap={{ scale: 0.97 }}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-200%", "200%"] }}
                transition={{
                  repeat: Infinity,
                  repeatDelay: 2.5,
                  duration: 1.2,
                  ease: "easeInOut",
                }}
              />
              <Rocket className="relative z-10 h-5 w-5" />
              <span className="relative z-10">Get Started Free</span>
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
