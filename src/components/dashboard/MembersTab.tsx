"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Users,
  GraduationCap,
  BookOpen,
  Crown,
  Mail,
} from "lucide-react";

interface Member {
  uid: string;
  name: string;
  role: "student" | "teacher";
  email: string;
}

interface MembersTabProps {
  classroomId: string;
}

export default function MembersTab({ classroomId }: MembersTabProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [creatorId, setCreatorId] = useState("");

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

  const teachers = members.filter((m) => m.role === "teacher");
  const students = members.filter((m) => m.role === "student");

  return (
    <div className="mx-auto max-w-3xl p-6">
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

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="glass rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-white/40">
              <BookOpen className="h-4 w-4" />
              Teachers
            </div>
            <p className="mt-1 text-2xl font-bold text-white">
              {teachers.length}
            </p>
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-white/40">
              <GraduationCap className="h-4 w-4" />
              Students
            </div>
            <p className="mt-1 text-2xl font-bold text-white">
              {students.length}
            </p>
          </div>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gold/15 text-sm font-bold text-accent-gold">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-blue/15 text-sm font-bold text-accent-blue">
                    {member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
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

        {members.length === 0 && (
          <div className="py-16 text-center text-white/30">
            <Users className="mx-auto mb-3 h-12 w-12 opacity-30" />
            <p>No members yet.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
