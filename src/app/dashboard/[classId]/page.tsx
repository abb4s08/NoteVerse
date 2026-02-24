"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Loader2, Menu, X } from "lucide-react";
import NotificationBell from "@/components/dashboard/NotificationBell";
import DashboardBackground from "@/components/dashboard/DashboardBackground";
import Sidebar, { TabId } from "@/components/dashboard/Sidebar";
import MembersTab from "@/components/dashboard/MembersTab";
import NotesTab from "@/components/dashboard/NotesTab";
import DiscussionTab from "@/components/dashboard/DiscussionTab";
import AIChatTab from "@/components/dashboard/AIChatTab";
import QuizArchitect from "@/components/dashboard/QuizArchitect";
import WhiteboardTab from "@/components/dashboard/WhiteboardTab";
import FlashcardsTab from "@/components/dashboard/FlashcardsTab";
import SchedulerTab from "@/components/dashboard/SchedulerTab";
import PomodoroTab from "@/components/dashboard/PomodoroTab";
import AdminPanel from "@/components/dashboard/AdminPanel";
import SessionRecordingTab from "@/components/dashboard/SessionRecordingTab";
import ClassroomHeader from "@/components/dashboard/ClassroomHeader";

interface ClassInfo {
  id: string;
  name: string;
  subject?: string;
  classCode?: string;
}

export default function ClassroomHubPage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const params = useParams();
  const classId = params.classId as string;

  const [activeTab, setActiveTab] = useState<TabId>("members");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [userClasses, setUserClasses] = useState<ClassInfo[]>([]);
  const [loadingClass, setLoadingClass] = useState(true);
  const [quizPrefill, setQuizPrefill] = useState<{
    content: string;
    title: string;
  } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileRetried, setProfileRetried] = useState(false);

  // ── Auth guards ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !user) router.push("/auth");
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user && !profile && !profileRetried) {
      setProfileRetried(true);
      refreshProfile();
    }
  }, [loading, user, profile, profileRetried, refreshProfile]);

  // ── Fetch current class + all user classes for sidebar ─────────────────
  useEffect(() => {
    const fetchData = async () => {
      if (!user || !profile || !classId) return;
      setLoadingClass(true);
      try {
        // Fetch current class
        const classDoc = await getDoc(doc(db, "classrooms", classId));
        if (!classDoc.exists()) {
          router.push("/dashboard");
          return;
        }
        const data = classDoc.data();
        setClassInfo({
          id: classId,
          name: data.name,
          subject: data.subject,
          classCode: data.classCode,
        });

        // Fetch all of user's classes for the sidebar switcher
        let q;
        if (profile.role === "teacher") {
          q = query(
            collection(db, "classrooms"),
            where("teacherId", "==", user.uid)
          );
        } else {
          q = query(
            collection(db, "classrooms"),
            where("studentIds", "array-contains", user.uid)
          );
        }
        const snapshot = await getDocs(q);
        setUserClasses(
          snapshot.docs.map((d) => ({
            id: d.id,
            name: d.data().name,
            subject: d.data().subject,
          }))
        );
      } catch (err) {
        console.error("Error fetching class data:", err);
        router.push("/dashboard");
      } finally {
        setLoadingClass(false);
      }
    };
    fetchData();
  }, [user, profile, classId, router]);

  // ── Tab & class switching ──────────────────────────────────────────────
  const handleTabChange = (tab: TabId) => {
    if (tab === "hub") {
      router.push("/dashboard");
      return;
    }
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  const handleClassSwitch = (newClassId: string) => {
    router.push(`/dashboard/${newClassId}`);
  };

  const handleGenerateQuizFromNote = (
    noteContent: string,
    noteTitle: string
  ) => {
    setQuizPrefill({ content: noteContent, title: noteTitle });
    setActiveTab("quiz");
  };

  // ── Loading states ─────────────────────────────────────────────────────
  if (loading || loadingClass) {
    return (
      <div className="cosmic-bg flex min-h-screen items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="h-8 w-8 animate-spin text-accent-blue" />
          <p className="text-sm text-white/40">Loading classroom...</p>
        </motion.div>
      </div>
    );
  }

  if (!user || !profile || !classInfo) return null;

  // ── Content renderer ───────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case "members":
        return <MembersTab classroomId={classId} />;
      case "notes":
        return (
          <NotesTab
            classroomId={classId}
            classroomName={classInfo.name}
            onGenerateQuiz={
              profile.role === "teacher"
                ? handleGenerateQuizFromNote
                : undefined
            }
          />
        );
      case "discussion":
        return <DiscussionTab classroomId={classId} />;
      case "ai-chat":
        return <AIChatTab />;
      case "quiz":
        return (
          <QuizArchitect
            classroomId={classId}
            classroomName={classInfo.name}
            prefill={quizPrefill}
            onPrefillConsumed={() => setQuizPrefill(null)}
          />
        );
      case "whiteboard":
        return <WhiteboardTab classroomId={classId} />;
      case "flashcards":
        return <FlashcardsTab classroomId={classId} classroomName={classInfo.name} />;
      case "scheduler":
        return <SchedulerTab classroomId={classId} classroomName={classInfo.name} />;
      case "pomodoro":
        return <PomodoroTab />;
      case "admin":
        return (
          <AdminPanel classroomId={classId} classroomName={classInfo.name} />
        );
      case "recording":
        return <SessionRecordingTab classroomId={classId} classroomName={classInfo.name} />;
      default:
        return <MembersTab classroomId={classId} />;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen overflow-hidden p-2 sm:p-3" style={{ background: '#12141D' }}>
      <DashboardBackground />

      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed left-3 top-3 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-cosmic-dark/80 text-white/60 backdrop-blur-sm lg:hidden"
      >
        {mobileMenuOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <Menu className="h-5 w-5" />
        )}
      </button>

      {/* Notification bell — top right */}
      <div className="fixed right-4 top-3 z-[60]">
        <NotificationBell classroomId={classId} />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar with class switcher */}
      <div
        className={`fixed inset-y-0 left-0 z-40 p-2 transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          classroomName={classInfo.name}
          userClasses={userClasses}
          currentClassId={classId}
          onClassSwitch={handleClassSwitch}
        />
      </div>

      {/* Main content */}
      <main className="ml-0 flex-1 overflow-y-auto rounded-2xl pt-12 lg:ml-3 lg:pt-0">
        {/* Classroom Banner Header */}
        <div className="px-4 pt-4 sm:px-6 sm:pt-5">
          <ClassroomHeader
            className={classInfo.name}
            subject={classInfo.subject}
            classCode={classInfo.classCode}
          />
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="h-full"
        >
          {renderContent()}
        </motion.div>
      </main>
    </div>
  );
}
