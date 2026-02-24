"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
import { upload } from "@vercel/blob/client";
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
  Upload,
  CloudUpload,
  Download,
  Image as ImageIcon,
  File,
} from "lucide-react";
import { createNotification } from "@/lib/notifications";

/* ── Interfaces ──────────────────────────────────────────────────────── */

interface Note {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorUid: string;
  authorRole: string;
  createdAt: { seconds: number } | null;
}

interface FileNote {
  id: string;
  fileName: string;
  fileType: "pdf" | "image";
  downloadUrl: string;
  storagePath: string;
  uploadedBy: string;
  uploadedByUid: string;
  timestamp: { seconds: number } | null;
}

interface NotesTabProps {
  classroomId: string;
  classroomName?: string;
  onGenerateQuiz?: (noteContent: string, noteTitle: string) => void;
}

/* ── Accepted MIME types ───────────────────────────────────────────── */
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
];
const ACCEPTED_EXT = ".pdf,.png,.jpg,.jpeg";

function classifyFile(mime: string): "pdf" | "image" {
  return mime === "application/pdf" ? "pdf" : "image";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function NotesTab({ classroomId, classroomName, onGenerateQuiz }: NotesTabProps) {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";

  /* ── Text notes state ────────────────────────────────────────────── */
  const [notes, setNotes] = useState<Note[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, string>>({});

  /* ── File notes state ────────────────────────────────────────────── */
  const [fileNotes, setFileNotes] = useState<FileNote[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── View toggle ─────────────────────────────────────────────────── */
  const [view, setView] = useState<"text" | "files">("files");

  /* ── Firestore listeners ─────────────────────────────────────────── */
  useEffect(() => {
    // Text notes
    const qNotes = query(
      collection(db, "classrooms", classroomId, "notes"),
      orderBy("createdAt", "desc")
    );
    const unsubNotes = onSnapshot(qNotes, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note)));
    });

    // File notes
    const qFiles = query(
      collection(db, "classrooms", classroomId, "fileNotes"),
      orderBy("timestamp", "desc")
    );
    const unsubFiles = onSnapshot(
      qFiles,
      (snap) => {
        setFileNotes(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as FileNote))
        );
      },
      () => {
        // Fallback — no composite index
        const qFallback = query(
          collection(db, "classrooms", classroomId, "fileNotes")
        );
        onSnapshot(qFallback, (snap) => {
          const sorted = snap.docs
            .map((d) => ({ id: d.id, ...d.data() } as FileNote))
            .sort((a, b) => {
              const ta = a.timestamp?.seconds ?? 0;
              const tb = b.timestamp?.seconds ?? 0;
              return tb - ta;
            });
          setFileNotes(sorted);
        });
      }
    );

    return () => {
      unsubNotes();
      unsubFiles();
    };
  }, [classroomId]);

  /* ── File upload handler (Vercel Blob) ──────────────────────────── */
  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!user || !profile) return;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setUploadError("Only PDF, PNG, and JPEG files are accepted.");
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        setUploadError("File size must be under 25 MB.");
        return;
      }

      setUploading(true);
      setUploadProgress(0);
      setUploadError(null);

      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          onUploadProgress: (p) => {
            setUploadProgress(Math.round(p.percentage));
          },
        });

        // Save metadata to Firestore
        await addDoc(
          collection(db, "classrooms", classroomId, "fileNotes"),
          {
            fileName: file.name,
            fileType: classifyFile(file.type),
            downloadUrl: blob.url,
            storagePath: blob.url, // blob URL acts as the reference
            uploadedBy: profile.fullName,
            uploadedByUid: user.uid,
            timestamp: serverTimestamp(),
          }
        );

        // Fire notification
        createNotification({
          classId: classroomId,
          className: classroomName || "",
          type: "NOTE_UPLOAD",
          message: `${profile.fullName} uploaded a file: "${file.name}"`,
          actorName: profile.fullName,
          actorUid: user.uid,
        });
      } catch (err) {
        console.error("Upload error:", err);
        const msg = (err as Error).message || "Unknown error";
        setUploadError(`Upload failed: ${msg}`);
      } finally {
        setUploading(false);
        setUploadProgress(0);
      }
    },
    [user, profile, classroomId, classroomName]
  );

  /* ── Drag & drop handlers ────────────────────────────────────────── */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };
  const handleDragLeave = () => setDragOver(false);

  /* ── Delete file note ────────────────────────────────────────────── */
  const handleDeleteFile = async (fn: FileNote) => {
    try {
      // Delete blob via server API
      if (fn.storagePath?.startsWith("http")) {
        await fetch("/api/upload/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fn.storagePath }),
        }).catch(() => {});
      }
      // Delete Firestore doc
      await deleteDoc(
        doc(db, "classrooms", classroomId, "fileNotes", fn.id)
      );
    } catch (err) {
      console.error("Error deleting file note:", err);
    }
  };

  /* ── Text note CRUD (unchanged) ──────────────────────────────────── */
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

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="mx-auto max-w-5xl p-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {/* ── Header with view toggle ──────────────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
              <FileText className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
                Notes
              </h2>
              <p className="text-sm text-white/40">
                {notes.length} text note{notes.length !== 1 ? "s" : ""} &middot;{" "}
                {fileNotes.length} file{fileNotes.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex rounded-xl border border-white/10 bg-white/[0.04] p-1">
              <button
                onClick={() => setView("files")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  view === "files"
                    ? "bg-accent-blue/20 text-accent-blue"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <Upload className="mr-1.5 inline h-3.5 w-3.5" />
                Files
              </button>
              <button
                onClick={() => setView("text")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  view === "text"
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                <FileText className="mr-1.5 inline h-3.5 w-3.5" />
                Text Notes
              </button>
            </div>

            {view === "text" && (
              <motion.button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-blue/25"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {showCreate ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {showCreate ? "Cancel" : "Add Note"}
              </motion.button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            FILES VIEW
        ════════════════════════════════════════════════════════════ */}
        {view === "files" && (
          <>
            {/* Teacher-only upload dropzone */}
            {isTeacher && (
              <div className="mb-6">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXT}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />

                <motion.div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center backdrop-blur-md transition-all ${
                    dragOver
                      ? "border-accent-blue bg-accent-blue/10"
                      : "border-white/20 bg-white/[0.05] hover:border-accent-blue/50 hover:bg-white/[0.07]"
                  } ${uploading ? "pointer-events-none" : ""}`}
                  whileHover={!uploading ? { scale: 1.005 } : {}}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
                      <p className="text-sm font-medium text-white/60">
                        Uploading… {uploadProgress}%
                      </p>
                      {/* Progress bar */}
                      <div className="mx-auto h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
                        <motion.div
                          className="h-full rounded-full bg-accent-blue"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <CloudUpload
                        className={`h-10 w-10 transition-colors ${
                          dragOver ? "text-accent-blue" : "text-white/20"
                        }`}
                      />
                      <p className="text-sm font-medium text-white/50">
                        Drag &amp; drop or{" "}
                        <span className="text-accent-blue">click to upload</span>{" "}
                        PDFs or Images
                      </p>
                      <p className="text-[11px] text-white/25">
                        .pdf, .png, .jpg, .jpeg &middot; max 25 MB
                      </p>
                    </div>
                  )}
                </motion.div>

                {/* Upload error banner */}
                <AnimatePresence>
                  {uploadError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-3 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3"
                    >
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-red-300">{uploadError}</p>
                      </div>
                      <button
                        onClick={() => setUploadError(null)}
                        className="shrink-0 text-red-400/60 hover:text-red-300"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* File notes grid */}
            {fileNotes.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fileNotes.map((fn, i) => (
                  <motion.div
                    key={fn.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass group relative flex flex-col rounded-2xl p-5 transition-colors hover:bg-white/[0.08]"
                  >
                    {/* Delete button (teacher or uploader) */}
                    {(fn.uploadedByUid === user?.uid || isTeacher) && (
                      <motion.button
                        onClick={() => handleDeleteFile(fn)}
                        className="absolute right-3 top-3 rounded-lg p-1.5 opacity-0 transition-opacity hover:bg-white/10 group-hover:opacity-100"
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-white/30 hover:text-red-400" />
                      </motion.button>
                    )}

                    {/* File type icon */}
                    <div
                      className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${
                        fn.fileType === "pdf"
                          ? "bg-red-500/15 text-red-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {fn.fileType === "pdf" ? (
                        <File className="h-6 w-6" />
                      ) : (
                        <ImageIcon className="h-6 w-6" />
                      )}
                    </div>

                    {/* File name */}
                    <h4 className="mb-1 truncate font-[var(--font-outfit)] text-sm font-bold text-white" title={fn.fileName}>
                      {fn.fileName}
                    </h4>

                    {/* Meta */}
                    <div className="mb-4 flex items-center gap-2 text-[11px] text-white/30">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {fn.uploadedBy}
                      </span>
                      <span>&middot;</span>
                      <span>{formatDate(fn.timestamp)}</span>
                    </div>

                    {/* Download button */}
                    <a
                      href={fn.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-accent-blue/15 px-4 py-2 text-xs font-semibold text-accent-blue transition-colors hover:bg-accent-blue/25"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center text-white/30">
                <CloudUpload className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>No files uploaded yet.</p>
                {isTeacher && (
                  <p className="mt-1 text-xs text-white/20">
                    Use the dropzone above to upload PDFs or images.
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════════════════════════
            TEXT NOTES VIEW (original)
        ════════════════════════════════════════════════════════════ */}
        {view === "text" && (
          <>
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
                            {summarizing === note.id
                              ? "Summarizing..."
                              : summaries[note.id]
                                ? "Re-summarize"
                                : "AI Summarize"}
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
          </>
        )}
      </motion.div>
    </div>
  );
}
