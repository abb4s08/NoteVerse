"use client";

import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-4 pt-4"
    >
      <div className="glass mx-auto flex max-w-6xl items-center justify-between rounded-2xl px-6 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative -my-2"
          >
            <img src="/logo.png" alt="NoteVerse" className="h-20 object-contain brightness-125 drop-shadow-[0_0_15px_rgba(100,150,255,0.5)]" />
          </motion.div>
        </Link>

        {/* Center Links */}
        <div className="hidden items-center gap-8 md:flex">
          {["Features", "How It Works", "AI Lab"].map((item) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
              className="text-sm font-medium text-white/60 transition-colors hover:text-white"
              whileHover={{ y: -1 }}
            >
              {item}
            </motion.a>
          ))}
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link href="/auth">
            <motion.button
              className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-accent-blue px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-blue/25"
              whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(0, 123, 255, 0.4)" }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Animated shimmer */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-200%", "200%"] }}
                transition={{
                  repeat: Infinity,
                  repeatDelay: 3,
                  duration: 1.5,
                  ease: "easeInOut",
                }}
              />
              <Rocket className="relative z-10 h-4 w-4" />
              <span className="relative z-10">Get Started</span>
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
}
