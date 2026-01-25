
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, getDoc } from 'firebase/firestore';
import { Header } from '@/components/header';
import { StudentView, type GeolocationCoordinates } from '@/components/student-view';
import { LecturerDashboard } from '@/components/lecturer-dashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Student, Course } from '@/lib/data';
import { courses as initialCourses } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { haversineDistance } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export type SignedInStudent = {
  id: string;
  name: string;
  avatarId: string;
  signedInAt: string;
  isDuplicateDevice: boolean;
};

export default function Home() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const [role, setRole] = useState<'student' | 'lecturer' | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(initialCourses[0].id);
  const [studentForReport, setStudentForReport] = useState<Student | null>(null);

  const selectedCourse = useMemo(() => {
    return courses.find(c => c.id === selectedCourseId)!;
  }, [courses, selectedCourseId]);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPin, setSessionPin] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState<number>(15);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  
  const [lecturerLocation, setLecturerLocation] = useState<GeolocationCoordinates | null>(null);
  const [radius, setRadius] = useState<number>(50);

  const [signedInStudents, setSignedInStudents] = useState<SignedInStudent[]>([]);
  const [usedDeviceIds, setUsedDeviceIds] = useState<Set<string>>(new Set());
  
  const { toast } = useToast();

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchRole = async () => {
      setIsRoleLoading(true);
      const userDocRef = doc(firestore, 'users', user.uid);
      try {
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setRole(userDocSnap.data().role);
        } else {
          console.error("User document not found. User might need to re-register or select a role.");
          toast({
            variant: "destructive",
            title: "Account Error",
            description: "Your user role could not be found. Please try logging in again.",
          });
          // Optional: sign out the user for a clean slate
          // signOut(auth);
          setRole(null);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole(null);
      } finally {
        setIsRoleLoading(false);
      }
    };

    fetchRole();
  }, [user, userLoading, router, firestore, toast]);


  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    let pinInterval: NodeJS.Timeout;

    if (sessionActive && sessionEndTime) {
      timerInterval = setInterval(() => {
        if (new Date() > sessionEndTime) {
          endSession();
          toast({
            title: "Session Ended",
            description: "The attendance session has automatically ended.",
          });
        }
      }, 1000);
      
      const generateNewPin = () => {
        const newPin = Math.floor(1000 + Math.random() * 9000).toString();
        setSessionPin(newPin);
      };
      generateNewPin();
      pinInterval = setInterval(generateNewPin, 15000);
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
    setLecturerLocation(null);
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

  const recordSuccessfulSignIn = (studentId: string, deviceId: string): Student | null => {
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

    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return null;
    const student = course.students.find((s) => s.id === studentId);
    if (!student) return null;

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
  }

  const handleQrSignIn = (studentId: string, deviceId: string, pin: string): Student | null => {
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
    
    return recordSuccessfulSignIn(studentId, deviceId);
  };
  
  const handleLocationSignIn = (studentId: string, studentLocation: GeolocationCoordinates, deviceId: string): { student: Student | null; distance?: number } => {
    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "The attendance session has ended.",
      });
      setSessionActive(false);
      return { student: null };
    }
    
    if (!lecturerLocation) {
        toast({
            variant: "destructive",
            title: "Location Not Set",
            description: "The lecturer has not set a location for this session.",
        });
        return { student: null };
    }

    const distance = haversineDistance(studentLocation, lecturerLocation);
    if (distance > radius) {
        return { student: null, distance: Math.round(distance) };
    }
    
    const student = recordSuccessfulSignIn(studentId, deviceId);
    return { student };
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
       if (!lecturerLocation && role === 'lecturer') {
        toast({
          variant: "destructive",
          title: "Cannot Start Session",
          description: "Please set the session location before starting.",
        });
        return;
      }
      const endTime = new Date(new Date().getTime() + sessionDuration * 60000);
      setSessionEndTime(endTime);
      setSessionActive(true);
    }
  };

  const renderContent = () => {
    if (userLoading || isRoleLoading) {
      return (
        <div className="w-full max-w-7xl mx-auto space-y-6 mt-8">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-10 w-full sm:w-64" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full max-w-md mx-auto" />
              <Skeleton className="h-96 w-full" />
            </div>
        </div>
      );
    }

    if (!role) {
      return (
        <div className="text-center py-10">
          <p className="text-lg text-destructive">Error: User role not found.</p>
          <p className="text-muted-foreground">Please try logging out and signing in again.</p>
        </div>
      );
    }

    return (
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

          {role === 'student' && (
            <StudentView
              students={selectedCourse.students}
              onLocationSignIn={handleLocationSignIn}
              onQrSignIn={handleQrSignIn}
              isSessionActive={sessionActive}
              sessionEndTime={sessionEndTime}
              courseName={selectedCourse.name}
              studentForReport={studentForReport}
              onCloseReport={() => setStudentForReport(null)}
            />
          )}

          {role === 'lecturer' && (
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
              lecturerLocation={lecturerLocation}
              setLecturerLocation={setLecturerLocation}
              radius={radius}
              setRadius={setRadius}
            />
          )}
        </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {renderContent()}
      </main>
    </div>
  );
}
