
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { Header } from '@/components/header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StudentView } from '@/components/student-view';
import { LecturerDashboard } from '@/components/lecturer-dashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Student, Course } from '@/lib/data';
import { courses as initialCourses } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";

export type SignedInStudent = {
  id: string;
  name: string;
  avatarId: string;
  signedInAt: string;
  isDuplicateDevice: boolean;
};

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourses[0].id);
  const [studentForReport, setStudentForReport] = useState<Student | null>(null);

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId)!;
  }, [courses, selectedCourseId]);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPin, setSessionPin] = useState<string>('');
  const [signedInStudents, setSignedInStudents] = useState<SignedInStudent[]>([]);
  const [usedDeviceIds, setUsedDeviceIds] = useState<Set<string>>(new Set());
  const [sessionDuration, setSessionDuration] = useState<number>(15);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);


  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    let pinInterval: NodeJS.Timeout;

    if (sessionActive && sessionEndTime) {
      // Timer to end the session
      timerInterval = setInterval(() => {
        if (new Date() > sessionEndTime) {
          endSession();
          toast({
            title: "Session Ended",
            description: "The attendance session has automatically ended.",
          });
        }
      }, 1000);
      
      // Timer to update the PIN
      const generateNewPin = () => {
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();
        setSessionPin(newPin);
      };
      generateNewPin(); // Generate initial PIN
      pinInterval = setInterval(generateNewPin, 15000); // Generate new PIN every 15 seconds
    }
    return () => {
      clearInterval(timerInterval);
      clearInterval(pinInterval);
    };
  }, [sessionActive, sessionEndTime, toast]);
  
  const endSession = () => {
    setSessionActive(false);
    setSignedInStudents([]);
    setUsedDeviceIds(new Set());
    setSessionEndTime(null);
    setSessionPin('');
  };

  const handleCourseChange = (courseId: string) => {
    if (sessionActive) {
      toast({
        variant: "destructive",
        title: "Cannot Change Course",
        description: "Please end the active session before changing the course.",
      });
      return;
    }
    setSelectedCourseId(courseId);
  };

  const handleSignIn = (studentId: string, deviceId: string, pin: string): Student | null => {
    if (sessionEndTime && new Date() > sessionEndTime) {
        toast({
            variant: "destructive",
            title: "Session Expired",
            description: "The attendance session has ended.",
        });
        setSessionActive(false);
        return null;
    }

    if (pin !== sessionPin) {
      toast({
        variant: 'destructive',
        title: 'Incorrect PIN',
        description: 'The PIN you entered is incorrect or has expired. Please try again.',
      });
      return null;
    }

    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return null;
    
    const student = course.students.find((s) => s.id === studentId);
    if (!student) return null;

    if (signedInStudents.some((s) => s.id === studentId)) {
        toast({
            variant: "destructive",
            title: "Already Signed In",
            description: "You have already signed in for this session.",
        });
        const currentCourse = courses.find(c => c.id === selectedCourseId);
        const currentStudent = currentCourse?.students.find(s => s.id === studentId);
        if (currentStudent) {
          setStudentForReport(currentStudent);
        }
        return currentStudent || null;
    }

    const isDuplicate = usedDeviceIds.has(deviceId);

    const newSignedInStudent: SignedInStudent = {
      id: student.id,
      name: student.name,
      avatarId: student.avatarId,
      signedInAt: new Date().toLocaleTimeString(),
      isDuplicateDevice: isDuplicate,
    };

    setSignedInStudents((prev) => [newSignedInStudent, ...prev]);
    setUsedDeviceIds((prev) => new Set(prev).add(deviceId));
    
    let finalUpdatedStudent: Student | null = null;
    
    setCourses(currentCourses => {
      const newCourses = currentCourses.map(c => {
        if (c.id === selectedCourseId) {
          const updatedStudents = c.students.map(s => {
            if (s.id === studentId) {
              const totalWeeks = Object.keys(s.attendance).length;
              const nextWeek = (totalWeeks > 0 ? Math.max(...Object.keys(s.attendance).map(Number)) : 0) + 1;
              const newAttendance = { ...s.attendance, [nextWeek]: true };
              finalUpdatedStudent = { ...s, attendance: newAttendance };
              return finalUpdatedStudent;
            }
            return s;
          });
          return { ...c, students: updatedStudents };
        }
        return c;
      });

      if (finalUpdatedStudent) {
        setStudentForReport(finalUpdatedStudent);
      }
      return newCourses;
    });

    return finalUpdatedStudent;
  };


  const handleManualAttendanceToggle = (studentId: string, week: string) => {
    setCourses(currentCourses => currentCourses.map(course => {
      if (course.id === selectedCourseId) {
        const updatedStudents = course.students.map(student => {
          if (student.id === studentId) {
            const newAttendance = { ...student.attendance };
            newAttendance[week] = !newAttendance[week];
            return { ...student, attendance: newAttendance };
          }
          return student;
        });
        return { ...course, students: updatedStudents };
      }
      return course;
    }));
  };

  const toggleSession = () => {
    if (sessionActive) {
      endSession();
    } else {
      const endTime = new Date(new Date().getTime() + sessionDuration * 60000);
      setSessionEndTime(endTime);
      setSessionActive(true);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <h2 className="text-2xl font-bold font-headline">{selectedCourse.name}</h2>
            <div className="w-full sm:w-auto min-w-64">
              <Select onValueChange={handleCourseChange} value={selectedCourseId} disabled={sessionActive}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code}: {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
              <TabsTrigger value="student">Student</TabsTrigger>
              <TabsTrigger value="lecturer">Lecturer</TabsTrigger>
            </TabsList>
            <TabsContent value="student">
              <StudentView
                students={selectedCourse.students}
                onSignIn={handleSignIn}
                isSessionActive={sessionActive}
                sessionEndTime={sessionEndTime}
                courseName={selectedCourse.name}
                studentForReport={studentForReport}
                onCloseReport={() => setStudentForReport(null)}
              />
            </TabsContent>
            <TabsContent value="lecturer">
              <LecturerDashboard
                students={selectedCourse.students}
                courseName={selectedCourse.name}
                signedInStudents={signedInStudents}
                isSessionActive={sessionActive}
                onToggleSession={toggleSession}
                onManualAttendanceToggle={handleManualAttendanceToggle}
                sessionDuration={sessionDuration}
                setSessionDuration={setSessionDuration}
                sessionEndTime={sessionEndTime}
                sessionPin={sessionPin}
                attendanceThreshold={selectedCourse.attendanceThreshold}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
