"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  GraduationCap,
  BookOpen,
  Crown,
  Mail,
  Search,
} from "lucide-react";
import ActivityLog from "./ActivityLog";

interface Member {
  uid: string;
  name: string;
  role: "student" | "teacher";
  email: string;
  profilePicUrl?: string;
}

interface MembersTabProps {
  classroomId: string;
}

/* ── Avatar with image fallback to initials ───────────────────────────── */
function MemberAvatar({
  member,
  accentClass,
}: {
  member: Member;
  accentClass: string;
}) {
  const initials = member.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (member.profilePicUrl) {
    return (
      <img
        src={member.profilePicUrl}
        alt={member.name}
        className="h-10 w-10 rounded-full border-2 border-white/10 object-cover"
      />
    );
  }

  return (
    <div
      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${accentClass}`}
    >
      {initials}
    </div>
  );
}

export default function MembersTab({ classroomId }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [creatorId, setCreatorId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "classrooms", classroomId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMembers(data.members || []);
        setCreatorId(data.createdBy || "");
      }
    });
    return () => unsub();
  }, [classroomId]);

  const q = searchQuery.toLowerCase().trim();
  const filteredMembers = useMemo(
    () =>
      q
        ? members.filter((m) => m.name.toLowerCase().includes(q))
        : members,
    [members, q]
  );

  const teachers = filteredMembers.filter((m) => m.role === "teacher");
  const students = filteredMembers.filter((m) => m.role === "student");

  return (
    <div className="mx-auto max-w-5xl p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15">
            <Users className="h-5 w-5 text-accent-blue" />
          </div>
          <div>
            <h2 className="font-[var(--font-outfit)] text-2xl font-bold text-white">
              Members
            </h2>
            <p className="text-sm text-white/40">
              {members.length} member{members.length !== 1 ? "s" : ""} in this
              classroom
            </p>
          </div>
        </div>

        {/* Two-column layout: members + activity */}
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* ── Left column: stats + search + lists ──────────────────── */}
          <div>
            {/* Stats */}
            <div className="mb-5 grid grid-cols-2 gap-4">
              <div className="glass rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <BookOpen className="h-4 w-4" />
                  Teachers
                </div>
                <p className="mt-1 text-2xl font-bold text-white">
                  {members.filter((m) => m.role === "teacher").length}
                </p>
              </div>
              <div className="glass rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <GraduationCap className="h-4 w-4" />
                  Students
                </div>
                <p className="mt-1 text-2xl font-bold text-white">
                  {members.filter((m) => m.role === "student").length}
                </p>
              </div>
            </div>

            {/* Search bar */}
            <div className="relative mb-5">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search members…"
                className="w-full rounded-xl border border-white/10 bg-white/[0.06] py-2.5 pl-10 pr-4 text-sm text-white placeholder-white/25 outline-none backdrop-blur-md transition-colors focus:border-accent-blue/40 focus:bg-white/[0.08]"
              />
            </div>

            {/* Teachers */}
            {teachers.length > 0 && (
              <div className="mb-6">
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-white/30 uppercase">
                  Teachers
                </h3>
                <div className="space-y-2">
                  {teachers.map((member, i) => (
                    <motion.div
                      key={member.uid}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass flex items-center gap-4 rounded-xl px-4 py-3"
                    >
                      <MemberAvatar
                        member={member}
                        accentClass="bg-accent-gold/15 text-accent-gold"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-white">
                            {member.name}
                          </p>
                          {member.uid === creatorId && (
                            <Crown className="h-3.5 w-3.5 text-accent-gold" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-white/30">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                      <span className="rounded-lg bg-accent-gold/10 px-2.5 py-1 text-xs font-medium text-accent-gold">
                        Teacher
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Students */}
            {students.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-semibold tracking-wider text-white/30 uppercase">
                  Students
                </h3>
                <div className="space-y-2">
                  {students.map((member, i) => (
                    <motion.div
                      key={member.uid}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass flex items-center gap-4 rounded-xl px-4 py-3"
                    >
                      <MemberAvatar
                        member={member}
                        accentClass="bg-accent-blue/15 text-accent-blue"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {member.name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-white/30">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                      <span className="rounded-lg bg-accent-blue/10 px-2.5 py-1 text-xs font-medium text-accent-blue">
                        Student
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {filteredMembers.length === 0 && (
              <div className="py-16 text-center text-white/30">
                <Users className="mx-auto mb-3 h-12 w-12 opacity-30" />
                <p>{q ? "No members match your search." : "No members yet."}</p>
              </div>
            )}
          </div>

          {/* ── Right column: Activity Log ───────────────────────────── */}
          <div className="hidden lg:block">
            <ActivityLog classroomId={classroomId} />
          </div>
        </div>

        {/* Activity Log — mobile (below members) */}
        <div className="mt-6 lg:hidden">
          <ActivityLog classroomId={classroomId} />
        </div>
      </motion.div>
    </div>
  );
}
