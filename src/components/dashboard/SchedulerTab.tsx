"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  CalendarDays,
  Plus,
  Trash2,
  Clock,
  Users,
  MapPin,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";

interface Session {
  id: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;
  location: string;
  type: "in-person" | "online";
  createdBy: string;
  createdByName: string;
  createdAt: { seconds: number } | null;
}

interface SchedulerTabProps {
  classroomId: string;
  classroomName?: string;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function SchedulerTab({ classroomId, classroomName }: SchedulerTabProps) {
  const { user, profile } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date());

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [location, setLocation] = useState("");
  const [sessionType, setSessionType] = useState<"in-person" | "online">("online");

  useEffect(() => {
    const q = query(
      collection(db, "classrooms", classroomId, "sessions"),
      orderBy("date", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Session)));
      setLoading(false);
    });
    return () => unsub();
  }, [classroomId]);

  const createSession = async () => {
    if (!title.trim() || !date || !user || !profile) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "classrooms", classroomId, "sessions"), {
        title: title.trim(),
        description: description.trim(),
        date,
        startTime,
        endTime,
        location: location.trim(),
        type: sessionType,
        createdBy: user.uid,
        createdByName: profile.fullName,
        createdAt: serverTimestamp(),
      });
      // Notification: session scheduled
      createNotification({
        classId: classroomId,
        className: classroomName || "",
        type: "SESSION_SCHEDULED",
        message: `${profile.fullName} scheduled a study session: "${title.trim()}" on ${date}`,
        actorName: profile.fullName,
        actorUid: user.uid,
      });

      setTitle("");
      setDescription("");
      setDate("");
      setStartTime("09:00");
      setEndTime("10:00");
      setLocation("");
      setShowCreate(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm("Delete this study session?")) return;
    await deleteDoc(doc(db, "classrooms", classroomId, "sessions", sessionId));
  };

  // Calendar helpers
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const getSessionsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return sessions.filter((s) => s.date === dateStr);
  };

  const prevMonth = () => setViewMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setViewMonth(new Date(year, month + 1, 1));

  // Upcoming sessions (from today)
  const upcoming = sessions.filter((s) => s.date >= todayStr).slice(0, 5);

  return (
    <div className="flex h-full flex-col gap-4 p-4 lg:flex-row">
      {/* Calendar */}
      <div className="glass-strong flex-1 rounded-2xl p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/15">
              <CalendarDays className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="font-[var(--font-outfit)] text-xl font-bold text-white">
              {MONTHS[month]} {year}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={prevMonth}
              className="rounded-lg bg-white/5 p-1.5 text-white/40 hover:text-white/70"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.button>
            <motion.button
              onClick={nextMonth}
              className="rounded-lg bg-white/5 p-1.5 text-white/40 hover:text-white/70"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>
        </div>

        {/* Day headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs font-medium text-white/30">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const daySessions = getSessionsForDay(day);
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            return (
              <motion.div
                key={day}
                className={cn(
                  "relative min-h-[60px] rounded-lg p-1.5 text-xs transition-colors",
                  isToday
                    ? "bg-accent-blue/10 border border-accent-blue/20"
                    : "hover:bg-white/5"
                )}
                whileHover={{ scale: 1.02 }}
              >
                <span
                  className={cn(
                    "font-medium",
                    isToday ? "text-accent-blue" : "text-white/50"
                  )}
                >
                  {day}
                </span>
                {daySessions.map((s) => (
                  <div
                    key={s.id}
                    className={cn(
                      "mt-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium",
                      s.type === "online"
                        ? "bg-cyan-500/15 text-cyan-300"
                        : "bg-accent-gold/15 text-accent-gold"
                    )}
                    title={`${s.title} (${s.startTime}-${s.endTime})`}
                  >
                    {s.title}
                  </div>
                ))}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sidebar: Upcoming + Create */}
      <div className="flex w-full flex-col gap-3 lg:w-80">
        {/* Create button — teachers only */}
        {profile?.role === "teacher" && (
          <motion.button
            onClick={() => setShowCreate(!showCreate)}
            className="glass-strong flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-medium text-accent-blue hover:bg-accent-blue/10"
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="h-4 w-4" /> Schedule Session
          </motion.button>
        )}

        {/* Create form */}
        <AnimatePresence>
          {showCreate && profile?.role === "teacher" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-strong overflow-hidden rounded-2xl"
            >
              <div className="space-y-3 p-4">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Session title"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-accent-blue/30"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-accent-blue/30"
                />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-blue/30 [color-scheme:dark]"
                />
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-blue/30 [color-scheme:dark]"
                  />
                  <span className="self-center text-white/20">to</span>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-accent-blue/30 [color-scheme:dark]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSessionType("online")}
                    className={cn(
                      "flex-1 rounded-xl py-2 text-xs font-medium transition-colors",
                      sessionType === "online"
                        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/20"
                        : "bg-white/5 text-white/30"
                    )}
                  >
                    Online
                  </button>
                  <button
                    onClick={() => setSessionType("in-person")}
                    className={cn(
                      "flex-1 rounded-xl py-2 text-xs font-medium transition-colors",
                      sessionType === "in-person"
                        ? "bg-accent-gold/15 text-accent-gold border border-accent-gold/20"
                        : "bg-white/5 text-white/30"
                    )}
                  >
                    In-Person
                  </button>
                </div>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={sessionType === "online" ? "Meeting link" : "Location"}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-accent-blue/30"
                />
                <div className="flex gap-2">
                  <motion.button
                    onClick={createSession}
                    disabled={!title.trim() || !date || saving}
                    className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                    whileTap={{ scale: 0.95 }}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
                    Schedule
                  </motion.button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="rounded-xl px-3 py-2 text-sm text-white/40 hover:text-white/70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upcoming sessions */}
        <div className="glass-strong flex-1 rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold text-white/60">Upcoming Sessions</h3>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-accent-blue" />
            </div>
          ) : upcoming.length === 0 ? (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto mb-2 h-8 w-8 text-white/10" />
              <p className="text-xs text-white/20">No upcoming sessions</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((s) => (
                <motion.div
                  key={s.id}
                  className="group rounded-xl bg-white/5 p-3 transition-colors hover:bg-white/8"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <h4 className="text-sm font-medium text-white">{s.title}</h4>
                    {(profile?.role === "teacher" || s.createdBy === user?.uid) && (
                      <button
                        onClick={() => deleteSession(s.id)}
                        className="rounded p-0.5 text-white/20 opacity-0 hover:text-red-400 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-white/30">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(s.date + "T00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {s.startTime}–{s.endTime}
                    </span>
                    {s.location && (
                      <span className="flex items-center gap-1">
                        {s.type === "online" ? (
                          <Video className="h-3 w-3" />
                        ) : (
                          <MapPin className="h-3 w-3" />
                        )}
                        <span className="truncate max-w-[120px]">{s.location}</span>
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
