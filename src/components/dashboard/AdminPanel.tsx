"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  onSnapshot,
  updateDoc,
  arrayRemove,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  Users,
  Trash2,
  UserMinus,
  AlertTriangle,
  Settings,
  BarChart3,
  FileText,
  MessageSquare,
  Layers,
  CalendarDays,
  Loader2,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Member {
  uid: string;
  name: string;
  role: "student" | "teacher";
  email: string;
}

interface AdminPanelProps {
  classroomId: string;
  classroomName: string;
}

export default function AdminPanel({ classroomId, classroomName }: AdminPanelProps) {
  const { user, profile } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [creatorId, setCreatorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    notes: 0,
    messages: 0,
    decks: 0,
    sessions: 0,
    quizzes: 0,
  });
  const [copied, setCopied] = useState(false);
  const [showDanger, setShowDanger] = useState(false);
  const [activeSection, setActiveSection] = useState<"members" | "stats" | "settings">("members");

  // Listen to classroom data
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "classrooms", classroomId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMembers(data.members || []);
        setCreatorId(data.createdBy || "");
        setLoading(false);
      }
    });
    return () => unsub();
  }, [classroomId]);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [notesSnap, messagesSnap, decksSnap, sessionsSnap, quizzesSnap] = await Promise.all([
          getDocs(collection(db, "classrooms", classroomId, "notes")),
          getDocs(collection(db, "classrooms", classroomId, "messages")),
          getDocs(collection(db, "classrooms", classroomId, "decks")),
          getDocs(collection(db, "classrooms", classroomId, "sessions")),
          getDocs(collection(db, "classrooms", classroomId, "quizzes")),
        ]);
        setStats({
          notes: notesSnap.size,
          messages: messagesSnap.size,
          decks: decksSnap.size,
          sessions: sessionsSnap.size,
          quizzes: quizzesSnap.size,
        });
      } catch {
        // Some collections may not exist yet
      }
    };
    fetchStats();
  }, [classroomId]);

  const removeMember = async (member: Member) => {
    if (member.uid === creatorId) return;
    if (!confirm(`Remove ${member.name} from this classroom?`)) return;
    await updateDoc(doc(db, "classrooms", classroomId), {
      members: arrayRemove(member),
    });
  };

  const deleteClassroom = async () => {
    if (!confirm("This will permanently delete the classroom and all its data. Are you sure?")) return;
    if (!confirm("This action CANNOT be undone. Type confirm to proceed.")) return;
    try {
      await deleteDoc(doc(db, "classrooms", classroomId));
      window.location.reload();
    } catch {
      alert("Failed to delete classroom.");
    }
  };

  const copyClassroomId = () => {
    navigator.clipboard.writeText(classroomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCreator = user?.uid === creatorId;

  if (profile?.role !== "teacher") {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <div className="text-center">
          <Shield className="mx-auto mb-3 h-10 w-10 text-white/10" />
          <p className="text-sm text-white/30">Teacher access only</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: "members" as const, label: "Members", icon: <Users className="h-4 w-4" /> },
    { id: "stats" as const, label: "Statistics", icon: <BarChart3 className="h-4 w-4" /> },
    { id: "settings" as const, label: "Settings", icon: <Settings className="h-4 w-4" /> },
  ];

  const statCards = [
    { label: "Notes", value: stats.notes, icon: <FileText className="h-5 w-5" />, color: "text-accent-blue" },
    { label: "Messages", value: stats.messages, icon: <MessageSquare className="h-5 w-5" />, color: "text-green-400" },
    { label: "Flashcard Decks", value: stats.decks, icon: <Layers className="h-5 w-5" />, color: "text-purple-400" },
    { label: "Study Sessions", value: stats.sessions, icon: <CalendarDays className="h-5 w-5" />, color: "text-cyan-400" },
    { label: "Quizzes", value: stats.quizzes, icon: <FileText className="h-5 w-5" />, color: "text-accent-gold" },
  ];

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
          <Shield className="h-5 w-5 text-amber-400" />
        </div>
        <div>
          <h2 className="font-[var(--font-outfit)] text-xl font-bold text-white">
            Admin Panel
          </h2>
          <p className="text-xs text-white/30">{classroomName}</p>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
        {sections.map((s) => (
          <motion.button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={cn(
              "relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              activeSection === s.id ? "text-white" : "text-white/30 hover:text-white/50"
            )}
            whileTap={{ scale: 0.95 }}
          >
            {activeSection === s.id && (
              <motion.div
                layoutId="adminSection"
                className="absolute inset-0 rounded-lg bg-accent-blue/15 border border-accent-blue/20"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">{s.icon}</span>
            <span className="relative z-10">{s.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeSection === "members" && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-2"
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm text-white/40">{members.length} members</p>
                  <button
                    onClick={copyClassroomId}
                    className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5 text-xs text-white/30 hover:text-white/50"
                  >
                    {copied ? (
                      <CheckCircle2 className="h-3 w-3 text-green-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    {copied ? "Copied!" : "Copy Invite Code"}
                  </button>
                </div>
                {members.map((member) => (
                  <div
                    key={member.uid}
                    className="glass-strong flex items-center justify-between rounded-xl p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-bold",
                          member.role === "teacher"
                            ? "bg-accent-gold/20 text-accent-gold"
                            : "bg-accent-blue/20 text-accent-blue"
                        )}
                      >
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {member.name}
                          {member.uid === creatorId && (
                            <span className="ml-2 text-xs text-accent-gold">Creator</span>
                          )}
                        </p>
                        <p className="text-xs text-white/30">{member.email}</p>
                      </div>
                    </div>
                    {isCreator && member.uid !== creatorId && (
                      <motion.button
                        onClick={() => removeMember(member)}
                        className="rounded-lg p-2 text-white/20 hover:bg-red-500/10 hover:text-red-400"
                        whileTap={{ scale: 0.9 }}
                        title="Remove member"
                      >
                        <UserMinus className="h-4 w-4" />
                      </motion.button>
                    )}
                  </div>
                ))}
              </motion.div>
            )}

            {activeSection === "stats" && (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {statCards.map((s) => (
                  <div key={s.label} className="glass-strong rounded-2xl p-4">
                    <div className={cn("mb-2", s.color)}>{s.icon}</div>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-xs text-white/30">{s.label}</p>
                  </div>
                ))}
                <div className="glass-strong rounded-2xl p-4">
                  <div className="mb-2 text-white/40">
                    <Users className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-white">{members.length}</p>
                  <p className="text-xs text-white/30">Total Members</p>
                </div>
              </motion.div>
            )}

            {activeSection === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {/* Classroom info */}
                <div className="glass-strong rounded-2xl p-4">
                  <h3 className="mb-3 text-sm font-semibold text-white/60">Classroom Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-white/30">Name</span>
                      <span className="text-white">{classroomName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30">Classroom ID</span>
                      <button
                        onClick={copyClassroomId}
                        className="flex items-center gap-1 font-mono text-xs text-accent-blue hover:underline"
                      >
                        {classroomId.slice(0, 12)}...
                        {copied ? <CheckCircle2 className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/30">Members</span>
                      <span className="text-white">{members.length}</span>
                    </div>
                  </div>
                </div>

                {/* Danger zone */}
                {isCreator && (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
                    <button
                      onClick={() => setShowDanger(!showDanger)}
                      className="flex w-full items-center gap-2 text-sm font-medium text-red-400"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      Danger Zone
                    </button>
                    <AnimatePresence>
                      {showDanger && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 overflow-hidden"
                        >
                          <p className="mb-3 text-xs text-red-300/60">
                            Deleting the classroom will permanently remove all notes, messages, quizzes, and other data.
                          </p>
                          <motion.button
                            onClick={deleteClassroom}
                            className="flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/30"
                            whileTap={{ scale: 0.95 }}
                          >
                            <Trash2 className="h-4 w-4" /> Delete Classroom
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
