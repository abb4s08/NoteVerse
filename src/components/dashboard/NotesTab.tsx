"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateWithFallback } from "@/lib/gemini";
import { useAuth } from "@/contexts/AuthContext";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import {
  FileText,
  Plus,
  X,
  Loader2,
  Trash2,
  Clock,
  User,
  Sparkles,
  Zap,
  Brain,
} from "lucide-react";
import { createNotification } from "@/lib/notifications";

interface Note {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorUid: string;
  authorRole: string;
  createdAt: { seconds: number } | null;
}

interface NotesTabProps {
  classroomId: string;
  classroomName?: string;
  onGenerateQuiz?: (noteContent: string, noteTitle: string) => void;
}

export default function NotesTab({ classroomId, classroomName, onGenerateQuiz }: NotesTabProps) {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";
  const [notes, setNotes] = useState<Note[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query(
      collection(db, "classrooms", classroomId, "notes"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotes(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note))
      );
    });
    return () => unsub();
  }, [classroomId]);

  const handleCreate = async () => {
    if (!user || !profile || !title.trim() || !content.trim()) return;
    setLoading(true);
    try {
      await addDoc(collection(db, "classrooms", classroomId, "notes"), {
        title: title.trim(),
        content: content.trim(),
        authorName: profile.fullName,
        authorUid: user.uid,
        authorRole: profile.role,
        createdAt: serverTimestamp(),
      });

      // Notification: teacher uploaded a note
      if (profile.role === "teacher") {
        createNotification({
          classId: classroomId,
          className: classroomName || "",
          type: "NOTE_UPLOAD",
          message: `${profile.fullName} uploaded a new note: "${title.trim()}"`,
          actorName: profile.fullName,
          actorUid: user.uid,
        });
      }

      setTitle("");
      setContent("");
      setShowCreate(false);
    } catch (err) {
      console.error("Error creating note:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteDoc(doc(db, "classrooms", classroomId, "notes", noteId));
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  const formatDate = (timestamp: { seconds: number } | null) => {
    if (!timestamp) return "Just now";
    return new Date(timestamp.seconds * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSummarize = async (note: Note) => {
    if (summarizing) return;
    setSummarizing(note.id);
    try {
      const prompt = `You are NoteVerse AI. Summarize the following classroom note concisely. Use bullet points for key takeaways. Format with markdown.

**Title:** ${note.title}

**Content:**
${note.content}

Provide:
1. A 2-3 sentence overview
2. Key points as bullet list
3. Any important terms or definitions mentioned`;

      const text = await generateWithFallback(prompt);
      setSummaries((prev) => ({ ...prev, [note.id]: text }));
    } catch (err) {
      console.error("Summarization error:", err);
      setSummaries((prev) => ({
        ...prev,
        [note.id]: "⚠️ Failed to summarize. Check your API key or try again.",
      }));
    } finally {
      setSummarizing(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
                Notes
              </h2>
              <p className="text-sm text-white/40">
                {notes.length} note{notes.length !== 1 ? "s" : ""} shared
              </p>
            </div>
          </div>

          <motion.button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-blue/25"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {showCreate ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showCreate ? "Cancel" : "Add Note"}
          </motion.button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 overflow-hidden"
            >
              <div className="glass-strong rounded-2xl p-6">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-accent-blue/50"
                />
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note content here... (supports plain text)"
                  rows={8}
                  className="mb-4 w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white placeholder-white/25 outline-none focus:border-accent-blue/50"
                />
                <motion.button
                  onClick={handleCreate}
                  disabled={!title.trim() || !content.trim() || loading}
                  className="flex items-center gap-2 rounded-xl bg-accent-blue px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-blue/25 disabled:opacity-50"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Publish Note"
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes list */}
        <div className="space-y-3">
          {notes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass group cursor-pointer rounded-2xl p-5 transition-all hover:bg-white/8"
              onClick={() =>
                setExpandedNote(expandedNote === note.id ? null : note.id)
              }
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-[var(--font-outfit)] mb-1 text-base font-bold text-white">
                    {note.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {note.authorName}
                    </span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        note.authorRole === "teacher"
                          ? "bg-accent-gold/10 text-accent-gold"
                          : "bg-accent-blue/10 text-accent-blue"
                      }`}
                    >
                      {note.authorRole}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Delete (own notes or teacher can delete) */}
                {(note.authorUid === user?.uid ||
                  profile?.role === "teacher") && (
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(note.id);
                    }}
                    className="ml-2 opacity-0 transition-opacity group-hover:opacity-100"
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="h-4 w-4 text-white/20 hover:text-red-400" />
                  </motion.button>
                )}
              </div>

              {/* Expanded content */}
              <AnimatePresence>
                {expandedNote === note.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 border-t border-white/5 pt-4"
                  >
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/60">
                      {note.content}
                    </p>

                    {/* AI Action Buttons */}
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSummarize(note);
                        }}
                        disabled={summarizing === note.id}
                        className="flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-3 py-1.5 text-xs font-medium text-purple-300 transition-colors hover:bg-purple-500/20 disabled:opacity-50"
                        whileTap={{ scale: 0.95 }}
                      >
                        {summarizing === note.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        {summarizing === note.id ? "Summarizing..." : summaries[note.id] ? "Re-summarize" : "AI Summarize"}
                      </motion.button>

                      {isTeacher && onGenerateQuiz && (
                        <motion.button
                          onClick={(e) => {
                            e.stopPropagation();
                            onGenerateQuiz(note.content, note.title);
                          }}
                          className="flex items-center gap-1.5 rounded-lg bg-accent-gold/10 px-3 py-1.5 text-xs font-medium text-accent-gold transition-colors hover:bg-accent-gold/20"
                          whileTap={{ scale: 0.95 }}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          Generate Quiz
                        </motion.button>
                      )}
                    </div>

                    {/* AI Summary */}
                    <AnimatePresence>
                      {summaries[note.id] && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="mt-3 rounded-xl border border-purple-500/15 bg-purple-500/5 p-4"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Brain className="h-4 w-4 text-purple-400" />
                            <span className="text-xs font-semibold text-purple-300">
                              AI Summary
                            </span>
                          </div>
                          <MarkdownRenderer content={summaries[note.id]} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {notes.length === 0 && !showCreate && (
          <div className="py-16 text-center text-white/30">
            <FileText className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>No notes yet. Be the first to share!</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
