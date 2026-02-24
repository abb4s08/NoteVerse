"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateChat } from "@/lib/gemini";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Brain,
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  Trash2,
  Copy,
  Check,
  Paperclip,
  X,
  FileText,
  ImageIcon,
  Plus,
  MessageSquare,
  MoreVertical,
  Pencil,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

/* ─── Types ─── */
interface Attachment {
  file: File;
  type: "image" | "pdf";
  preview?: string;
  base64?: string;
  mimeType?: string;
  pdfText?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  attachment?: { name: string; type: "image" | "pdf"; preview?: string };
}

interface StoredMessage {
  role: "user" | "ai";
  content: string;
  timestamp: number;
  attachment?: { name: string; type: "image" | "pdf" };
}

interface Conversation {
  id: string;
  title: string;
  userId: string;
  userName: string;
  messages: StoredMessage[];
  createdAt: { seconds: number } | null;
  updatedAt: { seconds: number } | null;
}

/* ─── Helpers ─── */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function extractPdfText(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/ai/parse-pdf", { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "PDF parsing failed" }));
    throw new Error(err.error || "Failed to extract PDF text");
  }
  const data = await res.json();
  if (!data.text || data.text.trim().length === 0) {
    throw new Error("PDF appears to be empty or image-only.");
  }
  return data.text;
}

function generateTitle(content: string): string {
  const cleaned = content.replace(/\[Uploaded.*?\]/g, "").trim();
  if (!cleaned) return "New Chat";
  return cleaned.length > 40 ? cleaned.slice(0, 40) + "…" : cleaned;
}

function timeAgo(seconds: number): string {
  const now = Date.now() / 1000;
  const diff = now - seconds;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ─── Props ─── */
interface AIChatTabProps {
  classroomId?: string;
}

/* ─── Component ─── */
export default function AIChatTab({ classroomId }: AIChatTabProps) {
  const { user, profile } = useAuth();

  // Conversations state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Rename / menu state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const collectionPath = classroomId
    ? `classrooms/${classroomId}/aiChats`
    : "globalAiChats";

  /* ─── Load conversations from Firestore ─── */
  useEffect(() => {
    if (!user) return;
    // Only filter by userId — sort client-side to avoid needing a composite index
    const q = query(
      collection(db, collectionPath),
      where("userId", "==", user.uid)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const convos = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Conversation))
          .sort((a, b) => {
            const aTime = a.updatedAt?.seconds ?? 0;
            const bTime = b.updatedAt?.seconds ?? 0;
            return bTime - aTime;
          });
        setConversations(convos);
      },
      (err) => {
        console.error("Firestore listener error:", err);
      }
    );
    return () => unsub();
  }, [user, collectionPath]);

  /* ─── Load active conversation messages ─── */
  useEffect(() => {
    if (!activeConvoId) {
      setMessages([]);
      return;
    }
    const convo = conversations.find((c) => c.id === activeConvoId);
    if (!convo) {
      setMessages([]);
      return;
    }
    setMessages(
      (convo.messages || []).map((m, i) => ({
        id: `${activeConvoId}-${i}`,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp),
        attachment: m.attachment,
      }))
    );
  }, [activeConvoId, conversations]);

  /* ─── Auto scroll ─── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ─── Focus rename input ─── */
  useEffect(() => {
    if (renamingId) renameInputRef.current?.focus();
  }, [renamingId]);

  /* ─── Close menu on outside click ─── */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ─── Conversation CRUD ─── */
  const createNewChat = () => {
    setActiveConvoId(null);
    setMessages([]);
    setInput("");
    removeAttachment();
  };

  const openConversation = (id: string) => {
    setActiveConvoId(id);
    setMenuOpenId(null);
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const deleteConversation = async (id: string) => {
    try {
      await deleteDoc(doc(db, collectionPath, id));
      if (activeConvoId === id) {
        setActiveConvoId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
    setMenuOpenId(null);
  };

  const startRename = (convo: Conversation) => {
    setRenamingId(convo.id);
    setRenameValue(convo.title);
    setMenuOpenId(null);
  };

  const confirmRename = async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await updateDoc(doc(db, collectionPath, renamingId), {
        title: renameValue.trim(),
      });
    } catch (err) {
      console.error("Rename error:", err);
    }
    setRenamingId(null);
  };

  /* ─── Save messages to Firestore ─── */
  const saveMessages = async (
    convoId: string | null,
    allMessages: ChatMessage[],
    title?: string
  ): Promise<string> => {
    const stored = allMessages.map((m) => {
      const msg: Record<string, unknown> = {
        role: m.role,
        content: m.content,
        timestamp: m.timestamp.getTime(),
      };
      if (m.attachment) {
        msg.attachment = { name: m.attachment.name, type: m.attachment.type };
      }
      return msg;
    });

    if (convoId) {
      await updateDoc(doc(db, collectionPath, convoId), {
        messages: stored,
        updatedAt: serverTimestamp(),
      });
      return convoId;
    } else {
      const docRef = await addDoc(collection(db, collectionPath), {
        title: title || "New Chat",
        userId: user!.uid,
        userName: profile?.fullName || "Unknown",
        messages: stored,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    }
  };

  /* ─── File handling ─── */
  const handleFileSelect = useCallback(async (file: File) => {
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      alert("Only images (PNG, JPEG, WebP) and PDFs are supported.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("File must be under 20 MB.");
      return;
    }
    setProcessingFile(true);
    try {
      if (isImage) {
        const [base64, preview] = await Promise.all([fileToBase64(file), fileToDataUrl(file)]);
        setAttachment({ file, type: "image", preview, base64, mimeType: file.type });
      } else {
        const pdfText = await extractPdfText(file);
        setAttachment({ file, type: "pdf", pdfText });
      }
    } catch (err) {
      console.error("File processing error:", err);
      alert(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setProcessingFile(false);
    }
  }, []);

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  /* ─── Send message ─── */
  const handleSend = async () => {
    if ((!input.trim() && !attachment) || loading) return;

    const userContent =
      input.trim() ||
      (attachment ? `[Uploaded ${attachment.type === "image" ? "an image" : "a PDF"}: ${attachment.file.name}]` : "");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      timestamp: new Date(),
      attachment: attachment
        ? { name: attachment.file.name, type: attachment.type, preview: attachment.preview }
        : undefined,
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    const currentAttachment = attachment;
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      const conversationMessages = updatedMessages.slice(-10).map((m) => ({
        role: m.role === "user" ? ("user" as const) : ("assistant" as const),
        content: m.content,
      }));

      const text = await generateChat({
        messages: conversationMessages,
        imageBase64: currentAttachment?.base64,
        imageMimeType: currentAttachment?.mimeType,
        pdfText: currentAttachment?.pdfText,
      });

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: text,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      // Save to Firestore
      const title = !activeConvoId ? generateTitle(userContent) : undefined;
      const savedId = await saveMessages(activeConvoId, finalMessages, title);
      if (!activeConvoId) {
        setActiveConvoId(savedId);
      }
    } catch (err) {
      console.error("AI Chat error:", err);
      const errMessage = err instanceof Error ? err.message : "Unknown error";
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: `⚠️ Error: ${errMessage}`,
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessages, errorMsg];
      setMessages(finalMessages);

      try {
        const title = !activeConvoId ? generateTitle(userContent) : undefined;
        const savedId = await saveMessages(activeConvoId, finalMessages, title);
        if (!activeConvoId) setActiveConvoId(savedId);
      } catch (saveErr) {
        console.error("Failed to save error message to Firestore:", saveErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  /* ─── Filtered conversations ─── */
  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConvo = conversations.find((c) => c.id === activeConvoId);

  /* ─── Render ─── */
  return (
    <div className="flex h-full overflow-hidden">
      {/* ─── Sidebar ─── */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col border-r border-white/5 bg-white/[0.02]"
            style={{ minWidth: 0 }}
          >
            {/* Sidebar header */}
            <div className="flex items-center justify-between border-b border-white/5 px-3 py-3">
              <h3 className="text-sm font-semibold text-white/50">Chat History</h3>
              <div className="flex items-center gap-1">
                <motion.button
                  onClick={createNewChat}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                  whileTap={{ scale: 0.9 }}
                  title="New Chat"
                >
                  <Plus className="h-4 w-4" />
                </motion.button>
                <motion.button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                  whileTap={{ scale: 0.9 }}
                  title="Close sidebar"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </motion.button>
              </div>
            </div>

            {/* Search */}
            <div className="px-3 py-2">
              <div className="flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-white/20" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats..."
                  className="w-full bg-transparent text-xs text-white placeholder-white/20 outline-none"
                />
              </div>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto px-2 py-1 custom-scrollbar">
              {filteredConversations.length === 0 ? (
                <div className="py-8 text-center">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8 text-white/10" />
                  <p className="text-xs text-white/20">
                    {searchQuery ? "No chats found" : "No conversations yet"}
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredConversations.map((convo) => (
                    <div key={convo.id} className="group relative">
                      {renamingId === convo.id ? (
                        <div className="flex items-center gap-1 rounded-lg bg-white/10 px-2 py-2">
                          <input
                            ref={renameInputRef}
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmRename();
                              if (e.key === "Escape") setRenamingId(null);
                            }}
                            onBlur={confirmRename}
                            className="flex-1 bg-transparent text-xs text-white outline-none"
                            maxLength={60}
                          />
                          <button
                            onClick={confirmRename}
                            className="rounded p-1 text-emerald-400 hover:bg-white/10"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openConversation(convo.id)}
                          className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition-all ${
                            activeConvoId === convo.id
                              ? "bg-accent-blue/15 text-white"
                              : "text-white/50 hover:bg-white/5 hover:text-white/70"
                          }`}
                        >
                          <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium">{convo.title}</p>
                            <p className="text-[10px] text-white/25">
                              {convo.messages?.length || 0} msgs
                              {convo.updatedAt ? ` · ${timeAgo(convo.updatedAt.seconds)}` : ""}
                            </p>
                          </div>
                          <div
                            ref={menuOpenId === convo.id ? menuRef : undefined}
                            className="relative"
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(menuOpenId === convo.id ? null : convo.id);
                              }}
                              className="rounded p-1 text-white/20 opacity-0 transition-all hover:bg-white/10 hover:text-white/50 group-hover:opacity-100"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </button>

                            {/* Context menu */}
                            <AnimatePresence>
                              {menuOpenId === convo.id && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className="absolute right-0 top-7 z-50 w-36 overflow-hidden rounded-xl border border-white/10 bg-[#1a1c2e] shadow-xl"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startRename(convo);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Rename
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteConversation(convo.id);
                                    }}
                                    className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400/70 transition-colors hover:bg-red-500/10 hover:text-red-400"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                    Delete
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar footer */}
            <div className="border-t border-white/5 px-3 py-2">
              <p className="text-center text-[10px] text-white/15">
                {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Main Chat Area ─── */}
      <div
        className="relative flex flex-1 flex-col p-6"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {dragOver && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-accent-blue/50 bg-accent-blue/5 backdrop-blur-sm"
            >
              <div className="text-center">
                <Paperclip className="mx-auto mb-2 h-8 w-8 text-accent-blue" />
                <p className="text-sm font-medium text-accent-blue">Drop image or PDF here</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex h-full flex-col"
        >
          {/* Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <motion.button
                  onClick={() => setSidebarOpen(true)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-white/30 transition-colors hover:bg-white/10 hover:text-white/60"
                  whileTap={{ scale: 0.9 }}
                  title="Open sidebar"
                >
                  <PanelLeftOpen className="h-5 w-5" />
                </motion.button>
              )}
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
                <Brain className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
                  AI Learning Lab
                </h2>
                <p className="text-sm text-white/40">
                  {activeConvo
                    ? activeConvo.title
                    : "Multimodal AI Tutor · Images & PDFs supported"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={createNewChat}
                className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/30 hover:text-white/60"
                whileTap={{ scale: 0.95 }}
                title="New Chat"
              >
                <Plus className="h-3.5 w-3.5" />
                New Chat
              </motion.button>
            </div>
          </div>

          {/* Messages area */}
          <div
            className="glass flex-1 overflow-y-auto rounded-2xl p-5"
            style={{ minHeight: 0, maxHeight: "calc(100vh - 340px)" }}
          >
            {messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-blue/10"
                  >
                    <Sparkles className="h-8 w-8 text-accent-blue" />
                  </motion.div>
                  <h3 className="font-[var(--font-outfit)] mb-2 text-lg font-bold text-white">
                    Hello, {profile?.fullName?.split(" ")[0] || "there"}!
                  </h3>
                  <p className="mb-6 max-w-sm text-sm text-white/40">
                    I&apos;m your AI tutor. Ask questions, upload images of
                    whiteboards or diagrams, or share PDFs for analysis.
                  </p>

                  <div className="mb-6 flex flex-wrap justify-center gap-2">
                    {[
                      { icon: ImageIcon, label: "Image Analysis", color: "text-emerald-400 bg-emerald-400/10" },
                      { icon: FileText, label: "PDF Reading", color: "text-purple-400 bg-purple-400/10" },
                      { icon: Brain, label: "Smart Tutoring", color: "text-blue-400 bg-blue-400/10" },
                    ].map(({ icon: Icon, label, color }) => (
                      <span
                        key={label}
                        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${color}`}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "Explain this diagram...",
                      "Summarize my notes",
                      "Help me study for my exam",
                      "Analyze this code screenshot",
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInput(suggestion)}
                        className="glass rounded-lg px-3 py-1.5 text-xs text-white/40 transition-colors hover:text-white/70"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "ai" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue/15">
                        <Bot className="h-4 w-4 text-accent-blue" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-accent-blue/20 text-white"
                          : "bg-white/5 text-white/80"
                      }`}
                    >
                      {msg.attachment && (
                        <div className="mb-2">
                          {msg.attachment.type === "image" && msg.attachment.preview ? (
                            <img
                              src={msg.attachment.preview}
                              alt={msg.attachment.name}
                              className="max-h-48 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2">
                              <FileText className="h-4 w-4 text-purple-400" />
                              <span className="truncate text-xs text-white/50">
                                {msg.attachment.name}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {msg.role === "ai" ? (
                        <div>
                          <MarkdownRenderer content={msg.content} />
                          <div className="mt-2 flex justify-end border-t border-white/5 pt-1.5">
                            <button
                              onClick={() => copyMessage(msg.id, msg.content)}
                              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-white/25 transition-colors hover:text-white/50"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="h-3 w-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {msg.content}
                        </p>
                      )}
                    </div>
                    {msg.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-gold/15">
                        <User className="h-4 w-4 text-accent-gold" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue/15">
                      <Bot className="h-4 w-4 text-accent-blue" />
                    </div>
                    <div className="rounded-2xl bg-white/5 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-white/40">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing{attachment ? " your file" : ""}...
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Attachment preview bar */}
          <AnimatePresence>
            {(attachment || processingFile) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-3 flex items-center gap-3 rounded-xl bg-white/5 px-4 py-2.5"
              >
                {processingFile ? (
                  <div className="flex items-center gap-2 text-sm text-white/40">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing file...
                  </div>
                ) : attachment ? (
                  <>
                    {attachment.type === "image" && attachment.preview ? (
                      <img src={attachment.preview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                        <FileText className="h-5 w-5 text-purple-400" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white/70">{attachment.file.name}</p>
                      <p className="text-xs text-white/30">
                        {attachment.type === "image" ? "Image" : "PDF"} · {(attachment.file.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      onClick={removeAttachment}
                      className="rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area */}
          <div className="mt-3 flex items-end gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
              className="hidden"
            />

            <motion.button
              onClick={() => fileInputRef.current?.click()}
              disabled={processingFile || loading}
              className="glass flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/30 transition-colors hover:text-white/60 disabled:opacity-40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Attach image or PDF"
            >
              <Paperclip className="h-4 w-4" />
            </motion.button>

            <div className="glass flex-1 rounded-2xl p-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  attachment
                    ? "Ask about the uploaded file..."
                    : "Ask anything, or attach an image/PDF..."
                }
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
                style={{ maxHeight: "120px" }}
              />
            </div>

            <motion.button
              onClick={handleSend}
              disabled={(!input.trim() && !attachment) || loading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-blue text-white shadow-lg shadow-accent-blue/25 disabled:opacity-40"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
