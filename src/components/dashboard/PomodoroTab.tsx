"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Coffee,
  Brain,
  Settings,
  Volume2,
  VolumeX,
  SkipForward,
  Target,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TimerMode = "focus" | "short-break" | "long-break";

interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakInterval: number; // after how many focus sessions
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};

export default function PomodoroTab() {
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [mode, setMode] = useState<TimerMode>("focus");
  const [timeLeft, setTimeLeft] = useState(settings.focusMinutes * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [totalFocusToday, setTotalFocusToday] = useState(0); // in seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getTotalSeconds = useCallback(
    (m: TimerMode) => {
      switch (m) {
        case "focus":
          return settings.focusMinutes * 60;
        case "short-break":
          return settings.shortBreakMinutes * 60;
        case "long-break":
          return settings.longBreakMinutes * 60;
      }
    },
    [settings]
  );

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer done
            clearInterval(intervalRef.current!);
            setIsRunning(false);
            handleTimerComplete();
            return 0;
          }
          if (mode === "focus") {
            setTotalFocusToday((t) => t + 1);
          }
          return prev - 1;
        });
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, mode]);

  const handleTimerComplete = () => {
    // Play notification sound
    if (soundEnabled) {
      try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.value = mode === "focus" ? 800 : 600;
        oscillator.type = "sine";
        gain.gain.value = 0.3;
        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
        oscillator.stop(ctx.currentTime + 1);
      } catch {
        // Audio not available
      }
    }

    if (mode === "focus") {
      const newCompleted = completedSessions + 1;
      setCompletedSessions(newCompleted);
      // Check if long break
      if (newCompleted % settings.longBreakInterval === 0) {
        switchMode("long-break");
      } else {
        switchMode("short-break");
      }
    } else {
      switchMode("focus");
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    setTimeLeft(getTotalSeconds(newMode));
    setIsRunning(false);
  };

  const toggleTimer = () => setIsRunning(!isRunning);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getTotalSeconds(mode));
  };

  const skipToNext = () => {
    setIsRunning(false);
    if (mode === "focus") {
      const newCompleted = completedSessions + 1;
      setCompletedSessions(newCompleted);
      if (newCompleted % settings.longBreakInterval === 0) {
        switchMode("long-break");
      } else {
        switchMode("short-break");
      }
    } else {
      switchMode("focus");
    }
  };

  const applySettings = (newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    setShowSettings(false);
    // Reset timer with new settings
    setIsRunning(false);
    switch (mode) {
      case "focus":
        setTimeLeft(newSettings.focusMinutes * 60);
        break;
      case "short-break":
        setTimeLeft(newSettings.shortBreakMinutes * 60);
        break;
      case "long-break":
        setTimeLeft(newSettings.longBreakMinutes * 60);
        break;
    }
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const totalSeconds = getTotalSeconds(mode);
  const progress = totalSeconds > 0 ? ((totalSeconds - timeLeft) / totalSeconds) * 100 : 0;
  const circumference = 2 * Math.PI * 140;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const focusHours = Math.floor(totalFocusToday / 3600);
  const focusMins = Math.floor((totalFocusToday % 3600) / 60);

  const modeConfig = {
    focus: {
      label: "Focus Time",
      color: "text-accent-blue",
      bgColor: "bg-accent-blue/10",
      borderColor: "border-accent-blue/20",
      strokeColor: "#007BFF",
      icon: <Brain className="h-5 w-5" />,
    },
    "short-break": {
      label: "Short Break",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      strokeColor: "#22C55E",
      icon: <Coffee className="h-5 w-5" />,
    },
    "long-break": {
      label: "Long Break",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      strokeColor: "#A855F7",
      icon: <Coffee className="h-5 w-5" />,
    },
  };

  const current = modeConfig[mode];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-4">
      {/* Mode selector */}
      <div className="flex items-center gap-2 rounded-2xl bg-white/5 p-1.5">
        {(["focus", "short-break", "long-break"] as TimerMode[]).map((m) => {
          const cfg = modeConfig[m];
          return (
            <motion.button
              key={m}
              onClick={() => {
                if (!isRunning) switchMode(m);
              }}
              className={cn(
                "relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                mode === m ? cfg.color : "text-white/30 hover:text-white/50"
              )}
              whileTap={{ scale: 0.95 }}
            >
              {mode === m && (
                <motion.div
                  layoutId="pomodoroMode"
                  className={cn("absolute inset-0 rounded-xl border", cfg.bgColor, cfg.borderColor)}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{cfg.icon}</span>
              <span className="relative z-10 hidden sm:inline">{cfg.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Timer circle */}
      <div className="relative">
        <svg width="320" height="320" className="rotate-[-90deg]">
          {/* Background circle */}
          <circle
            cx="160"
            cy="160"
            r="140"
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="8"
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx="160"
            cy="160"
            r="140"
            stroke={current.strokeColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5 }}
            style={{ filter: `drop-shadow(0 0 8px ${current.strokeColor}40)` }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-[var(--font-outfit)] text-6xl font-bold tracking-tight", current.color)}>
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </span>
          <span className="mt-2 text-sm text-white/30">{current.label}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <motion.button
          onClick={resetTimer}
          className="rounded-xl bg-white/5 p-3 text-white/40 hover:text-white/70"
          whileTap={{ scale: 0.9 }}
          title="Reset"
        >
          <RotateCcw className="h-5 w-5" />
        </motion.button>

        <motion.button
          onClick={toggleTimer}
          className={cn(
            "flex h-16 w-16 items-center justify-center rounded-2xl text-white",
            mode === "focus"
              ? "bg-accent-blue shadow-lg shadow-accent-blue/20"
              : mode === "short-break"
              ? "bg-green-500 shadow-lg shadow-green-500/20"
              : "bg-purple-500 shadow-lg shadow-purple-500/20"
          )}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.05 }}
        >
          {isRunning ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
        </motion.button>

        <motion.button
          onClick={skipToNext}
          className="rounded-xl bg-white/5 p-3 text-white/40 hover:text-white/70"
          whileTap={{ scale: 0.9 }}
          title="Skip"
        >
          <SkipForward className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-white/30">
          <Target className="h-4 w-4 text-accent-blue" />
          <span>
            <strong className="text-white">{completedSessions}</strong> sessions
          </span>
        </div>
        <div className="flex items-center gap-2 text-white/30">
          <Flame className="h-4 w-4 text-accent-gold" />
          <span>
            <strong className="text-white">
              {focusHours > 0 ? `${focusHours}h ` : ""}
              {focusMins}m
            </strong>{" "}
            focused today
          </span>
        </div>
        <motion.button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="text-white/20 hover:text-white/50"
          whileTap={{ scale: 0.9 }}
          title={soundEnabled ? "Mute" : "Unmute"}
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </motion.button>
        <motion.button
          onClick={() => setShowSettings(!showSettings)}
          className="text-white/20 hover:text-white/50"
          whileTap={{ scale: 0.9 }}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onApply={applySettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* Session indicators */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: settings.longBreakInterval }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-2 w-8 rounded-full transition-colors",
              i < completedSessions % settings.longBreakInterval
                ? "bg-accent-blue"
                : "bg-white/10"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({
  settings,
  onApply,
  onClose,
}: {
  settings: PomodoroSettings;
  onApply: (s: PomodoroSettings) => void;
  onClose: () => void;
}) {
  const [focus, setFocus] = useState(settings.focusMinutes);
  const [shortBreak, setShortBreak] = useState(settings.shortBreakMinutes);
  const [longBreak, setLongBreak] = useState(settings.longBreakMinutes);
  const [interval, setInterval_] = useState(settings.longBreakInterval);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="glass-strong w-full max-w-sm rounded-2xl p-5"
    >
      <h3 className="mb-4 text-sm font-semibold text-white">Timer Settings</h3>
      <div className="space-y-3">
        <SettingRow label="Focus" value={focus} onChange={setFocus} min={1} max={120} unit="min" />
        <SettingRow label="Short Break" value={shortBreak} onChange={setShortBreak} min={1} max={30} unit="min" />
        <SettingRow label="Long Break" value={longBreak} onChange={setLongBreak} min={1} max={60} unit="min" />
        <SettingRow label="Long Break After" value={interval} onChange={setInterval_} min={2} max={10} unit="sessions" />
      </div>
      <div className="mt-4 flex gap-2">
        <motion.button
          onClick={() =>
            onApply({ focusMinutes: focus, shortBreakMinutes: shortBreak, longBreakMinutes: longBreak, longBreakInterval: interval })
          }
          className="flex-1 rounded-xl bg-accent-blue py-2 text-sm font-medium text-white"
          whileTap={{ scale: 0.95 }}
        >
          Apply
        </motion.button>
        <button
          onClick={onClose}
          className="flex-1 rounded-xl bg-white/5 py-2 text-sm text-white/40 hover:text-white/70"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function SettingRow({
  label,
  value,
  onChange,
  min,
  max,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-xs text-white/40">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 w-24 accent-accent-blue"
        />
        <span className="w-16 text-right text-xs text-white/60">
          {value} {unit}
        </span>
      </div>
    </div>
  );
}
