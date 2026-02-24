"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import DashboardBackground from "@/components/dashboard/DashboardBackground";
import {
  Loader2,
  Plus,
  LogIn,
  Sparkles,
  Users,
  BookOpen,
  Copy,
  CheckCircle2,
  X,
  ArrowRight,
  LogOut,
  Hash,
} from "lucide-react";

interface ClassCard {
  id: string;
  name: string;
  subject?: string;
  classCode: string;
  teacherName: string;
  studentCount: number;
}

function generateClassCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function DashboardPage() {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassCard[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [profileRetried, setProfileRetried] = useState(false);

  // Create form state
  const [subjectName, setSubjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [createdClassId, setCreatedClassId] = useState("");
  const [copied, setCopied] = useState(false);
  const [createError, setCreateError] = useState("");

  // Join form state
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  // Clean up old localStorage keys from previous architecture
  useEffect(() => {
    try {
      localStorage.removeItem("noteverse_classroomId");
      localStorage.removeItem("noteverse_classroomName");
      localStorage.removeItem("noteverse_activeTab");
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && !profile && !profileRetried) {
      setProfileRetried(true);
      refreshProfile();
    }
  }, [loading, user, profile, profileRetried, refreshProfile]);

  // Fetch user's classes from Firestore
  const fetchClasses = useCallback(async () => {
    if (!user || !profile) return;
    setLoadingClasses(true);
    try {
      let q;
      if (profile.role === "teacher") {
        q = query(
          collection(db, "classrooms"),
          where("teacherId", "==", user.uid)
        );
      } else {
        q = query(
          collection(db, "classrooms"),
          where("studentIds", "array-contains", user.uid)
        );
      }
      const snapshot = await getDocs(q);
      const list: ClassCard[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || "",
          subject: data.subject,
          classCode: data.classCode || "",
          teacherName: data.teacherName || data.createdByName || "",
          studentCount: data.studentIds?.length || 0,
        };
      });
      setClasses(list);
    } catch (err) {
      console.error("Error fetching classes:", err);
    } finally {
      setLoadingClasses(false);
    }
  }, [user, profile]);

  useEffect(() => {
    if (user && profile) fetchClasses();
  }, [user, profile, fetchClasses]);

  // ── Create Class ──────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!user || !profile || !subjectName.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      // Generate unique 6-character class code
      let classCode = "";
      for (let attempt = 0; attempt < 10; attempt++) {
        classCode = generateClassCode();
        const codeQ = query(
          collection(db, "classrooms"),
          where("classCode", "==", classCode)
        );
        const snap = await getDocs(codeQ);
        if (snap.empty) break;
        if (attempt === 9) throw new Error("Failed to generate unique code");
      }

      const docRef = await addDoc(collection(db, "classrooms"), {
        name: subjectName.trim(),
        subject: subjectName.trim(),
        teacherId: user.uid,
        teacherName: profile.fullName,
        classCode,
        studentIds: [],
        memberUids: [user.uid],
        members: [
          {
            uid: user.uid,
            name: profile.fullName,
            role: "teacher",
            email: profile.email,
          },
        ],
        createdBy: user.uid,
        createdByName: profile.fullName,
        createdAt: serverTimestamp(),
      });

      // Add to teacher's enrolledClasses
      await updateDoc(doc(db, "users", user.uid), {
        enrolledClasses: arrayUnion(docRef.id),
      });

      setCreatedCode(classCode);
      setCreatedClassId(docRef.id);
      await fetchClasses();
    } catch (err) {
      console.error(err);
      setCreateError("Failed to create class. Please try again.");
    } finally {
      setCreating(false);
    }
  };

  // ── Join Class ────────────────────────────────────────────────────────
  const handleJoin = async () => {
    if (!user || !profile || !joinCode.trim()) return;
    setJoining(true);
    setJoinError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const q = query(
        collection(db, "classrooms"),
        where("classCode", "==", code)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setJoinError("No class found with that code. Please check and try again.");
        setJoining(false);
        return;
      }

      const classDoc = snapshot.docs[0];
      const classId = classDoc.id;
      const classData = classDoc.data();

      // Already a member?
      const alreadyMember =
        classData.studentIds?.includes(user.uid) ||
        classData.teacherId === user.uid;

      if (alreadyMember) {
        router.push(`/dashboard/${classId}`);
        return;
      }

      // Add student to class
      await updateDoc(doc(db, "classrooms", classId), {
        studentIds: arrayUnion(user.uid),
        memberUids: arrayUnion(user.uid),
        members: arrayUnion({
          uid: user.uid,
          name: profile.fullName,
          role: profile.role,
          email: profile.email,
        }),
      });

      // Add class to student's enrolledClasses
      await updateDoc(doc(db, "users", user.uid), {
        enrolledClasses: arrayUnion(classId),
      });

      router.push(`/dashboard/${classId}`);
    } catch (err) {
      console.error(err);
      setJoinError("Failed to join class. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  // ── Modal helpers ─────────────────────────────────────────────────────
  const resetCreateModal = () => {
    setSubjectName("");
    setCreatedCode("");
    setCreatedClassId("");
    setCreateError("");
    setCopied(false);
    setShowCreateModal(false);
  };

  const resetJoinModal = () => {
    setJoinCode("");
    setJoinError("");
    setShowJoinModal(false);
  };

  // ── Loading / guard states ────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#12141D' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
          <p className="text-sm text-white/40">Loading...</p>
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#12141D' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
          <p className="text-sm text-white/40">Setting up your profile...</p>
        </motion.div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: '#12141D' }}>
      <DashboardBackground />

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-white/5">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-accent-gold" />
            <span className="font-[var(--font-outfit)] text-xl font-bold text-white">
              Note<span className="text-accent-blue">Verse</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-blue/20 text-xs font-bold text-accent-blue">
                {profile.fullName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">
                  {profile.fullName}
                </p>
                <p className="text-xs capitalize text-white/40">
                  {profile.role}
                </p>
              </div>
            </div>
            <motion.button
              onClick={signOut}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
              whileTap={{ scale: 0.95 }}
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-7xl px-6 py-8">
        {/* Title + Action Buttons */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-[var(--font-outfit)] text-3xl font-bold text-white">
              My Classrooms
            </h1>
            <p className="mt-1 text-sm text-white/40">
              {profile.role === "teacher"
                ? "Manage your classes and track student progress."
                : "Access your enrolled classes and start learning."}
            </p>
          </div>
          <div className="flex gap-3">
            {profile.role === "teacher" && (
              <motion.button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-accent-blue px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-blue/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="h-4 w-4" />
                Create Class
              </motion.button>
            )}
            <motion.button
              onClick={() => setShowJoinModal(true)}
              className="glass flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white/70 hover:text-white"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <LogIn className="h-4 w-4" />
              Join Class
            </motion.button>
          </div>
        </div>

        {/* ── Class Grid ──────────────────────────────────────────────── */}
        {loadingClasses ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
          </div>
        ) : classes.length === 0 ? (
          /* Empty state */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5">
              <BookOpen className="h-10 w-10 text-white/20" />
            </div>
            <h3 className="font-[var(--font-outfit)] text-lg font-bold text-white/60">
              No classrooms yet
            </h3>
            <p className="mt-2 max-w-sm text-sm text-white/30">
              {profile.role === "teacher"
                ? "Create your first class to get started. Share the class code with your students."
                : "Enter a class code from your teacher to get started."}
            </p>
          </motion.div>
        ) : (
          /* Classroom cards */
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls, i) => (
              <motion.div
                key={cls.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/dashboard/${cls.id}`)}
                className="glass group cursor-pointer rounded-2xl p-6 transition-all hover:bg-white/10 hover:shadow-lg hover:shadow-accent-blue/5"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/15">
                    <BookOpen className="h-6 w-6 text-accent-blue" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-white/0 transition-all group-hover:text-white/40" />
                </div>
                <h3 className="font-[var(--font-outfit)] text-lg font-bold text-white">
                  {cls.name}
                </h3>
                {cls.subject && cls.subject !== cls.name && (
                  <p className="mt-1 text-sm text-white/40">{cls.subject}</p>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/30">
                  {profile.role === "student" && cls.teacherName && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {cls.teacherName}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {cls.studentCount} student
                    {cls.studentCount !== 1 ? "s" : ""}
                  </span>
                  {profile.role === "teacher" && cls.classCode && (
                    <span className="flex items-center gap-1 font-mono">
                      <Hash className="h-3.5 w-3.5" />
                      {cls.classCode}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* ── Create Class Modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={resetCreateModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-strong w-full max-w-md rounded-2xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {createdCode ? (
                /* ── Success state ── */
                <div className="text-center">
                  <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
                  <h3 className="font-[var(--font-outfit)] mb-2 text-xl font-bold text-white">
                    Class Created!
                  </h3>
                  <p className="mb-4 text-sm text-white/40">
                    Share this code with your students:
                  </p>
                  <div className="mb-6 flex items-center justify-center gap-2">
                    <code className="rounded-xl bg-white/5 px-6 py-3 font-mono text-lg tracking-widest text-accent-gold">
                      {createdCode}
                    </code>
                    <motion.button
                      onClick={() => {
                        navigator.clipboard.writeText(createdCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="glass flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/10"
                      whileTap={{ scale: 0.9 }}
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4 text-white/40" />
                      )}
                    </motion.button>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={resetCreateModal}
                      className="glass flex-1 rounded-xl py-3 text-sm font-medium text-white/50 hover:text-white"
                    >
                      Close
                    </button>
                    <motion.button
                      onClick={() => {
                        const id = createdClassId;
                        resetCreateModal();
                        router.push(`/dashboard/${id}`);
                      }}
                      className="flex-1 rounded-xl bg-accent-blue py-3 text-sm font-bold text-white shadow-lg shadow-accent-blue/25"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Enter Class
                    </motion.button>
                  </div>
                </div>
              ) : (
                /* ── Create form ── */
                <>
                  <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15">
                        <BookOpen className="h-5 w-5 text-accent-blue" />
                      </div>
                      <h3 className="font-[var(--font-outfit)] text-lg font-bold text-white">
                        Create Class
                      </h3>
                    </div>
                    <button
                      onClick={resetCreateModal}
                      className="text-white/30 hover:text-white/60"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  {createError && (
                    <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      {createError}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-white/50">
                        Subject Name
                      </label>
                      <input
                        type="text"
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        placeholder="e.g. Physics, Mathematics, Biology"
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-accent-blue/50"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={resetCreateModal}
                        className="glass flex-1 rounded-xl py-3 text-sm font-medium text-white/50 hover:text-white"
                      >
                        Cancel
                      </button>
                      <motion.button
                        onClick={handleCreate}
                        disabled={!subjectName.trim() || creating}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-blue py-3 text-sm font-bold text-white shadow-lg shadow-accent-blue/25 disabled:opacity-50"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {creating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Create"
                        )}
                      </motion.button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Join Class Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showJoinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={resetJoinModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-strong w-full max-w-md rounded-2xl p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/15">
                    <LogIn className="h-5 w-5 text-accent-gold" />
                  </div>
                  <h3 className="font-[var(--font-outfit)] text-lg font-bold text-white">
                    Join Class
                  </h3>
                </div>
                <button
                  onClick={resetJoinModal}
                  className="text-white/30 hover:text-white/60"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {joinError && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {joinError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    Class Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(e.target.value.toUpperCase().slice(0, 6))
                    }
                    placeholder="Enter 6-character code"
                    maxLength={6}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center font-mono text-lg tracking-widest text-white placeholder-white/25 outline-none focus:border-accent-gold/50"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={resetJoinModal}
                    className="glass flex-1 rounded-xl py-3 text-sm font-medium text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleJoin}
                    disabled={joinCode.trim().length !== 6 || joining}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-gold py-3 text-sm font-bold text-cosmic-deep shadow-lg shadow-accent-gold/25 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {joining ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Join"
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
