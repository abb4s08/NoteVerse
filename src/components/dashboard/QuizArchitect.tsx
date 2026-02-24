"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateWithFallback } from "@/lib/gemini";
import { useAuth } from "@/contexts/AuthContext";
import {
  Zap,
  Loader2,
  FileText,
  CheckCircle2,
  XCircle,
  Trophy,
  ChevronRight,
  RotateCcw,
  Medal,
  BarChart3,
  Clock,
  Upload,
  X,
  Image as ImageIcon,
  FileUp,
} from "lucide-react";
import { createNotification } from "@/lib/notifications";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  createdBy: string;
  createdByName: string;
  createdAt: { seconds: number } | null;
}

interface ScoreRecord {
  id: string;
  quizId: string;
  quizTitle: string;
  userId: string;
  userName: string;
  score: number;
  total: number;
  percentage: number;
  timeTakenSeconds?: number;
  createdAt: { seconds: number } | null;
}

/** Best-score per student for a specific quiz */
interface LeaderboardEntry {
  userId: string;
  userName: string;
  bestPercentage: number;
  bestScore: number;
  bestTotal: number;
  bestTime: number | null;
}

/** Per-quiz leaderboard group */
interface QuizLeaderboard {
  quizId: string;
  quizTitle: string;
  entries: LeaderboardEntry[];
}

interface QuizArchitectProps {
  classroomId: string;
  classroomName?: string;
  prefill?: { content: string; title: string } | null;
  onPrefillConsumed?: () => void;
}

export default function QuizArchitect({ classroomId, classroomName, prefill, onPrefillConsumed }: QuizArchitectProps) {
  const { user, profile } = useAuth();
  const isTeacher = profile?.role === "teacher";
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [generating, setGenerating] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [notesInput, setNotesInput] = useState("");
  const [questionCount, setQuestionCount] = useState(5);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz taking state
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [rawScores, setRawScores] = useState<ScoreRecord[]>([]);
  const [quizLeaderboards, setQuizLeaderboards] = useState<QuizLeaderboard[]>([]);
  const [expandedQuizLb, setExpandedQuizLb] = useState<Set<string>>(new Set());
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scoreSaved, setScoreSaved] = useState(false);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "classrooms", classroomId, "quizzes"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setQuizzes(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quiz)));
    });
    return () => unsub();
  }, [classroomId]);

  // Handle prefill from Notes tab "Generate Quiz" button
  useEffect(() => {
    if (prefill) {
      setTopicInput(prefill.title);
      setNotesInput(prefill.content);
      onPrefillConsumed?.();
    }
  }, [prefill, onPrefillConsumed]);

  // Leaderboard: listen to all scores, deduplicate per student
  useEffect(() => {
    const q = query(
      collection(db, "classrooms", classroomId, "quizScores"),
      orderBy("percentage", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const scores = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScoreRecord));
      setRawScores(scores);
    });
    return () => unsub();
  }, [classroomId]);

  // Deduplicate: best score per student PER QUIZ
  useEffect(() => {
    // Group scores by quizId
    const quizMap = new Map<string, { title: string; scores: ScoreRecord[] }>();
    for (const r of rawScores) {
      if (!quizMap.has(r.quizId)) {
        quizMap.set(r.quizId, { title: r.quizTitle, scores: [] });
      }
      quizMap.get(r.quizId)!.scores.push(r);
    }

    const boards: QuizLeaderboard[] = [];
    for (const [quizId, { title, scores }] of quizMap) {
      // Best attempt per student for this quiz
      const studentMap = new Map<string, LeaderboardEntry>();
      for (const s of scores) {
        const existing = studentMap.get(s.userId);
        if (
          !existing ||
          s.percentage > existing.bestPercentage ||
          (s.percentage === existing.bestPercentage &&
            s.timeTakenSeconds != null &&
            (existing.bestTime == null || s.timeTakenSeconds < existing.bestTime))
        ) {
          studentMap.set(s.userId, {
            userId: s.userId,
            userName: s.userName,
            bestPercentage: s.percentage,
            bestScore: s.score,
            bestTotal: s.total,
            bestTime: s.timeTakenSeconds ?? null,
          });
        }
      }
      const sorted = Array.from(studentMap.values()).sort((a, b) => {
        if (b.bestPercentage !== a.bestPercentage) return b.bestPercentage - a.bestPercentage;
        if (a.bestTime != null && b.bestTime != null) return a.bestTime - b.bestTime;
        return 0;
      });
      boards.push({ quizId, quizTitle: title, entries: sorted });
    }
    setQuizLeaderboards(boards);
  }, [rawScores]);

  // Timer: runs while quiz is active and results not shown
  useEffect(() => {
    if (activeQuiz && !showResults) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeQuiz, showResults]);

  const handleFileUpload = async (file: File) => {
    setFileError("");
    setUploadedFile(file);
    setFileProcessing(true);

    try {
      const isPDF = file.type === "application/pdf";
      const isImage = file.type.startsWith("image/");

      if (!isPDF && !isImage) {
        throw new Error("Please upload a PDF or image file (PNG, JPG, WEBP)");
      }

      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File too large. Maximum size is 10MB.");
      }

      if (isPDF) {
        // Parse PDF via server route
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/ai/parse-pdf", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed to parse PDF");
        const pdfText = (data.text || "").trim();
        if (!pdfText) throw new Error("Could not extract text from PDF. The file may be scanned/image-based.");
        setNotesInput((prev) => (prev ? prev + "\n\n" : "") + pdfText);
      } else if (isImage) {
        // Convert image to base64, send to AI to extract content
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("Failed to read image"));
          reader.readAsDataURL(file);
        });
        // Extract the base64 data part
        const base64Data = base64.split(",")[1];
        const mimeType = file.type;

        // Use the AI chat endpoint to extract text from the image
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Extract ALL text and content from this image. Return ONLY the raw text/content, no commentary or formatting instructions. If it contains handwritten notes, diagrams, or formulas, describe them accurately." }],
            imageBase64: base64Data,
            imageMimeType: mimeType,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed to extract text from image");
        const imageText = (data.response || "").trim();
        if (!imageText) throw new Error("Could not extract content from image.");
        setNotesInput((prev) => (prev ? prev + "\n\n" : "") + imageText);
      }
    } catch (err) {
      console.error("File upload error:", err);
      setFileError(err instanceof Error ? err.message : "Failed to process file");
      setUploadedFile(null);
    } finally {
      setFileProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!user || !profile || generating) return;
    if (!topicInput.trim() && !notesInput.trim()) return;
    setGenerating(true);

    try {
      const prompt = `Generate a quiz with exactly ${questionCount} multiple-choice questions based on the following:

${topicInput.trim() ? `Topic: ${topicInput.trim()}` : ""}
${notesInput.trim() ? `Notes/Content:\n${notesInput.trim()}` : ""}

Return ONLY a valid JSON array with this exact format (no markdown, no code blocks, just raw JSON):
[
  {
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctIndex": 0
  }
]

Rules:
- Exactly ${questionCount} questions
- Exactly 4 options each
- correctIndex is 0-3
- Questions should test understanding, not just recall
- Make questions progressively harder`;

      const text = await generateWithFallback(prompt);

      // Extract JSON from response
      let jsonStr = text;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) jsonStr = jsonMatch[0];

      const questions: QuizQuestion[] = JSON.parse(jsonStr);

      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error("Invalid quiz format");
      }

      // Save to Firestore
      await addDoc(collection(db, "classrooms", classroomId, "quizzes"), {
        title: topicInput.trim() || "Quiz from Notes",
        questions: questions.slice(0, questionCount),
        createdBy: user.uid,
        createdByName: profile.fullName,
        createdAt: serverTimestamp(),
      });

      // Notification: quiz published
      createNotification({
        classId: classroomId,
        className: classroomName || "",
        type: "QUIZ_PUBLISHED",
        message: `${profile.fullName} published a new quiz: "${topicInput.trim() || "Quiz from Notes"}"`,
        actorName: profile.fullName,
        actorUid: user.uid,
      });

      setTopicInput("");
      setNotesInput("");
    } catch (err) {
      console.error("Quiz generation error:", err);
      alert("Failed to generate quiz. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setCurrentQ(0);
    setSelectedAnswers(new Array(quiz.questions.length).fill(null));
    setShowResults(false);
    setScoreSaved(false);
    setElapsedSeconds(0);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const saveScore = async (quiz: Quiz, score: number, total: number) => {
    if (!user || !profile || scoreSaved) return;
    try {
      const percentage = Math.round((score / total) * 100);
      await addDoc(collection(db, "classrooms", classroomId, "quizScores"), {
        quizId: quiz.id,
        quizTitle: quiz.title,
        userId: user.uid,
        userName: profile.fullName,
        score,
        total,
        percentage,
        timeTakenSeconds: elapsedSeconds,
        createdAt: serverTimestamp(),
      });
      setScoreSaved(true);
    } catch (err) {
      console.error("Error saving score:", err);
    }
  };

  const selectAnswer = (answerIndex: number) => {
    const updated = [...selectedAnswers];
    updated[currentQ] = answerIndex;
    setSelectedAnswers(updated);
  };

  const getScore = () => {
    if (!activeQuiz) return 0;
    return activeQuiz.questions.reduce((score, q, i) => {
      return score + (selectedAnswers[i] === q.correctIndex ? 1 : 0);
    }, 0);
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

  // Active quiz view
  if (activeQuiz) {
    const question = activeQuiz.questions[currentQ];

    if (showResults) {
      const score = getScore();
      const total = activeQuiz.questions.length;
      const percentage = Math.round((score / total) * 100);

      // Auto-save score when results are first shown
      if (!scoreSaved) {
        saveScore(activeQuiz, score, total);
      }

      return (
        <div className="flex h-full items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-strong w-full max-w-md rounded-3xl p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${
                percentage >= 80
                  ? "bg-emerald-500/15"
                  : percentage >= 50
                  ? "bg-amber-500/15"
                  : "bg-red-500/15"
              }`}
            >
              <Trophy
                className={`h-10 w-10 ${
                  percentage >= 80
                    ? "text-emerald-400"
                    : percentage >= 50
                    ? "text-amber-400"
                    : "text-red-400"
                }`}
              />
            </motion.div>

            <h3 className="font-[var(--font-outfit)] mb-1 text-2xl font-bold text-white">
              {percentage >= 80
                ? "Excellent!"
                : percentage >= 50
                ? "Good Job!"
                : "Keep Studying!"}
            </h3>
            <p className="mb-2 text-white/40">
              You scored{" "}
              <span className="font-bold text-white">
                {score}/{total}
              </span>{" "}
              ({percentage}%)
            </p>
            <p className="mb-6 flex items-center justify-center gap-1 text-sm text-white/30">
              <Clock className="h-3.5 w-3.5" />
              Time: <span className="font-medium text-white/50">{formatTime(elapsedSeconds)}</span>
            </p>

            {/* Review answers */}
            <div className="mb-6 space-y-3 text-left">
              {activeQuiz.questions.map((q, i) => {
                const isCorrect = selectedAnswers[i] === q.correctIndex;
                return (
                  <div
                    key={i}
                    className={`rounded-xl border px-4 py-3 ${
                      isCorrect
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-red-500/20 bg-red-500/5"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                      )}
                      <div>
                        <p className="text-xs text-white/60">{q.question}</p>
                        {!isCorrect && (
                          <p className="mt-1 text-xs text-emerald-400">
                            Correct: {q.options[q.correctIndex]}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => startQuiz(activeQuiz)}
                className="glass flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium text-white/50 hover:text-white"
              >
                <RotateCcw className="h-4 w-4" />
                Retry
              </button>
              <motion.button
                onClick={() => setActiveQuiz(null)}
                className="flex-1 rounded-xl bg-accent-blue py-3 text-sm font-bold text-white"
                whileTap={{ scale: 0.98 }}
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="flex h-full items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Progress */}
          <div className="mb-6 flex items-center justify-between">
            <span className="text-sm text-white/40">
              Question {currentQ + 1} of {activeQuiz.questions.length}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-white/50">
                <Clock className="h-3.5 w-3.5" />
                {formatTime(elapsedSeconds)}
              </span>
              <button
                onClick={() => setActiveQuiz(null)}
                className="text-sm text-white/30 hover:text-white/60"
              >
                Exit Quiz
              </button>
            </div>
          </div>

          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full rounded-full bg-accent-blue"
              animate={{
                width: `${
                  ((currentQ + 1) / activeQuiz.questions.length) * 100
                }%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Question */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQ}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="glass-strong rounded-2xl p-8"
            >
              <h3 className="font-[var(--font-outfit)] mb-6 text-lg font-bold text-white">
                {question.question}
              </h3>

              <div className="space-y-3">
                {question.options.map((option, idx) => (
                  <motion.button
                    key={idx}
                    onClick={() => selectAnswer(idx)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-all ${
                      selectedAnswers[currentQ] === idx
                        ? "border-accent-blue/40 bg-accent-blue/15 text-white"
                        : "border-white/5 bg-white/5 text-white/60 hover:border-white/10 hover:bg-white/8"
                    }`}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-xs font-bold">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {option}
                  </motion.button>
                ))}
              </div>

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
                  disabled={currentQ === 0}
                  className="text-sm text-white/30 hover:text-white/60 disabled:opacity-30"
                >
                  Previous
                </button>
                <motion.button
                  onClick={() => {
                    if (currentQ < activeQuiz.questions.length - 1) {
                      setCurrentQ(currentQ + 1);
                    } else {
                      setShowResults(true);
                    }
                  }}
                  disabled={selectedAnswers[currentQ] === null}
                  className="flex items-center gap-1 rounded-xl bg-accent-blue px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
                  whileTap={{ scale: 0.98 }}
                >
                  {currentQ < activeQuiz.questions.length - 1
                    ? "Next"
                    : "Finish"}
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    );
  }

  // Quiz list / generator view
  return (
    <div className="mx-auto max-w-4xl p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15">
            <Zap className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
              Quiz Architect
            </h2>
            <p className="text-sm text-white/40">
              {isTeacher
                ? "Generate AI quizzes for your students"
                : "Take quizzes created by your teacher"}
            </p>
          </div>
        </div>

        {/* Teacher: Quiz generator */}
        {isTeacher && (
          <div className="glass-strong mb-8 rounded-2xl p-6">
            <h3 className="font-[var(--font-outfit)] mb-4 text-base font-bold text-white">
              Generate a New Quiz
            </h3>
            <div className="space-y-3">
              <input
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder="Quiz topic (e.g. Photosynthesis, World War II)..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-accent-blue/50"
              />
              {/* File Upload Area */}
              <div
                onClick={() => !fileProcessing && fileInputRef.current?.click()}
                className={`group relative cursor-pointer rounded-xl border-2 border-dashed transition-all ${
                  fileProcessing
                    ? "border-accent-blue/30 bg-accent-blue/5"
                    : uploadedFile
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/5"
                } px-4 py-4`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />
                {fileProcessing ? (
                  <div className="flex items-center justify-center gap-3 py-2">
                    <Loader2 className="h-5 w-5 animate-spin text-accent-blue" />
                    <span className="text-sm text-accent-blue">Extracting content from {uploadedFile?.name}...</span>
                  </div>
                ) : uploadedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15">
                        {uploadedFile.type === "application/pdf" ? (
                          <FileText className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-emerald-400">{uploadedFile.name}</p>
                        <p className="text-xs text-white/30">Content extracted — click to upload another</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUploadedFile(null);
                      }}
                      className="rounded-lg p-1.5 text-white/30 hover:bg-white/10 hover:text-white/60"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition-colors group-hover:bg-white/10">
                      <FileUp className="h-5 w-5 text-white/30 transition-colors group-hover:text-white/50" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white/40 group-hover:text-white/60">Upload Notes</p>
                      <p className="text-xs text-white/20">PDF or Image (PNG, JPG) — AI will extract content</p>
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                  <XCircle className="h-4 w-4 shrink-0" />
                  {fileError}
                  <button onClick={() => setFileError("")} className="ml-auto text-red-400/60 hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div className="relative">
                <textarea
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Paste notes or study material here, or upload a file above..."
                  rows={5}
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-white placeholder-white/25 outline-none focus:border-accent-blue/50"
                />
                {notesInput && (
                  <button
                    type="button"
                    onClick={() => { setNotesInput(""); setUploadedFile(null); }}
                    className="absolute top-2 right-2 rounded-lg p-1 text-white/20 hover:bg-white/10 hover:text-white/50"
                    title="Clear notes"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-white/50 whitespace-nowrap">Number of Questions</label>
                <div className="flex items-center gap-1">
                  {[3, 5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setQuestionCount(n)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-all ${
                        questionCount === n
                          ? "bg-accent-blue text-white shadow-lg shadow-accent-blue/25"
                          : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={questionCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1 && v <= 30) setQuestionCount(v);
                    }}
                    className="ml-2 w-16 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-accent-blue/50"
                  />
                </div>
              </div>
              <motion.button
                onClick={handleGenerate}
                disabled={(!topicInput.trim() && !notesInput.trim()) || generating}
                className="flex items-center gap-2 rounded-xl bg-accent-gold px-6 py-3 text-sm font-bold text-cosmic-deep shadow-lg shadow-accent-gold/25 disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Generate {questionCount}-Question Quiz
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}

        {/* Quiz list */}
        <div>
          <h3 className="mb-4 text-xs font-semibold tracking-wider text-white/30 uppercase">
            Available Quizzes ({quizzes.length})
          </h3>

          {quizzes.length === 0 ? (
            <div className="glass rounded-2xl py-16 text-center text-white/30">
              <Zap className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p>
                {isTeacher
                  ? "No quizzes yet. Generate one above!"
                  : "No quizzes available yet. Your teacher will create some soon!"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {quizzes.map((quiz, i) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass group flex items-center justify-between rounded-2xl p-5 transition-all hover:bg-white/8"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-gold/10">
                      <FileText className="h-5 w-5 text-accent-gold" />
                    </div>
                    <div>
                      <h4 className="font-[var(--font-outfit)] text-base font-bold text-white">
                        {quiz.title}
                      </h4>
                      <p className="text-xs text-white/30">
                        {quiz.questions.length} questions · by{" "}
                        {quiz.createdByName} ·{" "}
                        {formatDate(quiz.createdAt)}
                      </p>
                    </div>
                  </div>

                  <motion.button
                    onClick={() => startQuiz(quiz)}
                    className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-blue/25"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Take Quiz
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard — per quiz */}
        {quizLeaderboards.length > 0 && (
          <div className="mt-8">
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider text-white/30 uppercase hover:text-white/50"
            >
              <BarChart3 className="h-4 w-4" />
              Leaderboards ({quizLeaderboards.length} quizzes)
              <ChevronRight
                className={`h-3 w-3 transition-transform ${
                  showLeaderboard ? "rotate-90" : ""
                }`}
              />
            </button>

            <AnimatePresence>
              {showLeaderboard && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {quizLeaderboards.map((qlb) => {
                    const isExpanded = expandedQuizLb.has(qlb.quizId);
                    return (
                      <div key={qlb.quizId} className="glass-strong overflow-hidden rounded-2xl">
                        {/* Quiz header — click to expand */}
                        <button
                          onClick={() => {
                            setExpandedQuizLb((prev) => {
                              const next = new Set(prev);
                              if (next.has(qlb.quizId)) next.delete(qlb.quizId);
                              else next.add(qlb.quizId);
                              return next;
                            });
                          }}
                          className="flex w-full items-center justify-between px-5 py-3.5 text-left transition-colors hover:bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gold/10">
                              <Trophy className="h-4 w-4 text-accent-gold" />
                            </div>
                            <div>
                              <h4 className="text-sm font-semibold text-white/80">{qlb.quizTitle}</h4>
                              <p className="text-[10px] text-white/30">{qlb.entries.length} student{qlb.entries.length !== 1 ? "s" : ""} attempted</p>
                            </div>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 text-white/20 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
                          />
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              {/* Column headers */}
                              <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-t border-white/5 px-5 py-2 text-[10px] font-semibold tracking-wider text-white/25 uppercase">
                                <span>#</span>
                                <span>Student</span>
                                <span>Time</span>
                                <span>Score</span>
                              </div>

                              {qlb.entries.map((entry, i) => (
                                <motion.div
                                  key={entry.userId}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-4 border-t border-white/[0.03] px-5 py-2.5"
                                >
                                  <span className="flex h-6 w-6 items-center justify-center">
                                    {i < 3 ? (
                                      <Medal
                                        className={`h-4 w-4 ${
                                          i === 0
                                            ? "text-accent-gold"
                                            : i === 1
                                            ? "text-gray-300"
                                            : "text-amber-600"
                                        }`}
                                      />
                                    ) : (
                                      <span className="text-xs text-white/20">
                                        {i + 1}
                                      </span>
                                    )}
                                  </span>
                                  <span className="truncate text-sm text-white/70">
                                    {entry.userName}
                                  </span>
                                  <span className="flex items-center gap-1 text-xs text-white/30">
                                    <Clock className="h-3 w-3" />
                                    {entry.bestTime != null ? formatTime(entry.bestTime) : "--"}
                                  </span>
                                  <span
                                    className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                                      entry.bestPercentage >= 80
                                        ? "bg-emerald-500/10 text-emerald-400"
                                        : entry.bestPercentage >= 50
                                        ? "bg-amber-500/10 text-amber-400"
                                        : "bg-red-500/10 text-red-400"
                                    }`}
                                  >
                                    {entry.bestScore}/{entry.bestTotal} ({entry.bestPercentage}%)
                                  </span>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
