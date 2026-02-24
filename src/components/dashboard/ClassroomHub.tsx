"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Plus,
  LogIn,
  Loader2,
  Copy,
  CheckCircle2,
  Sparkles,
  Users,
  BookOpen,
  ArrowRight,
} from "lucide-react";

interface ClassroomHubProps {
  onJoinClassroom: (id: string, name: string) => void;
}

interface Classroom {
  id: string;
  name: string;
  subject?: string;
  createdByName?: string;
  membersCount: number;
}

export default function ClassroomHub({ onJoinClassroom }: ClassroomHubProps) {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [className, setClassName] = useState("");
  const [classSubject, setClassSubject] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState("");
  const [copied, setCopied] = useState(false);
  const [myClassrooms, setMyClassrooms] = useState<Classroom[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);

  // Fetch classrooms the user belongs to
  useEffect(() => {
    const fetchMyClassrooms = async () => {
      if (!user) {
        setLoadingClassrooms(false);
        return;
      }
      try {
        const q = query(
          collection(db, "classrooms"),
          where("memberUids", "array-contains", user.uid)
        );
        const snapshot = await getDocs(q);
        const classrooms: Classroom[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            name: data.name,
            subject: data.subject,
            createdByName: data.createdByName,
            membersCount: data.members?.length || 0,
          };
        });
        setMyClassrooms(classrooms);
      } catch (err) {
        console.error("Error fetching classrooms:", err);
      } finally {
        setLoadingClassrooms(false);
      }
    };
    fetchMyClassrooms();
  }, [user]);

  const handleCreate = async () => {
    if (!user || !profile) return;
    setLoading(true);
    setError("");
    try {
      const docRef = await addDoc(collection(db, "classrooms"), {
        name: className,
        subject: classSubject,
        createdBy: user.uid,
        createdByName: profile.fullName,
        memberUids: [user.uid],
        members: [
          {
            uid: user.uid,
            name: profile.fullName,
            role: profile.role,
            email: profile.email,
          },
        ],
        createdAt: serverTimestamp(),
      });
      setCreatedId(docRef.id);
    } catch (err) {
      setError("Failed to create classroom. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!user || !profile) return;
    setLoading(true);
    setError("");
    try {
      const classRef = doc(db, "classrooms", joinCode.trim());
      const classSnap = await getDoc(classRef);

      if (!classSnap.exists()) {
        setError("Classroom not found. Check the code and try again.");
        setLoading(false);
        return;
      }

      const data = classSnap.data();
      const alreadyMember = data.members?.some(
        (m: { uid: string }) => m.uid === user.uid
      );

      if (!alreadyMember) {
        await updateDoc(classRef, {
          memberUids: arrayUnion(user.uid),
          members: arrayUnion({
            uid: user.uid,
            name: profile.fullName,
            role: profile.role,
            email: profile.email,
          }),
        });
      } else {
        // Backfill memberUids for classrooms created before this fix
        const hasMemberUids = Array.isArray(data.memberUids);
        if (!hasMemberUids || !data.memberUids.includes(user.uid)) {
          await updateDoc(classRef, {
            memberUids: arrayUnion(user.uid),
          });
        }
      }

      onJoinClassroom(joinCode.trim(), data.name);
    } catch (err) {
      setError("Failed to join classroom. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(createdId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full items-center justify-center overflow-y-auto p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        {/* Welcome header */}
        <div className="mb-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/15"
          >
            <Sparkles className="h-8 w-8 text-accent-blue" />
          </motion.div>
          <h2 className="font-[var(--font-outfit)] text-3xl font-bold text-white">
            Welcome, {profile?.fullName.split(" ")[0]}!
          </h2>
          <p className="mt-2 text-white/40">
            {profile?.role === "teacher"
              ? "Create a classroom or join an existing one."
              : "Join a classroom using the code from your teacher."}
          </p>
        </div>

        {/* My Classrooms list */}
        {loadingClassrooms ? (
          <div className="mb-6 flex items-center justify-center gap-2 text-white/40">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading your classrooms...</span>
          </div>
        ) : myClassrooms.length > 0 ? (
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-medium text-white/50">Your Classrooms</h3>
            <div className="space-y-2">
              {myClassrooms.map((classroom) => (
                <motion.button
                  key={classroom.id}
                  onClick={() => onJoinClassroom(classroom.id, classroom.name)}
                  className="glass group flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-all hover:bg-white/10"
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-blue/15">
                    <BookOpen className="h-5 w-5 text-accent-blue" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{classroom.name}</p>
                    <p className="truncate text-xs text-white/40">
                      {classroom.subject || "No subject"} &middot; {classroom.membersCount} member{classroom.membersCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/20 transition-colors group-hover:text-white/60" />
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {/* Success: show created classroom code */}
          {createdId ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong rounded-2xl p-8 text-center"
            >
              <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
              <h3 className="font-[var(--font-outfit)] mb-2 text-xl font-bold text-white">
                Classroom Created!
              </h3>
              <p className="mb-4 text-sm text-white/40">
                Share this code with your students:
              </p>
              <div className="mb-4 flex items-center justify-center gap-2">
                <code className="rounded-xl bg-white/5 px-4 py-2 font-mono text-sm text-accent-gold">
                  {createdId}
                </code>
                <motion.button
                  onClick={copyCode}
                  className="glass flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
                  whileTap={{ scale: 0.9 }}
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-white/40" />
                  )}
                </motion.button>
              </div>
              <motion.button
                onClick={() => {
                  // Add to local list so it persists if user navigates back
                  setMyClassrooms((prev) => [
                    ...prev,
                    { id: createdId, name: className, subject: classSubject, createdByName: profile?.fullName, membersCount: 1 },
                  ]);
                  onJoinClassroom(createdId, className);
                }}
                className="w-full rounded-xl bg-accent-blue py-3 text-sm font-bold text-white shadow-lg shadow-accent-blue/25"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Enter Classroom
              </motion.button>
            </motion.div>
          ) : mode === "idle" ? (
            /* Action cards */
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {profile?.role === "teacher" && (
                <motion.button
                  onClick={() => setMode("create")}
                  className="glass group rounded-2xl p-6 text-left transition-all hover:bg-white/10"
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-blue/15">
                    <Plus className="h-6 w-6 text-accent-blue" />
                  </div>
                  <h3 className="font-[var(--font-outfit)] mb-1 text-lg font-bold text-white">
                    Create Class
                  </h3>
                  <p className="text-sm text-white/40">
                    Set up a new classroom and invite students.
                  </p>
                </motion.button>
              )}

              <motion.button
                onClick={() => setMode("join")}
                className="glass group rounded-2xl p-6 text-left transition-all hover:bg-white/10"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-gold/15">
                  <LogIn className="h-6 w-6 text-accent-gold" />
                </div>
                <h3 className="font-[var(--font-outfit)] mb-1 text-lg font-bold text-white">
                  Join Class
                </h3>
                <p className="text-sm text-white/40">
                  Enter a classroom code from your teacher.
                </p>
              </motion.button>
            </motion.div>
          ) : mode === "create" ? (
            /* Create form */
            <motion.div
              key="create"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-strong rounded-2xl p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15">
                  <BookOpen className="h-5 w-5 text-accent-blue" />
                </div>
                <div>
                  <h3 className="font-[var(--font-outfit)] text-lg font-bold text-white">
                    Create Classroom
                  </h3>
                  <p className="text-xs text-white/40">
                    Fill in the details below
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    Classroom Name
                  </label>
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. Physics 101"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-accent-blue/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    Subject
                  </label>
                  <input
                    type="text"
                    value={classSubject}
                    onChange={(e) => setClassSubject(e.target.value)}
                    placeholder="e.g. Mechanics & Thermodynamics"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-accent-blue/50"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMode("idle");
                      setError("");
                    }}
                    className="glass flex-1 rounded-xl py-3 text-sm font-medium text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleCreate}
                    disabled={!className.trim() || loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-blue py-3 text-sm font-bold text-white shadow-lg shadow-accent-blue/25 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create"
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Join form */
            <motion.div
              key="join"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-strong rounded-2xl p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/15">
                  <Users className="h-5 w-5 text-accent-gold" />
                </div>
                <div>
                  <h3 className="font-[var(--font-outfit)] text-lg font-bold text-white">
                    Join Classroom
                  </h3>
                  <p className="text-xs text-white/40">
                    Enter the code from your teacher
                  </p>
                </div>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-white/50">
                    Classroom Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Paste the classroom code here"
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-white placeholder-white/25 outline-none focus:border-accent-gold/50"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setMode("idle");
                      setError("");
                    }}
                    className="glass flex-1 rounded-xl py-3 text-sm font-medium text-white/50 hover:text-white"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={handleJoin}
                    disabled={!joinCode.trim() || loading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-gold py-3 text-sm font-bold text-cosmic-deep shadow-lg shadow-accent-gold/25 disabled:opacity-50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Join"
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
