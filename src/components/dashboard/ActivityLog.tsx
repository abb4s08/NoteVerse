"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Activity,
  FileText,
  Brain,
  Calendar,
  Layers,
  Video,
} from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  actorName: string;
  createdAt: Timestamp | null;
}

interface ActivityLogProps {
  classroomId: string;
}

// ── Relative time helper ─────────────────────────────────────────────────
function timeAgo(ts: Timestamp | null): string {
  if (!ts) return "just now";
  const now = Date.now();
  const then = ts.toMillis();
  const diff = Math.max(0, now - then);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ── Icon resolver ────────────────────────────────────────────────────────
function typeIcon(type: string) {
  switch (type) {
    case "NOTE_UPLOAD":
      return <FileText className="h-3 w-3" />;
    case "QUIZ_PUBLISHED":
      return <Brain className="h-3 w-3" />;
    case "SESSION_SCHEDULED":
      return <Calendar className="h-3 w-3" />;
    case "FLASHCARD_DECK_CREATED":
      return <Layers className="h-3 w-3" />;
    case "LIVE_CLASS_STARTED":
      return <Video className="h-3 w-3" />;
    default:
      return <Activity className="h-3 w-3" />;
  }
}

function dotColor(type: string) {
  switch (type) {
    case "NOTE_UPLOAD":
      return "bg-accent-blue shadow-[0_0_6px_rgba(0,123,255,0.5)]";
    case "QUIZ_PUBLISHED":
      return "bg-purple-400 shadow-[0_0_6px_rgba(168,85,247,0.5)]";
    case "SESSION_SCHEDULED":
      return "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]";
    case "FLASHCARD_DECK_CREATED":
      return "bg-accent-gold shadow-[0_0_6px_rgba(255,215,0,0.5)]";
    case "LIVE_CLASS_STARTED":
      return "bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.5)]";
    default:
      return "bg-white/40 shadow-[0_0_6px_rgba(255,255,255,0.2)]";
  }
}

/**
 * Real-Time Activity Log (Timeline)
 *
 * Reads from the global `notifications` collection filtered by classId.
 * Renders a vertical timeline with glowing type-coloured dots, icons,
 * relative timestamps, and entry animation.
 */
export default function ActivityLog({ classroomId }: ActivityLogProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    // Primary query — requires composite index (classId + createdAt desc)
    const q = query(
      collection(db, "notifications"),
      where("classId", "==", classroomId),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<ActivityItem, "id">),
          }))
        );
      },
      () => {
        // Fallback if composite index doesn't exist yet
        if (!fallback) setFallback(true);
      }
    );

    return () => unsub();
  }, [classroomId, fallback]);

  // Fallback listener — no orderBy
  useEffect(() => {
    if (!fallback) return;
    const q = query(
      collection(db, "notifications"),
      where("classId", "==", classroomId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const sorted = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<ActivityItem, "id">),
        }))
        .sort((a, b) => {
          const ta = a.createdAt?.toMillis() ?? 0;
          const tb = b.createdAt?.toMillis() ?? 0;
          return tb - ta;
        });
      setItems(sorted);
    });
    return () => unsub();
  }, [classroomId, fallback]);

  return (
    <div className="glass rounded-2xl p-5">
      {/* Section header */}
      <div className="mb-5 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-blue/15">
          <Activity className="h-4 w-4 text-accent-blue" />
        </div>
        <h3 className="font-[var(--font-outfit)] text-lg font-bold text-white">
          Recent Activity
        </h3>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-white/25">
          No activity yet — upload notes, publish quizzes, or schedule sessions
          to see them here.
        </p>
      ) : (
        <div className="relative ml-3 border-l-2 border-white/10 pl-6">
          {items.slice(0, 20).map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative mb-5 last:mb-0"
            >
              {/* Glowing dot on the timeline */}
              <span
                className={`absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full ${dotColor(item.type)}`}
              />

              {/* Content */}
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-white/30">{typeIcon(item.type)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-white/80">
                    {item.message}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/30">
                    {item.actorName} &middot; {timeAgo(item.createdAt)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
