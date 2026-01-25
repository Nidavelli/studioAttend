
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, type DocumentData } from 'firebase/firestore';
import { Header } from '@/components/header';
import { StudentView, type GeolocationCoordinates } from '@/components/student-view';
import { LecturerDashboard } from '@/components/lecturer-dashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Student, Unit } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { haversineDistance } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export type SignedInStudent = {
  id: string;
  name: string;
  avatarId: string;
  signedInAt: string;
  isDuplicateDevice: boolean;
};

// Helper to fetch multiple user documents from a list of UIDs
async function getStudentsFromIds(firestore: any, studentIds: string[]): Promise<Student[]> {
  if (studentIds.length === 0) return [];
  const students: Student[] = [];
  // Firestore 'in' query is limited to 30 items, so we fetch in batches
  for (let i = 0; i < studentIds.length; i += 30) {
    const batchIds = studentIds.slice(i, i + 30);
    const q = query(collection(firestore, 'users'), where('uid', 'in', batchIds));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      students.push({
        uid: data.uid,
        name: data.name,
        email: data.email,
        role: data.role,
        avatarId: `student-${(students.length % 5) + 1}`, // Temporary avatar logic
        attendance: {}, // Attendance is now managed locally in page.tsx
      });
    });
  }
  return students;
}


export default function Home() {
  const { user, loading: userLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = useState<'student' | 'lecturer' | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  const [units, setUnits] = useState<Unit[]>([]);
  const [studentsInUnit, setStudentsInUnit] = useState<Student[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  
  const [studentForReport, setStudentForReport] = useState<Student | null>(null);

  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId) || null;
  }, [units, selectedUnitId]);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPin, setSessionPin] = useState<string>('');
  const [sessionDuration, setSessionDuration] = useState<number>(15);
  const [sessionEndTime, setSessionEndTime] = useState<Date | null>(null);
  
  const [lecturerLocation, setLecturerLocation] = useState<GeolocationCoordinates | null>(null);
  const [radius, setRadius] = useState<number>(50);

  const [signedInStudents, setSignedInStudents] = useState<SignedInStudent[]>([]);
  const [usedDeviceIds, setUsedDeviceIds] = useState<Set<string>>(new Set());

  // Effect to fetch user role
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
          toast({ variant: "destructive", title: "Account Error", description: "Your user role could not be found." });
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

  // Effect to fetch units based on role
  useEffect(() => {
    if (!role || !user) return;
    
    setIsDataLoading(true);
    let q;
    if (role === 'lecturer') {
        q = query(collection(firestore, "units"), where("lecturerId", "==", user.uid));
    } else { // student
        q = query(collection(firestore, "units"), where("enrolledStudents", "array-contains", user.uid));
    }
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedUnits: Unit[] = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            fetchedUnits.push({ id: doc.id, ...data } as Unit);
        });
        setUnits(fetchedUnits);
        if (fetchedUnits.length > 0 && !selectedUnitId) {
            setSelectedUnitId(fetchedUnits[0].id);
        } else if (fetchedUnits.length === 0) {
            setSelectedUnitId(null);
        }
        setIsDataLoading(false);
    }, (error) => {
        console.error("Error fetching units:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch units.' });
        setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, [role, user, firestore, toast]);

  // Effect to fetch students when selected unit changes
  useEffect(() => {
    if (!selectedUnit) {
      setStudentsInUnit([]);
      return;
    };
    
    const fetchStudents = async () => {
        setIsDataLoading(true);
        const studentData = await getStudentsFromIds(firestore, selectedUnit.enrolledStudents);
        // Initialize or update local attendance state for students
        setStudentsInUnit(prevStudents => {
            return studentData.map(newStudent => {
                const existingStudent = prevStudents.find(s => s.uid === newStudent.uid);
                return {
                    ...newStudent,
                    attendance: existingStudent?.attendance || {}
                };
            });
        });
        setIsDataLoading(false);
    }
    fetchStudents();
  }, [selectedUnit, firestore]);

  // Session timer and PIN generation logic
  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    let pinInterval: NodeJS.Timeout;

    if (sessionActive && sessionEndTime) {
      timerInterval = setInterval(() => {
        if (new Date() > sessionEndTime) {
          endSession();
          toast({ title: "Session Ended", description: "The attendance session has automatically ended." });
        }
      }, 1000);
      
      const generateNewPin = () => setSessionPin(Math.floor(1000 + Math.random() * 9000).toString());
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

  const handleUnitChange = (unitId: string) => {
    if (sessionActive) {
      toast({ variant: "destructive", title: "Cannot Change Unit", description: "Please end the active session before changing the unit." });
      return;
    }
    setSelectedUnitId(unitId);
  };

  const recordSuccessfulSignIn = (studentId: string, deviceId: string): Student | null => {
     if (signedInStudents.some((s) => s.id === studentId)) {
        toast({ variant: "destructive", title: "Already Signed In", description: "You have already signed in for this session." });
        const currentStudent = studentsInUnit.find(s => s.uid === studentId);
        if (currentStudent) setStudentForReport(currentStudent);
        return currentStudent || null;
    }

    const student = studentsInUnit.find((s) => s.uid === studentId);
    if (!student) return null;

    const isDuplicate = usedDeviceIds.has(deviceId);

    setSignedInStudents((prev) => [{
      id: student.uid,
      name: student.name,
      avatarId: student.avatarId,
      signedInAt: new Date().toLocaleTimeString(),
      isDuplicateDevice: isDuplicate,
    }, ...prev]);
    setUsedDeviceIds((prev) => new Set(prev).add(deviceId));
    
    let finalUpdatedStudent: Student | null = null;
    
    setStudentsInUnit(currentStudents => {
      const newStudents = currentStudents.map(s => {
        if (s.uid === studentId) {
          const totalWeeks = Object.keys(s.attendance).length;
          const nextWeek = (totalWeeks > 0 ? Math.max(...Object.keys(s.attendance).map(Number)) : 0) + 1;
          const newAttendance = { ...s.attendance, [nextWeek]: true };
          finalUpdatedStudent = { ...s, attendance: newAttendance };
          return finalUpdatedStudent;
        }
        return s;
      });

      if (finalUpdatedStudent) {
        setStudentForReport(finalUpdatedStudent);
      }
      return newStudents;
    });

    return finalUpdatedStudent;
  }

  const handleQrSignIn = (studentId: string, deviceId: string, pin: string): Student | null => {
    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({ variant: "destructive", title: "Session Expired", description: "The attendance session has ended." });
      setSessionActive(false);
      return null;
    }
    if (pin !== sessionPin) {
      toast({ variant: 'destructive', title: 'Incorrect PIN', description: 'The PIN is incorrect or has expired.' });
      return null;
    }
    return recordSuccessfulSignIn(studentId, deviceId);
  };
  
  const handleLocationSignIn = (studentId: string, studentLocation: GeolocationCoordinates, deviceId: string): { student: Student | null; distance?: number } => {
    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({ variant: "destructive", title: "Session Expired", description: "The attendance session has ended." });
      setSessionActive(false);
      return { student: null };
    }
    if (!lecturerLocation) {
        toast({ variant: "destructive", title: "Location Not Set", description: "The lecturer has not set a location." });
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
    setStudentsInUnit(currentStudents => currentStudents.map(student => {
      if (student.uid === studentId) {
        const newAttendance = { ...student.attendance };
        newAttendance[week] = !newAttendance[week];
        return { ...student, attendance: newAttendance };
      }
      return student;
    }));
  };

  const toggleSession = () => {
    if (sessionActive) {
      endSession();
    } else {
       if (!lecturerLocation && role === 'lecturer') {
        toast({ variant: "destructive", title: "Cannot Start Session", description: "Please set the session location." });
        return;
      }
      const endTime = new Date(new Date().getTime() + sessionDuration * 60000);
      setSessionEndTime(endTime);
      setSessionActive(true);
    }
  };

  const renderContent = () => {
    if (userLoading || isRoleLoading || (role && isDataLoading)) {
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
        </div>
      );
    }

    return (
       <div className="w-full max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <h2 className="text-2xl font-bold font-headline">{selectedUnit?.name || "No Unit Selected"}</h2>
            <div className="flex items-center gap-2">
              {role === 'lecturer' && 
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/> New Unit</Button>
                  </DialogTrigger>
                  {/* The content for this dialog is in LecturerDashboard */}
                </Dialog>
              }
              <div className="w-full sm:w-auto min-w-64">
                <Select onValueChange={handleUnitChange} value={selectedUnitId || ""} disabled={sessionActive}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.code}: {unit.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {role === 'student' && (
            <StudentView
              students={studentsInUnit}
              unit={selectedUnit!}
              onLocationSignIn={handleLocationSignIn}
              onQrSignIn={handleQrSignIn}
              isSessionActive={sessionActive}
              sessionEndTime={sessionEndTime}
              studentForReport={studentForReport}
              onCloseReport={() => setStudentForReport(null)}
            />
          )}

          {role === 'lecturer' && (
            <LecturerDashboard
              students={studentsInUnit}
              unit={selectedUnit!}
              signedInStudents={signedInStudents}
              isSessionActive={sessionActive}
              onToggleSession={toggleSession}
              onManualAttendanceToggle={handleManualAttendanceToggle}
              sessionDuration={sessionDuration}
              setSessionDuration={setSessionDuration}
              sessionEndTime={sessionEndTime}
              sessionPin={sessionPin}
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
