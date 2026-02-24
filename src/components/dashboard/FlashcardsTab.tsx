"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Flashcard3D from "./Flashcard3D";
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
  Layers,
  Plus,
  RotateCcw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Loader2,
  Shuffle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createNotification } from "@/lib/notifications";

interface Flashcard {
  id: string;
  front: string;
  back: string;
  deckId: string;
  order: number;
  createdBy: string;
  createdAt: { seconds: number } | null;
}

interface Deck {
  id: string;
  name: string;
  description: string;
  cardCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: { seconds: number } | null;
}

interface FlashcardsTabProps {
  classroomId: string;
  classroomName?: string;
}

export default function FlashcardsTab({ classroomId, classroomName }: FlashcardsTabProps) {
  const { user, profile } = useAuth();
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showCreateDeck, setShowCreateDeck] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [deckName, setDeckName] = useState("");
  const [deckDesc, setDeckDesc] = useState("");
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [known, setKnown] = useState<Set<string>>(new Set());
  const [unknown, setUnknown] = useState<Set<string>>(new Set());

  // Listen for decks
  useEffect(() => {
    const q = query(
      collection(db, "classrooms", classroomId, "decks"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setDecks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Deck)));
      setLoading(false);
    });
    return () => unsub();
  }, [classroomId]);

  // Listen for cards when deck is selected
  useEffect(() => {
    if (!selectedDeck) {
      setCards([]);
      return;
    }
    const q = query(
      collection(db, "classrooms", classroomId, "decks", selectedDeck.id, "cards"),
      orderBy("order", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Flashcard)));
    });
    return () => unsub();
  }, [classroomId, selectedDeck]);

  const createDeck = async () => {
    if (!deckName.trim() || !user || !profile) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "classrooms", classroomId, "decks"), {
        name: deckName.trim(),
        description: deckDesc.trim(),
        cardCount: 0,
        createdBy: user.uid,
        createdByName: profile.fullName,
        createdAt: serverTimestamp(),
      });
      // Notification: flashcard deck created
      createNotification({
        classId: classroomId,
        className: classroomName || "",
        type: "FLASHCARD_DECK_CREATED",
        message: `${profile.fullName} created a new flashcard deck: "${deckName.trim()}"`,
        actorName: profile.fullName,
        actorUid: user.uid,
      });

      setDeckName("");
      setDeckDesc("");
      setShowCreateDeck(false);
    } finally {
      setSaving(false);
    }
  };

  const addCard = async () => {
    if (!cardFront.trim() || !cardBack.trim() || !selectedDeck || !user) return;
    setSaving(true);
    try {
      await addDoc(
        collection(db, "classrooms", classroomId, "decks", selectedDeck.id, "cards"),
        {
          front: cardFront.trim(),
          back: cardBack.trim(),
          deckId: selectedDeck.id,
          order: cards.length,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
        }
      );
      setCardFront("");
      setCardBack("");
      setShowAddCard(false);
    } finally {
      setSaving(false);
    }
  };

  const deleteDeck = async (deckId: string) => {
    if (!confirm("Delete this deck and all its cards?")) return;
    await deleteDoc(doc(db, "classrooms", classroomId, "decks", deckId));
    if (selectedDeck?.id === deckId) {
      setSelectedDeck(null);
      setCards([]);
    }
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setFlipped(false);
  };

  const nextCard = () => {
    setFlipped(false);
    setCurrentIndex((i) => Math.min(i + 1, cards.length - 1));
  };

  const prevCard = () => {
    setFlipped(false);
    setCurrentIndex((i) => Math.max(i - 1, 0));
  };

  const markKnown = () => {
    if (cards[currentIndex]) {
      setKnown((prev) => new Set(prev).add(cards[currentIndex].id));
      setUnknown((prev) => {
        const s = new Set(prev);
        s.delete(cards[currentIndex].id);
        return s;
      });
    }
    nextCard();
  };

  const markUnknown = () => {
    if (cards[currentIndex]) {
      setUnknown((prev) => new Set(prev).add(cards[currentIndex].id));
      setKnown((prev) => {
        const s = new Set(prev);
        s.delete(cards[currentIndex].id);
        return s;
      });
    }
    nextCard();
  };

  const resetStudy = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setKnown(new Set());
    setUnknown(new Set());
    setStudyMode(false);
  };

  // Deck list view
  if (!selectedDeck) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
              <Layers className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h2 className="font-[var(--font-outfit)] text-xl font-bold text-white">
                Flashcards
              </h2>
              <p className="text-xs text-white/30">{decks.length} decks</p>
            </div>
          </div>
          {profile?.role === "teacher" && (
            <motion.button
              onClick={() => setShowCreateDeck(true)}
              className="flex items-center gap-2 rounded-xl bg-accent-blue/15 px-4 py-2 text-sm font-medium text-accent-blue hover:bg-accent-blue/25"
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4" /> New Deck
            </motion.button>
          )}
        </div>

        {/* Create deck modal */}
        <AnimatePresence>
          {showCreateDeck && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-strong overflow-hidden rounded-2xl"
            >
              <div className="space-y-3 p-4">
                <input
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  placeholder="Deck name"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-accent-blue/30"
                />
                <input
                  value={deckDesc}
                  onChange={(e) => setDeckDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-accent-blue/30"
                />
                <div className="flex gap-2">
                  <motion.button
                    onClick={createDeck}
                    disabled={!deckName.trim() || saving}
                    className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                    whileTap={{ scale: 0.95 }}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Create
                  </motion.button>
                  <button
                    onClick={() => setShowCreateDeck(false)}
                    className="rounded-xl px-4 py-2 text-sm text-white/40 hover:text-white/70"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deck grid */}
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent-blue" />
          </div>
        ) : decks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <Layers className="mx-auto mb-3 h-10 w-10 text-white/10" />
              <p className="text-sm text-white/30">No flashcard decks yet</p>
              <p className="text-xs text-white/20">Create one to get started</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((deck) => (
              <motion.div
                key={deck.id}
                className="glass-strong group cursor-pointer rounded-2xl p-4 transition-all hover:border-accent-blue/20"
                onClick={() => {
                  setSelectedDeck(deck);
                  setCurrentIndex(0);
                  setFlipped(false);
                  setStudyMode(false);
                  setKnown(new Set());
                  setUnknown(new Set());
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15">
                    <BookOpen className="h-5 w-5 text-purple-400" />
                  </div>
                  {profile?.role === "teacher" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDeck(deck.id);
                      }}
                      className="rounded-lg p-1 text-white/20 opacity-0 hover:text-red-400 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <h3 className="mb-1 font-medium text-white">{deck.name}</h3>
                {deck.description && (
                  <p className="mb-2 text-xs text-white/30 line-clamp-2">{deck.description}</p>
                )}
                <p className="text-xs text-white/20">by {deck.createdByName}</p>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Study view (deck selected)
  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => {
              setSelectedDeck(null);
              resetStudy();
            }}
            className="rounded-xl bg-white/5 p-2 text-white/40 hover:text-white/70"
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <div>
            <h2 className="font-[var(--font-outfit)] text-xl font-bold text-white">
              {selectedDeck.name}
            </h2>
            <p className="text-xs text-white/30">
              {cards.length} cards • Card {currentIndex + 1} of {cards.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={shuffleCards}
            className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm text-white/40 hover:text-white/70"
            whileTap={{ scale: 0.95 }}
          >
            <Shuffle className="h-4 w-4" /> Shuffle
          </motion.button>
          {profile?.role === "teacher" && (
            <motion.button
              onClick={() => setShowAddCard(true)}
              className="flex items-center gap-2 rounded-xl bg-accent-blue/15 px-3 py-2 text-sm text-accent-blue hover:bg-accent-blue/25"
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="h-4 w-4" /> Add Card
            </motion.button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full bg-accent-blue"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      {/* Add card form */}
      <AnimatePresence>
        {showAddCard && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-strong overflow-hidden rounded-2xl"
          >
            <div className="space-y-3 p-4">
              <input
                value={cardFront}
                onChange={(e) => setCardFront(e.target.value)}
                placeholder="Front (question/term)"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-accent-blue/30"
              />
              <textarea
                value={cardBack}
                onChange={(e) => setCardBack(e.target.value)}
                placeholder="Back (answer/definition)"
                rows={3}
                className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-accent-blue/30"
              />
              <div className="flex gap-2">
                <motion.button
                  onClick={addCard}
                  disabled={!cardFront.trim() || !cardBack.trim() || saving}
                  className="flex items-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  whileTap={{ scale: 0.95 }}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Add Card
                </motion.button>
                <button
                  onClick={() => setShowAddCard(false)}
                  className="rounded-xl px-4 py-2 text-sm text-white/40 hover:text-white/70"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flashcard */}
      {cards.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <BookOpen className="mx-auto mb-3 h-10 w-10 text-white/10" />
            <p className="text-sm text-white/30">No cards in this deck</p>
            <p className="text-xs text-white/20">Add some cards to start studying</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          {/* The card — Premium 3D flip */}
          <Flashcard3D
            front={currentCard?.front ?? ""}
            back={currentCard?.back ?? ""}
            flipped={flipped}
            onFlip={() => setFlipped(!flipped)}
          />

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <motion.button
              onClick={markUnknown}
              className="flex items-center gap-2 rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/25"
              whileTap={{ scale: 0.95 }}
            >
              <XCircle className="h-4 w-4" /> Still Learning
            </motion.button>
            <motion.button
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="rounded-xl bg-white/5 p-2.5 text-white/40 hover:text-white/70 disabled:opacity-20"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
            <motion.button
              onClick={nextCard}
              disabled={currentIndex === cards.length - 1}
              className="rounded-xl bg-white/5 p-2.5 text-white/40 hover:text-white/70 disabled:opacity-20"
              whileTap={{ scale: 0.9 }}
            >
              <ChevronRight className="h-5 w-5" />
            </motion.button>
            <motion.button
              onClick={markKnown}
              className="flex items-center gap-2 rounded-xl bg-green-500/15 px-4 py-2.5 text-sm font-medium text-green-400 hover:bg-green-500/25"
              whileTap={{ scale: 0.95 }}
            >
              <CheckCircle2 className="h-4 w-4" /> Got It
            </motion.button>
          </div>

          {/* Study stats */}
          {(known.size > 0 || unknown.size > 0) && (
            <div className="flex items-center gap-4 text-xs">
              <span className="text-green-400">✓ {known.size} known</span>
              <span className="text-red-400">✗ {unknown.size} learning</span>
              <span className="text-white/20">
                {cards.length - known.size - unknown.size} remaining
              </span>
              <button onClick={resetStudy} className="text-accent-blue hover:underline">
                Reset
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
