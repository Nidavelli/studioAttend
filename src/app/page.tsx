"use client";

import React, { useState, useMemo } from 'react';
import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentView } from '@/components/student-view';
import { LecturerDashboard } from '@/components/lecturer-dashboard';
import type { Student } from '@/lib/data';
import { students as initialStudents } from '@/lib/data';
import { useToast } from "@/hooks/use-toast"

export type SignedInStudent = {
  id: string;
  name: string;
  avatarId: string;
  signedInAt: string;
};

export type Location = {
  latitude: number;
  longitude: number;
};

export default function Home() {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [sessionActive, setSessionActive] = useState(false);
  const [signedInStudents, setSignedInStudents] = useState<SignedInStudent[]>([]);
  const [lecturerLocation, setLecturerLocation] = useState<Location | null>(null);
  const { toast } = useToast();

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
      
      const updatedStudents = students.map(s => {
        if (s.id === studentId) {
          const week = (Object.keys(s.attendance).length + 1).toString();
          return { ...s, attendance: { ...s.attendance, [week]: true } };
        }
        return s;
      });
      setStudents(updatedStudents);
    }
  };

  const handleManualAttendanceToggle = (studentId: string, week: string) => {
    setStudents(currentStudents => 
      currentStudents.map(student => {
        if (student.id === studentId) {
          const newAttendance = { ...student.attendance };
          newAttendance[week] = !newAttendance[week];
          return { ...student, attendance: newAttendance };
        }
        return student;
      })
    );
  };

  const toggleSession = () => {
    if (isSessionActive) {
      setSessionActive(false);
      setSignedInStudents([]);
      setLecturerLocation(null);
    } else {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLecturerLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            setSessionActive(true);
          },
          (error) => {
            toast({
              variant: "destructive",
              title: "Location Error",
              description: `Could not retrieve lecturer's location: ${error.message}`,
            });
          }
        );
      } else {
        toast({
          variant: "destructive",
          title: "Unsupported Browser",
          description: "Geolocation is not supported by your browser.",
        });
      }
    }
  };

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
              students={students}
              onSignIn={handleSignIn}
              isSessionActive={sessionActive}
              lecturerLocation={lecturerLocation}
            />
          </TabsContent>
          <TabsContent value="lecturer">
            <LecturerDashboard
              students={students}
              signedInStudents={signedInStudents}
              isSessionActive={sessionActive}
              onToggleSession={toggleSession}
              onManualAttendanceToggle={handleManualAttendanceToggle}
              lecturerLocation={lecturerLocation}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
