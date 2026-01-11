"use client";

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentView } from '@/components/student-view';
import { LecturerDashboard } from '@/components/lecturer-dashboard';
import type { Student } from '@/lib/data';
import { students } from '@/lib/data';

export type SignedInStudent = {
  id: string;
  name: string;
  avatarId: string;
  signedInAt: string;
};

export default function Home() {
  const [sessionActive, setSessionActive] = useState(false);
  const [signedInStudents, setSignedInStudents] = useState<SignedInStudent[]>([]);

  const handleSignIn = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    if (student && !signedInStudents.some((s) => s.id === studentId)) {
      const newSignedInStudent: SignedInStudent = {
        id: student.id,
        name: student.name,
        avatarId: student.avatarId,
        signedInAt: new Date().toLocaleTimeString(),
      };
      setSignedInStudents((prev) => [newSignedInStudent, ...prev]);
      
      // Mark attendance for the current week (e.g., week 11)
      const week = (Object.keys(student.attendance).length + 1).toString();
      student.attendance[week] = true;
    }
  };

  const toggleSession = () => {
    setSessionActive(active => {
      if (active) {
        // if session is ending, clear signed in students
        setSignedInStudents([]);
      }
      return !active;
    });
  };

  const studentDataWithAvatars = useMemo(() => {
    return students;
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <Tabs defaultValue="student" className="w-full max-w-7xl mx-auto">
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="student">Student</TabsTrigger>
            <TabsTrigger value="lecturer">Lecturer</TabsTrigger>
          </TabsList>
          <TabsContent value="student">
            <StudentView
              students={studentDataWithAvatars}
              onSignIn={handleSignIn}
              isSessionActive={sessionActive}
            />
          </TabsContent>
          <TabsContent value="lecturer">
            <LecturerDashboard
              students={studentDataWithAvatars}
              signedInStudents={signedInStudents}
              isSessionActive={sessionActive}
              onToggleSession={toggleSession}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
