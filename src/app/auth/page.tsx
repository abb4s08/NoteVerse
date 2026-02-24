"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sparkles,
  GraduationCap,
  BookOpen,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Mail,
  Lock,
  User,
  School,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import AuthBackground from "@/components/AuthBackground";
import TiltCard from "@/components/TiltCard";

type Role = "student" | "teacher";
type Mode = "signup" | "login";

export default function AuthPage() {
  const router = useRouter();
  const { user: authUser, profile: authProfile, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role>("student");
  const [mode, setMode] = useState<Mode>("signup");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [subjectExpertise, setSubjectExpertise] = useState("");

  // Always redirect to dashboard when user + profile are available
  useEffect(() => {
    if (!authLoading && authUser && authProfile) {
      router.replace("/dashboard");
    }
  }, [authLoading, authUser, authProfile, router]);

  // Show loading while AuthContext is confirming auth state after login/signup
  if (!authLoading && authUser && authProfile) {
    return (
      <div className="cosmic-bg flex min-h-screen items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
          <p className="text-sm text-white/40">Redirecting to dashboard...</p>
        </motion.div>
      </div>
    );
  }

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPassword("");
    setSchoolName("");
    setSubjectExpertise("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        // Create user in Firebase Auth
        const { user } = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Store profile in Firestore
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          fullName,
          role,
          ...(role === "student" ? { schoolName } : { subjectExpertise }),
          enrolledClasses: [],
          createdAt: new Date().toISOString(),
        });

        // Auth succeeded — keep loading=true.
        // The useEffect watching authProfile will redirect to /dashboard
        // once AuthContext finishes fetching the profile.
        // Do NOT setLoading(false) here — we want the spinner to stay.
      } else {
        // Login
        const { user } = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        // Verify user doc exists
        const docSnap = await getDoc(doc(db, "users", user.uid));
        if (!docSnap.exists()) {
          setError("Account profile not found. Please sign up first.");
          setLoading(false);
          return;
        }

        // Auth succeeded — keep loading=true.
        // The useEffect watching authProfile will redirect to /dashboard.
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      const code = firebaseError.code || "";
      switch (code) {
        case "auth/email-already-in-use":
          setError("This email is already registered. Try logging in.");
          break;
        case "auth/weak-password":
          setError("Password must be at least 6 characters.");
          break;
        case "auth/invalid-email":
          setError("Please enter a valid email address.");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setError("Invalid email or password.");
          break;
        default:
          setError(firebaseError.message || "An error occurred. Please try again.");
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12" style={{ background: '#0a0e1a' }}>
      <AuthBackground />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Back to home */}
        <Link href="/">
          <motion.div
            className="mb-6 inline-flex items-center gap-2 text-sm text-white/40 transition-colors hover:text-white/70"
            whileHover={{ x: -3 }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </motion.div>
        </Link>

        {/* Auth Card — 3D Tilt with Glare */}
        <TiltCard className="rounded-3xl">
        <div className="glass-strong rounded-3xl p-8 sm:p-10">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center">
            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Sparkles className="mb-3 h-10 w-10 text-accent-gold" />
            </motion.div>
            <h1 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
              {mode === "signup" ? "Join" : "Welcome back to"}{" "}
              Note<span className="text-accent-blue">Verse</span>
            </h1>
            <p className="mt-1 text-sm text-white/40">
              {mode === "signup"
                ? "Create your account to get started"
                : "Sign in to continue learning"}
            </p>
          </div>

          {/* Role Toggle (signup only) */}
          {mode === "signup" && (
            <div className="mb-6">
              <div className="flex rounded-xl bg-white/5 p-1">
                {(["student", "teacher"] as Role[]).map((r) => (
                  <motion.button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRole(r);
                      setError("");
                    }}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                      role === r ? "text-white" : "text-white/40 hover:text-white/60"
                    }`}
                    whileTap={{ scale: 0.97 }}
                  >
                    {role === r && (
                      <motion.div
                        layoutId="roleIndicator"
                        className="absolute inset-0 rounded-lg bg-accent-blue/20 border border-accent-blue/30"
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      {r === "student" ? (
                        <GraduationCap className="h-4 w-4" />
                      ) : (
                        <BookOpen className="h-4 w-4" />
                      )}
                      {r === "student" ? "Student" : "Teacher"}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {/* Error display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Full Name (signup only) */}
            <AnimatePresence>
              {mode === "signup" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Enter your full name"
                      required={mode === "signup"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-accent-blue/50 focus:bg-white/8"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-accent-blue/50 focus:bg-white/8"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-white/50">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-11 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-accent-blue/50 focus:bg-white/8"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 transition-colors hover:text-white/60"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Role-specific field (signup only) */}
            <AnimatePresence mode="wait">
              {mode === "signup" && role === "student" && (
                <motion.div
                  key="schoolName"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    School Name
                  </label>
                  <div className="relative">
                    <School className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Your school or institution"
                      required={mode === "signup" && role === "student"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-accent-blue/50 focus:bg-white/8"
                    />
                  </div>
                </motion.div>
              )}

              {mode === "signup" && role === "teacher" && (
                <motion.div
                  key="subjectExpertise"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    Subject Expertise
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={subjectExpertise}
                      onChange={(e) => setSubjectExpertise(e.target.value)}
                      placeholder="e.g. Mathematics, Physics"
                      required={mode === "signup" && role === "teacher"}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-accent-blue/50 focus:bg-white/8"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-accent-blue py-3.5 text-sm font-bold text-white shadow-lg shadow-accent-blue/25 transition-opacity disabled:opacity-60"
              whileHover={!loading ? { scale: 1.02, boxShadow: "0 0 30px rgba(0, 123, 255, 0.4)" } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
            >
              {/* Shimmer */}
              {!loading && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{
                    repeat: Infinity,
                    repeatDelay: 3,
                    duration: 1.3,
                    ease: "easeInOut",
                  }}
                />
              )}
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <span className="relative z-10">
                  {mode === "signup" ? "Create Account" : "Sign In"}
                </span>
              )}
            </motion.button>
          </form>

          {/* Toggle mode */}
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                resetForm();
              }}
              className="text-sm text-white/40 transition-colors hover:text-white/70"
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
        </TiltCard>

        {/* Bottom hint */}
        <p className="mt-6 text-center text-xs text-white/20">
          By continuing, you agree to NoteVerse&apos;s Terms of Service.
        </p>
      </motion.div>
    </div>
  );
}
