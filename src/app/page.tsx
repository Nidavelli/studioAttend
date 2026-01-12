"use client";

import React, { useState, useEffect, useMemo } from 'react';
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

export type Location = {
  latitude: number;
  longitude: number;
};

export default function Home() {
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourses[0].id);

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId)!;
  }, [courses, selectedCourseId]);

  const [sessionActive, setSessionActive] = useState(false);
  const [signedInStudents, setSignedInStudents] = useState<SignedInStudent[]>([]);
  const [lecturerLocation, setLecturerLocation] = useState<Location | null>(null);
  const [sessionRadius, setSessionRadius] = useState<number>(100);
  const [usedDeviceIds, setUsedDeviceIds] = useState<Set<string>>(new Set());
  const [sessionDuration, setSessionDuration] = useState<number>(15);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionActive && sessionEndTime) {
      interval = setInterval(() => {
        if (new Date() > sessionEndTime) {
          endSession();
          toast({
            title: "Session Ended",
            description: "The attendance session has automatically ended.",
          });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionActive, sessionEndTime, toast]);
  
  const endSession = () => {
    setSessionActive(false);
    setSignedInStudents([]);
    setLecturerLocation(null);
    setUsedDeviceIds(new Set());
    setSessionEndTime(null);
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

  const handleSignIn = (studentId: string, deviceId: string) => {
    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "The attendance session has ended.",
      });
      setSessionActive(false);
      return;
    }
    
    const student = selectedCourse.students.find((s) => s.id === studentId);
    if (student && !signedInStudents.some((s) => s.id === studentId)) {
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
      
      setCourses(currentCourses => currentCourses.map(course => {
        if (course.id === selectedCourseId) {
          const updatedStudents = course.students.map(s => {
            if (s.id === studentId) {
              const totalWeeks = Object.keys(s.attendance).length;
              const nextWeek = (totalWeeks > 0 ? Math.max(...Object.keys(s.attendance).map(Number)) : 0) + 1;
              return { ...s, attendance: { ...s.attendance, [nextWeek]: true } };
            }
            return s;
          });
          return { ...course, students: updatedStudents };
        }
        return course;
      }));
    }
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
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setLecturerLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
            const endTime = new Date(new Date().getTime() + sessionDuration * 60000);
            setSessionEndTime(endTime);
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
                lecturerLocation={lecturerLocation}
                sessionRadius={sessionRadius}
                sessionEndTime={sessionEndTime}
                courseName={selectedCourse.name}
              />
            </TabsContent>
            <TabsContent value="lecturer">
              <LecturerDashboard
                students={selectedCourse.students}
                signedInStudents={signedInStudents}
                isSessionActive={sessionActive}
                onToggleSession={toggleSession}
                onManualAttendanceToggle={handleManualAttendanceToggle}
                sessionRadius={sessionRadius}
                setSessionRadius={setSessionRadius}
                sessionDuration={sessionDuration}
                setSessionDuration={setSessionDuration}
                sessionEndTime={sessionEndTime}
                attendanceThreshold={selectedCourse.attendanceThreshold}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
