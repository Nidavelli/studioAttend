
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase/auth/use-user';
import { useAuth, useFirestore } from '@/firebase/provider';
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
};

export type UnitStatus = 'active' | 'recently_closed' | 'inactive';

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
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [role, setRole] = useState<'student' | 'lecturer' | null>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);

  const [units, setUnits] = useState<Unit[]>([]);
  const [studentUnits, setStudentUnits] = useState<UnitWithAttendance[]>([]);
  const [studentsInUnit, setStudentsInUnit] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [unitStatuses, setUnitStatuses] = useState<Record<string, UnitStatus>>({});

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  
  const endSession = useCallback(async () => {
    if (selectedUnitId) {
        const unitRef = doc(firestore, 'units', selectedUnitId);
        await updateDoc(unitRef, {
            activeSessionId: null,
            sessionEndTime: Timestamp.fromDate(new Date()), // Keep endTime to detect 'recently_closed'
        });
    }
    setSessionActive(false);
    // Do not nullify sessionEndTime here
    setSessionPin('');
    setActiveSessionId(null);
    setLecturerLocation(null);
  }, [selectedUnitId, firestore]);

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

  const liveLedgerStudents = useMemo(() => {
    if (!sessionActive || !activeSessionId) return [];

    const sessionRecords = attendanceRecords
        .filter(rec => rec.sessionId === activeSessionId)
        .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)); // Sort by timestamp descending

    return sessionRecords.map(record => {
        const student = studentsInUnit.find(s => s.uid === record.studentId);
        return student ? {
            id: student.uid,
            name: student.name,
            avatarId: student.avatarId,
            signedInAt: record.timestamp?.toDate()?.toLocaleTimeString() || 'Processing...',
        } : null;
    }).filter(Boolean) as SignedInStudent[];
  }, [sessionActive, activeSessionId, attendanceRecords, studentsInUnit]);

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
        if (auth.currentUser) {
          console.error("Error fetching user role:", error);
          setRole(null);
        }
      } finally {
        setIsRoleLoading(false);
      }
    };

    fetchRole();
  }, [user, userLoading, router, firestore, toast, auth]);

  // Effect for lecturers to fetch units
  useEffect(() => {
    if (role !== 'lecturer' || !user) return;
    
    setIsDataLoading(true);
    let q = query(collection(firestore, "units"), where("lecturerId", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedUnits: Unit[] = [];
        querySnapshot.forEach((doc) => {
            fetchedUnits.push({ id: doc.id, ...doc.data() } as Unit);
        });
        
        setUnits(fetchedUnits);
        if (fetchedUnits.length > 0 && !selectedUnitId) {
            setSelectedUnitId(fetchedUnits[0].id);
        } else if (fetchedUnits.length === 0) {
            setSelectedUnitId(null);
        }
        setIsDataLoading(false);
    }, (error) => {
        if (auth.currentUser) {
          console.error("Error fetching units:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch units.' });
        }
        setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, [role, user, firestore, toast, auth, selectedUnitId]);

  // Effect for students to fetch units
  useEffect(() => {
      if (role !== 'student' || !user) return;
      setIsDataLoading(true);
      const q = query(collection(firestore, "units"), where("enrolledStudents", "array-contains", user.uid));
      
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedUnits: Unit[] = [];
          querySnapshot.forEach((doc) => {
              const unitData = { id: doc.id, ...doc.data() } as Unit;
              fetchedUnits.push(unitData);
              // Real-time update for active session
              if (unitData.activeSessionId) {
                setSelectedUnitId(unitData.id);
                setActiveSessionId(unitData.activeSessionId);
              }
          });
  
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
          setIsDataLoading(false);
      }, (error) => {
          if (auth.currentUser) {
              console.error("Error fetching student units:", error);
              toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your units.' });
          }
          setIsDataLoading(false);
      });
  
      return () => unsubscribe();
  }, [role, user, firestore, toast, auth]);

  // Effect to manage unit statuses for students over time
  useEffect(() => {
      if (role !== 'student') return;
  
      const calculateStatuses = () => {
          const now = new Date();
          const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
          const newStatuses: Record<string, UnitStatus> = {};
          
          studentUnits.forEach(unit => {
              const endTime = unit.sessionEndTime ? (unit.sessionEndTime as Timestamp).toDate() : null;
  
              if (unit.activeSessionId && endTime && endTime > now) {
                  newStatuses[unit.id] = 'active';
              } else if (!unit.activeSessionId && endTime && endTime > fiveMinutesAgo && endTime < now) {
                  newStatuses[unit.id] = 'recently_closed';
              } else {
                  newStatuses[unit.id] = 'inactive';
              }
          });
          setUnitStatuses(newStatuses);
      };
  
      calculateStatuses();
      const intervalId = setInterval(calculateStatuses, 15000);
  
      return () => clearInterval(intervalId);
  }, [studentUnits, role]);

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
            if (auth.currentUser) {
              console.error("Error fetching attendance records:", error);
              toast({ variant: 'destructive', title: 'Real-time Error', description: 'Could not sync attendance data.' });
            }
        });
        
        setIsDataLoading(false);
        return unsubscribe;
    }
    
    const unsubscribePromise = fetchUnitData();
    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    }
  }, [selectedUnit, firestore, role, toast, auth]);

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
                    endSession();
                }
            } else {
              setSessionActive(false);
              setActiveSessionId(null);
              setSessionEndTime(null);
            }
        }
    }, [selectedUnit, role, endSession]);
    
  const handleUnitChange = (unitId: string) => {
    if (sessionActive) {
      toast({ variant: "destructive", title: "Cannot Change Unit", description: "Please end the active session before changing the unit." });
      return;
    }
    setSelectedUnitId(unitId);
  };

  const recordSuccessfulSignIn = useCallback(async (unitId: string, studentId: string, signInMethod: 'location' | 'qr_code' | 'manual', deviceId?: string): Promise<boolean> => {
    const unit = studentUnits.find(u => u.id === unitId) || units.find(u => u.id === unitId);
    if (!unit || !unit.activeSessionId) return false;
    
    const sessionId = unit.activeSessionId;
    const attendanceColRef = collection(firestore, `units/${unitId}/attendance`);
    
    const dupeQuery = query(attendanceColRef, where("studentId", "==", studentId), where("sessionId", "==", sessionId));
    const dupeSnapshot = await getDocs(dupeQuery);
    if (!dupeSnapshot.empty) {
        toast({ variant: "destructive", title: "Already Signed In", description: "You have already signed in for this session." });
        return false;
    }

    try {
        await addDoc(attendanceColRef, {
            studentId: studentId,
            sessionId: sessionId,
            timestamp: serverTimestamp(),
            signInMethod: signInMethod,
        });
        
        return true;
    } catch (e) {
        console.error("Error recording attendance:", e);
        toast({ variant: "destructive", title: "Sign-In Failed", description: "An error occurred while recording your attendance." });
        return false;
    }
  }, [firestore, toast, studentUnits, units, role]);

  const handleQrSignIn = async (unitId: string, studentId: string, deviceId: string, pin: string, sessionIdFromQr: string): Promise<{ success: boolean }> => {
    const unit = studentUnits.find(u => u.id === unitId);
    if (!unit) return { success: false };
    
    const sessionEndTime = unit.sessionEndTime ? (unit.sessionEndTime as Timestamp).toDate() : null;

    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({ variant: "destructive", title: "Session Expired", description: "The attendance session has ended." });
      return { success: false };
    }
    if (pin !== sessionPin) {
      toast({ variant: 'destructive', title: 'Incorrect PIN', description: 'The PIN is incorrect or has expired.' });
      return { success: false };
    }
    if (sessionIdFromQr !== unit.activeSessionId) {
        toast({ variant: 'destructive', title: 'Invalid Session', description: 'This QR code is for a different session.' });
        return { success: false };
    }
    const success = await recordSuccessfulSignIn(unitId, studentId, 'qr_code', deviceId);
    return { success };
  };
  
  const handleLocationSignIn = async (unitId: string, studentId: string, studentLocation: GeolocationCoordinates, deviceId: string): Promise<{ success: boolean; distance?: number }> => {
    const unit = studentUnits.find(u => u.id === unitId);
    if (!unit) return { success: false };
    
    const sessionEndTime = unit.sessionEndTime ? (unit.sessionEndTime as Timestamp).toDate() : null;
    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({ variant: "destructive", title: "Session Expired", description: "The attendance session has ended." });
      return { success: false };
    }

    const locationForCheck = unit.lecturerLocation;

    if (!locationForCheck) {
        toast({ variant: "destructive", title: "Location Not Set", description: "The lecturer has not set a location for this session." });
        return { success: false };
    }
    
    const distance = haversineDistance(studentLocation, locationForCheck);
    const sessionRadius = unit.sessionRadius || 50; // Use persisted radius or default

    if (distance > sessionRadius) {
        return { success: false, distance: Math.round(distance) };
    }

    const success = await recordSuccessfulSignIn(unitId, studentId, 'location', deviceId);
    return { success };
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
          sessionEndTime: Timestamp.fromDate(endTime),
          lecturerLocation: lecturerLocation, // Persist location for students
          sessionRadius: radius, // Persist radius for students
      });

      setActiveSessionId(newSessionId);
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
              unitStatuses={unitStatuses}
              onLocationSignIn={handleLocationSignIn}
              onQrSignIn={handleQrSignIn}
            />
          )}

          {role === 'lecturer' && (
            <LecturerDashboard
              students={studentsInUnit}
              unit={selectedUnit!}
              liveLedgerStudents={liveLedgerStudents}
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
