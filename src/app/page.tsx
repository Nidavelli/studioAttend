"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, addDoc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore';
import { Header } from '@/components/header';
import { StudentView } from '@/components/student-view';
import { LecturerDashboard } from '@/components/lecturer-dashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Student, Unit, UnitWithAttendance, AttendanceRecord } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { haversineDistance } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { addSessionToUnitHistory } from '@/lib/units';

export type GeolocationCoordinates = {
  lat: number;
  lng: number;
};

export type SignedInStudent = {
  id: string;
  name: string;
  avatarId: string;
  signedInAt: string;
  isDuplicateDevice: boolean;
};

async function getStudentsFromIds(firestore: any, studentIds: string[]): Promise<Student[]> {
  if (studentIds.length === 0) return [];
  const students: Student[] = [];
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
        avatarId: `student-${(students.length % 5) + 1}`,
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
  const [studentUnits, setStudentUnits] = useState<UnitWithAttendance[]>([]);
  const [studentsInUnit, setStudentsInUnit] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const selectedUnit = useMemo(() => {
    return units.find(u => u.id === selectedUnitId) || null;
  }, [units, selectedUnitId]);

  const [sessionActive, setSessionActive] = useState(false);
  const [sessionPin, setSessionPin] = useState<string>('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
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
            fetchedUnits.push({ id: doc.id, ...doc.data() } as Unit);
        });
        
        if (role === 'lecturer') {
            setUnits(fetchedUnits);
            if (fetchedUnits.length > 0 && !selectedUnitId) {
                setSelectedUnitId(fetchedUnits[0].id);
            } else if (fetchedUnits.length === 0) {
                setSelectedUnitId(null);
            }
        } else { // student
            const fetchStudentAttendance = async () => {
                const unitsWithAttendance: UnitWithAttendance[] = await Promise.all(
                    fetchedUnits.map(async (unit) => {
                        const attendanceQuery = query(
                            collection(firestore, `units/${unit.id}/attendance`),
                            where("studentId", "==", user.uid)
                        );
                        const attendanceSnapshot = await getDocs(attendanceQuery);
                        return {
                            ...unit,
                            attendedSessionsCount: attendanceSnapshot.size,
                        };
                    })
                );
                setStudentUnits(unitsWithAttendance);
            };
            fetchStudentAttendance();
        }

        setIsDataLoading(false);
    }, (error) => {
        console.error("Error fetching units:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch units.' });
        setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, [role, user, firestore, toast, selectedUnitId]);

  // Effect for lecturers to fetch students and attendance records for the selected unit
  useEffect(() => {
    if (role !== 'lecturer' || !selectedUnit) {
      setStudentsInUnit([]);
      setAttendanceRecords([]);
      return;
    };
    
    const fetchUnitData = async () => {
        setIsDataLoading(true);
        const studentData = await getStudentsFromIds(firestore, selectedUnit.enrolledStudents);
        setStudentsInUnit(studentData);
        
        const attendanceQuery = collection(firestore, `units/${selectedUnit.id}/attendance`);
        const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
            const records: AttendanceRecord[] = [];
            snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data()} as AttendanceRecord));
            setAttendanceRecords(records);
        }, (error) => {
            console.error("Error fetching attendance records:", error);
            toast({ variant: 'destructive', title: 'Real-time Error', description: 'Could not sync attendance data.' });
        });
        
        setIsDataLoading(false);
        return unsubscribe;
    }
    
    const unsubscribePromise = fetchUnitData();
    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    }
  }, [selectedUnit, firestore, role, toast]);

    // Effect to restore session state for lecturer
    useEffect(() => {
        if (role === 'lecturer' && selectedUnit) {
            if (selectedUnit.activeSessionId && selectedUnit.sessionEndTime) {
                const endTime = (selectedUnit.sessionEndTime as Timestamp).toDate();
                if (new Date() < endTime) {
                    setSessionActive(true);
                    setActiveSessionId(selectedUnit.activeSessionId);
                    setSessionEndTime(endTime);
                } else {
                    // Clean up expired session from DB
                    const unitRef = doc(firestore, 'units', selectedUnit.id);
                    updateDoc(unitRef, {
                        activeSessionId: null,
                        sessionEndTime: null
                    });
                }
            }
        }
    }, [selectedUnit, role, firestore]);
    
  const endSession = useCallback(async () => {
    if (selectedUnitId) {
        const unitRef = doc(firestore, 'units', selectedUnitId);
        await updateDoc(unitRef, {
            activeSessionId: null,
            sessionEndTime: null,
        });
    }
    setSessionActive(false);
    setSignedInStudents([]);
    setUsedDeviceIds(new Set());
    setSessionEndTime(null);
    setSessionPin('');
    setActiveSessionId(null);
    setLecturerLocation(null);
  }, [selectedUnitId, firestore]);

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
  }, [sessionActive, sessionEndTime, toast, endSession]);

  const handleUnitChange = (unitId: string) => {
    if (sessionActive) {
      toast({ variant: "destructive", title: "Cannot Change Unit", description: "Please end the active session before changing the unit." });
      return;
    }
    setSelectedUnitId(unitId);
  };

  const recordSuccessfulSignIn = useCallback(async (studentId: string, signInMethod: 'location' | 'qr_code' | 'manual', deviceId?: string) => {
    if (!activeSessionId || !selectedUnitId) return null;

    const attendanceColRef = collection(firestore, `units/${selectedUnitId}/attendance`);
    
    // Prevent duplicate sign-ins for the same session
    const dupeQuery = query(attendanceColRef, where("studentId", "==", studentId), where("sessionId", "==", activeSessionId));
    const dupeSnapshot = await getDocs(dupeQuery);
    if (!dupeSnapshot.empty) {
        toast({ variant: "destructive", title: "Already Signed In", description: "You have already signed in for this session." });
        return studentsInUnit.find((s) => s.uid === studentId) || null;
    }

    const student = studentsInUnit.find((s) => s.uid === studentId);
    if (!student) return null;

    // Create a new attendance record
    await addDoc(attendanceColRef, {
        studentId: studentId,
        sessionId: activeSessionId,
        timestamp: serverTimestamp(),
        signInMethod: signInMethod,
    });

    // Device tracking only for student-initiated sign-ins
    let isDuplicateDevice = false;
    if (deviceId) {
        isDuplicateDevice = usedDeviceIds.has(deviceId);
        setUsedDeviceIds((prev) => new Set(prev).add(deviceId));
    }

    setSignedInStudents((prev) => [{
      id: student.uid,
      name: student.name,
      avatarId: student.avatarId,
      signedInAt: new Date().toLocaleTimeString(),
      isDuplicateDevice: isDuplicateDevice,
    }, ...prev]);
    
    toast({ title: "Sign-In Successful!", description: `${student.name}'s attendance for ${selectedUnit?.name} has been recorded.` });
    return student;
  }, [activeSessionId, selectedUnitId, firestore, studentsInUnit, usedDeviceIds, toast, selectedUnit]);

  const handleQrSignIn = (studentId: string, deviceId: string, pin: string, sessionIdFromQr: string): Student | null => {
    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({ variant: "destructive", title: "Session Expired", description: "The attendance session has ended." });
      setSessionActive(false);
      return null;
    }
    if (pin !== sessionPin) {
      toast({ variant: 'destructive', title: 'Incorrect PIN', description: 'The PIN is incorrect or has expired.' });
      return null;
    }
    if (sessionIdFromQr !== activeSessionId) {
        toast({ variant: 'destructive', title: 'Invalid Session', description: 'This QR code is for a different session.' });
        return null;
    }
    recordSuccessfulSignIn(studentId, 'qr_code', deviceId);
    return null;
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
    recordSuccessfulSignIn(studentId, 'location', deviceId);
    return { student: null };
  };

  const handleManualSignIn = async (studentId: string, sessionId: string) => {
    if (!selectedUnitId) return;

    const attendanceColRef = collection(firestore, `units/${selectedUnitId}/attendance`);
    const dupeQuery = query(attendanceColRef, where("studentId", "==", studentId), where("sessionId", "==", sessionId));
    const dupeSnapshot = await getDocs(dupeQuery);

    if (!dupeSnapshot.empty) {
        toast({ variant: "destructive", title: "Already Marked", description: "This student is already marked as present for this session." });
        return;
    }
    
    const student = studentsInUnit.find((s) => s.uid === studentId);
    if (!student) return;

    await addDoc(attendanceColRef, {
        studentId: studentId,
        sessionId: sessionId,
        timestamp: serverTimestamp(),
        signInMethod: 'manual',
    });

    toast({ title: "Attendance Marked", description: `${student.name} has been manually marked as present.` });
  };

  const toggleSession = async () => {
    if (!selectedUnitId) {
      toast({ variant: "destructive", title: "Cannot Start Session", description: "Please select a unit first." });
      return;
    }

    const unitRef = doc(firestore, 'units', selectedUnitId);

    if (sessionActive) {
      await endSession();
    } else {
       if (role === 'lecturer' && !lecturerLocation) {
        toast({ variant: "destructive", title: "Cannot Start Session", description: "Please set the session location." });
        return;
      }
      const newSessionId = `${Date.now()}`;
      await addSessionToUnitHistory(selectedUnitId!, newSessionId);

      const endTime = new Date(new Date().getTime() + sessionDuration * 60000);
      
      await updateDoc(unitRef, {
          activeSessionId: newSessionId,
          sessionEndTime: Timestamp.fromDate(endTime)
      });

      setActiveSessionId(newSessionId);
      setSessionEndTime(endTime);
      setSessionActive(true);
    }
  };

  const renderContent = () => {
    if (userLoading || isRoleLoading || (role && isDataLoading && (role === 'lecturer' ? !selectedUnit : studentUnits.length === 0 && units.length === 0))) {
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
          {role === 'lecturer' && (
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <h2 className="text-2xl font-bold font-headline">{selectedUnit?.name || "No Unit Selected"}</h2>
              <div className="flex items-center gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm"><PlusCircle className="mr-2 h-4 w-4"/> New Unit</Button>
                    </DialogTrigger>
                    {/* The content for this dialog is in LecturerDashboard */}
                  </Dialog>
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
          )}

          {role === 'student' && (
            <StudentView
              units={studentUnits}
              onLocationSignIn={handleLocationSignIn}
              onQrSignIn={handleQrSignIn}
              activeSessionUnitId={selectedUnitId}
              activeSessionId={activeSessionId}
            />
          )}

          {role === 'lecturer' && (
            <LecturerDashboard
              students={studentsInUnit}
              unit={selectedUnit!}
              signedInStudents={signedInStudents}
              attendanceRecords={attendanceRecords}
              isSessionActive={sessionActive}
              onToggleSession={toggleSession}
              sessionDuration={sessionDuration}
              setSessionDuration={setSessionDuration}
              sessionEndTime={sessionEndTime}
              sessionPin={sessionPin}
              activeSessionId={activeSessionId}
              lecturerLocation={lecturerLocation}
              setLecturerLocation={setLecturerLocation}
              radius={radius}
              setRadius={setRadius}
              onManualSignIn={handleManualSignIn}
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
