"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateChat } from "@/lib/gemini";
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";

/* ─── Types ─── */
interface Attachment {
  file: File;
  type: "image" | "pdf";
  preview?: string; // data-url for image preview
  base64?: string; // raw base64 (no prefix) for images
  mimeType?: string;
  pdfText?: string; // extracted text for PDFs
}

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
  attachment?: { name: string; type: "image" | "pdf"; preview?: string };
}

/* ─── Helpers ─── */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip the data:...;base64, prefix
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

  const res = await fetch("/api/ai/parse-pdf", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "PDF parsing failed" }));
    throw new Error(err.error || "Failed to extract PDF text");
  }

  const data = await res.json();
  if (!data.text || data.text.trim().length === 0) {
    throw new Error("PDF appears to be empty or image-only (no extractable text).");
  }
  return data.text;
}

/* ─── Component ─── */
export default function AIChatTab() {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [processingFile, setProcessingFile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
        const [base64, preview] = await Promise.all([
          fileToBase64(file),
          fileToDataUrl(file),
        ]);
        setAttachment({
          file,
          type: "image",
          preview,
          base64,
          mimeType: file.type,
        });
      } else {
        const pdfText = await extractPdfText(file);
        setAttachment({
          file,
          type: "pdf",
          pdfText,
        });
      }
    } catch (err) {
      console.error("File processing error:", err);
      const errMsg = err instanceof Error ? err.message : "Failed to process file";
      alert(errMsg);
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

    const userContent = input.trim() || (attachment ? `[Uploaded ${attachment.type === "image" ? "an image" : "a PDF"}: ${attachment.file.name}]` : "");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userContent,
      timestamp: new Date(),
      attachment: attachment
        ? {
            name: attachment.file.name,
            type: attachment.type,
            preview: attachment.preview,
          }
        : undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Capture attachment data before clearing
    const currentAttachment = attachment;
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    try {
      // Build conversation messages for API
      const conversationMessages = [...messages, userMsg].slice(-10).map((m) => ({
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
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error("AI Chat error:", err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content:
          "Sorry, I encountered an error. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
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

  const clearChat = () => {
    setMessages([]);
    removeAttachment();
  };

  const copyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* ─── Drag & drop ─── */
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  return (
    <div
      className="relative flex h-full flex-col p-6"
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
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
              <p className="text-sm font-medium text-accent-blue">
                Drop image or PDF here
              </p>
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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15">
              <Brain className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h2 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
                AI Learning Lab
              </h2>
              <p className="text-sm text-white/40">
                Multimodal AI Tutor · Images & PDFs supported
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <motion.button
              onClick={clearChat}
              className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/30 hover:text-white/60"
              whileTap={{ scale: 0.95 }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </motion.button>
          )}
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

                {/* Capability badges */}
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
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
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
                    {/* Attachment preview in message */}
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
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
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
                    <img
                      src={attachment.preview}
                      alt="Preview"
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10">
                      <FileText className="h-5 w-5 text-purple-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white/70">
                      {attachment.file.name}
                    </p>
                    <p className="text-xs text-white/30">
                      {attachment.type === "image" ? "Image" : "PDF"} ·{" "}
                      {(attachment.file.size / 1024).toFixed(0)} KB
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
          {/* Hidden file input */}
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

          {/* Paperclip button */}
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

          {/* Text input */}
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

          {/* Send button */}
          <motion.button
            onClick={handleSend}
            disabled={(!input.trim() && !attachment) || loading}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-blue text-white shadow-lg shadow-accent-blue/25 disabled:opacity-40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
