"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, Send, Loader2 } from "lucide-react";

interface Message {
  id: string;
  text: string;
  senderName: string;
  senderUid: string;
  senderRole: string;
  createdAt: { seconds: number } | null;
}

interface DiscussionTabProps {
  classroomId: string;
}

export default function DiscussionTab({ classroomId }: DiscussionTabProps) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "classrooms", classroomId, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Message))
      );
    });
    return () => unsub();
  }, [classroomId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !profile || !newMsg.trim()) return;
    setSending(true);
    try {
      await addDoc(
        collection(db, "classrooms", classroomId, "messages"),
        {
          text: newMsg.trim(),
          senderName: profile.fullName,
          senderUid: user.uid,
          senderRole: profile.role,
          createdAt: serverTimestamp(),
        }
      );
      setNewMsg("");
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: { seconds: number } | null) => {
    if (!timestamp) return "";
    return new Date(timestamp.seconds * 1000).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex h-full flex-col p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex h-full flex-col"
      >
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15">
            <MessageSquare className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
              Discussion
            </h2>
            <p className="text-sm text-white/40">Real-time classroom chat</p>
          </div>
        </div>

        {/* Messages area */}
        <div
          ref={chatRef}
          className="glass flex-1 overflow-y-auto rounded-2xl p-4"
          style={{ minHeight: 0, maxHeight: "calc(100vh - 320px)" }}
        >
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center text-white/20">
              <div className="text-center">
                <MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm">No messages yet. Start the conversation!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => {
                const isOwn = msg.senderUid === user?.uid;
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isOwn
                          ? "bg-accent-blue/20 text-white"
                          : "bg-white/5 text-white/80"
                      }`}
                    >
                      {!isOwn && (
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-semibold text-white/60">
                            {msg.senderName}
                          </span>
                          <span
                            className={`rounded px-1 text-[10px] font-medium ${
                              msg.senderRole === "teacher"
                                ? "bg-accent-gold/10 text-accent-gold"
                                : "bg-accent-blue/10 text-accent-blue"
                            }`}
                          >
                            {msg.senderRole}
                          </span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.text}
                      </p>
                      <p
                        className={`mt-1 text-right text-[10px] ${
                          isOwn ? "text-white/30" : "text-white/20"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="mt-4 flex items-end gap-3">
          <div className="glass flex-1 rounded-2xl p-1">
            <textarea
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full resize-none bg-transparent px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none"
              style={{ maxHeight: "120px" }}
            />
          </div>
          <motion.button
            onClick={handleSend}
            disabled={!newMsg.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-blue text-white shadow-lg shadow-accent-blue/25 disabled:opacity-40"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {sending ? (
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
