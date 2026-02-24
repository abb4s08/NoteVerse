"use client";

import { motion } from "framer-motion";
import {
  Sparkles,
  Users,
  FileText,
  MessageSquare,
  Brain,
  Zap,
  LogOut,
  Home,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Layers,
  CalendarDays,
  Timer,
  Shield,
  Video,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export type TabId =
  | "hub"
  | "members"
  | "notes"
  | "discussion"
  | "ai-chat"
  | "quiz"
  | "whiteboard"
  | "flashcards"
  | "scheduler"
  | "pomodoro"
  | "admin"
  | "recording";

interface ClassInfo {
  id: string;
  name: string;
  subject?: string;
}

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  classroomName?: string;
  userClasses?: ClassInfo[];
  currentClassId?: string;
  onClassSwitch?: (classId: string) => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  teacherOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: "hub", label: "Dashboard", icon: <Home className="h-5 w-5" /> },
  { id: "members", label: "Members", icon: <Users className="h-5 w-5" /> },
  { id: "notes", label: "Notes", icon: <FileText className="h-5 w-5" /> },
  {
    id: "discussion",
    label: "Discussion",
    icon: <MessageSquare className="h-5 w-5" />,
  },
  { id: "ai-chat", label: "AI Chat", icon: <Brain className="h-5 w-5" /> },
  {
    id: "quiz",
    label: "Quiz Architect",
    icon: <Zap className="h-5 w-5" />,
    teacherOnly: true,
  },
  {
    id: "whiteboard",
    label: "Whiteboard",
    icon: <Pencil className="h-5 w-5" />,
  },
  {
    id: "flashcards",
    label: "Flashcards",
    icon: <Layers className="h-5 w-5" />,
  },
  {
    id: "scheduler",
    label: "Scheduler",
    icon: <CalendarDays className="h-5 w-5" />,
  },
  {
    id: "pomodoro",
    label: "Pomodoro",
    icon: <Timer className="h-5 w-5" />,
  },
  {
    id: "recording",
    label: "Study Room",
    icon: <Video className="h-5 w-5" />,
  },
  {
    id: "admin",
    label: "Admin Panel",
    icon: <Shield className="h-5 w-5" />,
    teacherOnly: true,
  },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  collapsed,
  onToggleCollapse,
  classroomName,
  userClasses,
  currentClassId,
  onClassSwitch,
}: SidebarProps) {
  const { profile, signOut } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.teacherOnly || profile?.role === "teacher"
  );

  const otherClasses =
    userClasses?.filter((c) => c.id !== currentClassId) || [];

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "glass-strong relative flex h-full flex-col rounded-2xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-5">
        <Sparkles className="h-6 w-6 shrink-0 text-accent-gold" />
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-w-0"
          >
            <span className="font-[var(--font-outfit)] text-lg font-bold text-white">
              Note<span className="text-accent-blue">Verse</span>
            </span>
            {classroomName && (
              <p className="truncate text-xs text-white/30">{classroomName}</p>
            )}
          </motion.div>
        )}
      </div>

      {/* Class Switcher — rapid switching without returning to dashboard */}
      {!collapsed && otherClasses.length > 0 && (
        <div className="border-b border-white/5 px-3 py-3">
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/20">
            My Classes
          </p>
          <div className="max-h-28 space-y-0.5 overflow-y-auto custom-scrollbar">
            {otherClasses.map((cls) => (
              <button
                key={cls.id}
                onClick={() => onClassSwitch?.(cls.id)}
                className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/70"
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0 text-accent-blue/50" />
                <span className="truncate">{cls.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "text-white"
                  : "text-white/40 hover:bg-white/5 hover:text-white/70"
              )}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebarActive"
                  className="absolute inset-0 rounded-xl bg-accent-blue/15 border border-accent-blue/20"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span
                className={cn(
                  "relative z-10 shrink-0",
                  isActive ? "text-accent-blue" : ""
                )}
              >
                {item.icon}
              </span>
              {!collapsed && (
                <span className="relative z-10 truncate">{item.label}</span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/5 px-3 py-4">
        {!collapsed && profile && (
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-blue/20 text-xs font-bold text-accent-blue">
              {profile.fullName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">
                {profile.fullName}
              </p>
              <p className="truncate text-xs text-white/30 capitalize">
                {profile.role}
              </p>
            </div>
          </div>
        )}

        <motion.button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/30 transition-colors hover:bg-red-500/10 hover:text-red-400"
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </motion.button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggleCollapse}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-cosmic-dark text-white/40 transition-colors hover:text-white"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </motion.aside>
  );
}
