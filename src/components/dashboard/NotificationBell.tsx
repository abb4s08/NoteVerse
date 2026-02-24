"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { NotificationType } from "@/lib/notifications";
import {
  Bell,
  FileText,
  Brain,
  Video,
  Layers,
  CalendarDays,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationDoc {
  id: string;
  classId: string;
  className: string;
  type: NotificationType;
  message: string;
  actorName: string;
  actorUid: string;
  createdAt: Timestamp | null;
}

const ICON_MAP: Record<NotificationType, React.ReactNode> = {
  NOTE_UPLOAD: <FileText className="h-4 w-4 text-blue-400" />,
  QUIZ_PUBLISHED: <Brain className="h-4 w-4 text-purple-400" />,
  LIVE_CLASS_STARTED: <Video className="h-4 w-4 text-red-400" />,
  FLASHCARD_DECK_CREATED: <Layers className="h-4 w-4 text-emerald-400" />,
  SESSION_SCHEDULED: <CalendarDays className="h-4 w-4 text-amber-400" />,
};

const LABEL_MAP: Record<NotificationType, string> = {
  NOTE_UPLOAD: "New Note",
  QUIZ_PUBLISHED: "Quiz Published",
  LIVE_CLASS_STARTED: "Live Class",
  FLASHCARD_DECK_CREATED: "New Deck",
  SESSION_SCHEDULED: "Session Scheduled",
};

function timeAgo(ts: Timestamp | null): string {
  if (!ts) return "just now";
  const now = Date.now();
  const diff = now - ts.toMillis();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface NotificationBellProps {
  classroomId: string;
}

export default function NotificationBell({ classroomId }: NotificationBellProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDoc[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotificationDoc | null>(null);
  const [lastSeenTs, setLastSeenTs] = useState<number>(0);
  const bellRef = useRef<HTMLDivElement>(null);
  const initialLoadDone = useRef(false);
  const prevIds = useRef<Set<string>>(new Set());

  // Load last-seen timestamp from localStorage
  useEffect(() => {
    const key = `noteverse_notif_seen_${classroomId}`;
    const stored = localStorage.getItem(key);
    if (stored) setLastSeenTs(parseInt(stored, 10));
  }, [classroomId]);

  // Real-time listener for notifications in this class
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "notifications"),
      where("classId", "==", classroomId),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map(
        (d) => ({ id: d.id, ...d.data() } as NotificationDoc)
      );
      setNotifications(docs);

      // Show toast for brand-new notification (not from current user)
      if (initialLoadDone.current) {
        for (const d of docs) {
          if (!prevIds.current.has(d.id) && d.actorUid !== user.uid) {
            setToast(d);
            setTimeout(() => setToast(null), 5000);
            break;
          }
        }
      }

      prevIds.current = new Set(docs.map((d) => d.id));
      initialLoadDone.current = true;
    });
    return () => unsub();
  }, [classroomId, user]);

  // Mark as seen when dropdown opens
  const handleOpen = useCallback(() => {
    setOpen((prev) => {
      if (!prev) {
        const now = Date.now();
        setLastSeenTs(now);
        localStorage.setItem(
          `noteverse_notif_seen_${classroomId}`,
          now.toString()
        );
      }
      return !prev;
    });
  }, [classroomId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Unread count: notifications newer than lastSeenTs, excluding own
  const unreadCount = notifications.filter((n) => {
    if (n.actorUid === user?.uid) return false;
    if (!n.createdAt) return true;
    return n.createdAt.toMillis() > lastSeenTs;
  }).length;

  // Filtered list (exclude own notifications)
  const visible = notifications.filter((n) => n.actorUid !== user?.uid);

  return (
    <>
      {/* Bell button + dropdown */}
      <div ref={bellRef} className="relative z-50">
        <button
          onClick={handleOpen}
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
            "bg-white/5 hover:bg-white/10 border border-white/10",
            open && "bg-white/15 border-white/20"
          )}
        >
          <Bell className="h-5 w-5 text-white/70" />
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-12 w-80 overflow-hidden rounded-2xl border border-white/10 bg-[#0f0f1a]/95 shadow-2xl backdrop-blur-xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <h3 className="text-sm font-semibold text-white/90">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-accent-blue/20 px-2 py-0.5 text-[10px] font-medium text-accent-blue">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {/* List */}
              <div className="max-h-80 overflow-y-auto">
                {visible.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-white/30">
                    <Bell className="mb-2 h-8 w-8" />
                    <p className="text-xs">No notifications yet</p>
                  </div>
                ) : (
                  visible.map((n) => {
                    const isUnread =
                      n.createdAt && n.createdAt.toMillis() > lastSeenTs;
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "flex gap-3 border-b border-white/5 px-4 py-3 transition-colors",
                          isUnread ? "bg-accent-blue/5" : "bg-transparent"
                        )}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                          {ICON_MAP[n.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                              {LABEL_MAP[n.type]}
                            </span>
                            {isUnread && (
                              <span className="h-1.5 w-1.5 rounded-full bg-accent-blue" />
                            )}
                          </div>
                          <p className="mt-0.5 text-xs leading-relaxed text-white/70 line-clamp-2">
                            {n.message}
                          </p>
                          <p className="mt-1 text-[10px] text-white/30">
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, x: 100, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-[100] flex max-w-sm items-start gap-3 rounded-2xl border border-white/10 bg-[#0f0f1a]/95 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
              {ICON_MAP[toast.type]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                {LABEL_MAP[toast.type]}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-white/80 line-clamp-2">
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="text-white/30 hover:text-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
