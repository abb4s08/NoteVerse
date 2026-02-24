"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  Video,
  ExternalLink,
  LinkIcon,
  Radio,
  XCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";

interface SessionRecordingProps {
  classroomId: string;
  classroomName?: string;
}

export default function SessionRecordingTab({ classroomId, classroomName }: SessionRecordingProps) {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";
  const [liveMeetUrl, setLiveMeetUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [listening, setListening] = useState(true);

  // ── Real-time listener for liveMeetUrl ──────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "classrooms", classroomId), (snap) => {
      const data = snap.data();
      setLiveMeetUrl(data?.liveMeetUrl ?? null);
      setListening(false);
    });
    return () => unsub();
  }, [classroomId]);

  // ── Teacher: start live class ───────────────────────────────────────
  const startLiveClass = async () => {
    const url = urlInput.trim();
    if (!url) return;

    // Basic URL validation
    if (!url.startsWith("https://")) {
      alert("Please enter a valid Google Meet URL (https://meet.google.com/...)");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "classrooms", classroomId), {
        liveMeetUrl: url,
      });

      // Notification: live class started
      if (user && profile) {
        createNotification({
          classId: classroomId,
          className: classroomName || "",
          type: "LIVE_CLASS_STARTED",
          message: `${profile.fullName} started a live class!`,
          actorName: profile.fullName,
          actorUid: user.uid,
        });
      }

      setUrlInput("");
    } catch (err) {
      console.error("Error starting live class:", err);
      alert("Failed to start live class. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Teacher: end live class ─────────────────────────────────────────
  const endLiveClass = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, "classrooms", classroomId), {
        liveMeetUrl: null,
      });
    } catch (err) {
      console.error("Error ending live class:", err);
    } finally {
      setSaving(false);
    }
  };

  if (listening) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-full flex-col"
      >
        {/* ── Student: Join Live Banner (conditionally at top) ──────── */}
        <AnimatePresence>
          {liveMeetUrl && !isTeacher && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mb-6"
            >
              <motion.a
                href={liveMeetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center gap-3 overflow-hidden rounded-2xl bg-accent-blue px-6 py-5 text-white shadow-xl shadow-accent-blue/30"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Pulsating glow */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-accent-blue via-blue-400 to-accent-blue opacity-40"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "linear" }}
                />
                <motion.div
                  className="absolute -inset-1 rounded-2xl border-2 border-accent-blue"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />

                <div className="relative flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Radio className="h-6 w-6" />
                  </motion.div>
                  <div>
                    <p className="text-lg font-bold">Live Class in Progress!</p>
                    <p className="text-sm text-white/80">Click to join the Google Meet session</p>
                  </div>
                  <ExternalLink className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </div>
              </motion.a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15">
            <Video className="h-5 w-5 text-accent-blue" />
          </div>
          <div>
            <h2 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
              Live Study Room
            </h2>
            <p className="text-sm text-white/40">
              {isTeacher
                ? "Start a live class with Google Meet"
                : "Join live sessions started by your teacher"}
            </p>
          </div>
        </div>

        {/* ── Main content ─────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center gap-8">

          {/* ── Live Session Active Card ─────────────────────── */}
          {liveMeetUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong w-full max-w-lg rounded-3xl p-8"
            >
              <div className="mb-6 flex items-center gap-3">
                <motion.div
                  className="flex h-3 w-3 rounded-full bg-green-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                />
                <span className="text-sm font-semibold text-green-400">
                  Live Session Active
                </span>
              </div>

              <div className="mb-4 flex items-center gap-2 rounded-xl bg-white/5 px-4 py-3">
                <LinkIcon className="h-4 w-4 shrink-0 text-white/30" />
                <p className="truncate text-sm text-white/60">{liveMeetUrl}</p>
              </div>

              {/* Teacher: End class button */}
              {isTeacher && (
                <div className="flex gap-3">
                  <motion.a
                    href={liveMeetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-blue/25"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Meet
                  </motion.a>
                  <motion.button
                    onClick={endLiveClass}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-red-500/15 px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                    whileTap={{ scale: 0.98 }}
                  >
                    <XCircle className="h-4 w-4" />
                    End Class
                  </motion.button>
                </div>
              )}

              {/* Student: Join button */}
              {!isTeacher && (
                <motion.a
                  href={liveMeetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent-blue/25"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Video className="h-4 w-4" />
                  Join Live Class
                  <ExternalLink className="h-4 w-4" />
                </motion.a>
              )}
            </motion.div>
          )}

          {/* ── Teacher: Start Live Session Card ─────────────── */}
          {isTeacher && !liveMeetUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-strong w-full max-w-lg rounded-3xl p-8"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/10">
                  <Video className="h-8 w-8 text-accent-blue" />
                </div>
                <h3 className="font-[var(--font-outfit)] mb-2 text-lg font-bold text-white">
                  Start a Live Class
                </h3>
                <p className="text-sm text-white/40">
                  Paste your Google Meet link below. Students will see a live
                  notification and can join instantly.
                </p>
              </div>

              <div className="space-y-3">
                <div className="glass flex items-center gap-2 rounded-xl px-4 py-3">
                  <LinkIcon className="h-4 w-4 shrink-0 text-white/30" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className="flex-1 bg-transparent text-sm text-white placeholder-white/25 outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") startLiveClass();
                    }}
                  />
                </div>

                <motion.button
                  onClick={startLiveClass}
                  disabled={!urlInput.trim() || saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent-blue/25 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Radio className="h-4 w-4" />
                  )}
                  Start Live Class
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── Student: No session card ────────────────────── */}
          {!isTeacher && !liveMeetUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/5">
                <Users className="h-10 w-10 text-white/20" />
              </div>
              <h3 className="font-[var(--font-outfit)] mb-2 text-lg font-bold text-white">
                No Live Session
              </h3>
              <p className="max-w-sm text-sm text-white/40">
                Your teacher hasn&apos;t started a live class yet. When they do,
                a pulsating join button will appear right here — stay tuned!
              </p>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
