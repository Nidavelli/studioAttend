"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAuth, useFirestore } from '@/firebase/provider';
import { doc, getDoc, collection, query, where, onSnapshot, getDocs, addDoc, serverTimestamp, updateDoc, Timestamp, writeBatch, deleteDoc, arrayUnion } from 'firebase/firestore';
import { StudentView } from '@/components/student-view';
import { LecturerDashboard } from '@/components/lecturer-dashboard';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Student, Unit, UnitWithAttendance, AttendanceRecord } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { haversineDistance } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { deleteUnit as deleteUnitFromDb } from '@/lib/units';
import { Loader2 } from 'lucide-react';


export type GeolocationCoordinates = {
  lat: number;
  lng: number;
  accuracy?: number;
};

export type SignedInStudent = {
  id: string; // student uid
  recordId: string; // attendance record firestore id
  name: string;
  avatarId: string;
  signedInAt: string;
};

export type UnitStatus = 'active' | 'recently_closed' | 'inactive' | 'signed_in';

async function getStudentsFromIds(firestore: any, studentIds: string[]): Promise<Student[]> {
  if (studentIds.length === 0) return [];
  const students: Student[] = [];
  // Firestore 'in' queries are limited to 30 elements
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
        registrationNumber: data.registrationNumber,
        avatarStyle: data.avatarStyle,
        avatarSeed: data.avatarSeed,
      });
    });
  }
  return students;
}

function DashboardContent() {
  const { user, loading: userLoading } = useUserProfile();
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();

  const role = user?.role;

  const [units, setUnits] = useState<Unit[]>([]);
  const [studentUnits, setStudentUnits] = useState<UnitWithAttendance[]>([]);
  const [studentsInUnit, setStudentsInUnit] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentAttendanceRecords, setStudentAttendanceRecords] = useState<AttendanceRecord[]>([]);
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
            setIsDataLoading(false);
        }
    }, (error) => {
        if (auth.currentUser) {
          console.error("Error fetching units:", error);
          toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch units.' });
        }
        setIsDataLoading(false);
    });

    return () => unsubscribe();
  }, [role, user, firestore, toast, auth, selectedUnitId]);

  // Effect for students to fetch units and their own attendance records
  useEffect(() => {
      if (role !== 'student' || !user) return;
      setIsDataLoading(true);
      const q = query(collection(firestore, "units"), where("enrolledStudents", "array-contains", user.uid));
      
      const unsubscribeUnits = onSnapshot(q, (querySnapshot) => {
          const fetchedUnits: Unit[] = [];
          querySnapshot.forEach((doc) => {
              const unitData = { id: doc.id, ...doc.data() } as Unit;
              fetchedUnits.push(unitData);
              if (unitData.activeSessionId && unitData.sessionEndTime && (unitData.sessionEndTime as Timestamp).toDate() > new Date()) {
                setActiveSessionId(unitData.activeSessionId);
              }
          });
  
          const fetchStudentAttendance = async () => {
              const attendanceQuery = query(
                  collection(firestore, `units`), 
                  where("enrolledStudents", "array-contains", user.uid)
              );
              
              const attendanceRecords: AttendanceRecord[] = [];
              const unitSnapshots = await getDocs(attendanceQuery);
              for (const unitDoc of unitSnapshots.docs) {
                  const studentAttendanceQuery = query(
                      collection(firestore, `units/${unitDoc.id}/attendance`),
                      where("studentId", "==", user.uid)
                  );
                  const studentAttendanceSnapshot = await getDocs(studentAttendanceQuery);
                  studentAttendanceSnapshot.forEach(doc => {
                      attendanceRecords.push({ id: doc.id, ...doc.data() } as AttendanceRecord);
                  });
              }
              setStudentAttendanceRecords(attendanceRecords);

              const unitsWithAttendance: UnitWithAttendance[] = fetchedUnits.map((unit) => {
                      const attendedSessionIds = new Set(
                        attendanceRecords.filter(r => r.sessionId && unit.sessionHistory?.includes(r.sessionId)).map(r => r.sessionId)
                      );
                      return {
                          ...unit,
                          attendedSessionsCount: attendedSessionIds.size,
                      };
                  });
              
              setStudentUnits(unitsWithAttendance);
              setIsDataLoading(false);
          };
          fetchStudentAttendance();
          
      }, (error) => {
          if (auth.currentUser) {
              console.error("Error fetching student units:", error);
              toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch your units.' });
          }
          setIsDataLoading(false);
      });
  
      return () => unsubscribeUnits();
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
              const studentHasSignedIn = studentAttendanceRecords.some(r => r.sessionId === unit.activeSessionId);

              if (unit.activeSessionId && endTime && endTime > now) {
                  newStatuses[unit.id] = studentHasSignedIn ? 'signed_in' : 'active';
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
  }, [studentUnits, role, studentAttendanceRecords]);

  // Effect for lecturers to fetch students and attendance records for the selected unit
  useEffect(() => {
    if (role !== 'lecturer' || !selectedUnit || !user) {
      if (role === 'lecturer' && units.length > 0 && !selectedUnit) {
        setIsDataLoading(false);
      }
      return;
    };
    
    const fetchUnitData = async () => {
        if (!auth.currentUser) return;
        try {
          await auth.currentUser.getIdToken(true);
        } catch (tokenError) {
          console.error("Error refreshing auth token:", tokenError);
          setIsDataLoading(false);
          return;
        }

        setIsDataLoading(true);
        const studentData = await getStudentsFromIds(firestore, selectedUnit.enrolledStudents);
        setStudentsInUnit(studentData);
        
        const attendanceQuery = query(
          collection(firestore, `units/${selectedUnit.id}/attendance`)
        );

        const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
            const records: AttendanceRecord[] = [];
            snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data()} as AttendanceRecord));
            setAttendanceRecords(records);
            setIsDataLoading(false);
        }, (error: any) => {
            console.error("Error fetching attendance records:", error);
             if (auth.currentUser && error.code === 'permission-denied') {
              toast({ variant: 'destructive', title: 'Real-time Error', description: 'Could not sync attendance data.' });
            }
            setIsDataLoading(false);
        });
        
        return unsubscribe;
    }
    
    const unsubscribePromise = fetchUnitData();

    return () => {
      unsubscribePromise.then(unsubscribe => {
        if (unsubscribe) {
          unsubscribe();
        }
      });
    }
  }, [selectedUnit, firestore, role, user, toast, auth, units.length]);

    // Effect to restore session state for lecturer
    useEffect(() => {
        if (role === 'lecturer' && selectedUnit) {
            if (selectedUnit.activeSessionId && selectedUnit.sessionEndTime) {
                const endTime = (selectedUnit.sessionEndTime as Timestamp).toDate();
                if (new Date() < endTime) {
                    setSessionActive(true);
                    setActiveSessionId(selectedUnit.activeSessionId);
                    setSessionEndTime(endTime);
                    setLecturerLocation(selectedUnit.lecturerLocation || null);
                    setRadius(selectedUnit.sessionRadius || 50);
                } else {
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

  const handleUnitDelete = async (unitId: string) => {
    const result = await deleteUnitFromDb(unitId);
    if (result.success) {
      toast({ title: "Unit Deleted", description: "The unit has been successfully deleted." });
      if (selectedUnitId === unitId) {
        setSelectedUnitId(units.length > 1 ? units.filter(u => u.id !== unitId)[0].id : null);
      }
    } else {
      toast({ variant: "destructive", title: "Deletion Failed", description: result.error });
    }
  };

    const recordSuccessfulSignIn = useCallback(async (
        unitId: string,
        studentId: string,
        signInMethod: 'location' | 'qr_code' | 'manual',
        deviceId: string,
        locationData?: GeolocationCoordinates
    ): Promise<{ success: boolean; deviceWarning: boolean }> => {
        const unit = studentUnits.find(u => u.id === unitId) || units.find(u => u.id === unitId);
        if (!unit || !unit.activeSessionId) return { success: false, deviceWarning: false };

        const { activeSessionId: sessionId, lecturerId } = unit;
        if (!lecturerId) {
            console.error("Lecturer ID missing from unit data. Cannot create attendance record.");
            toast({ variant: "destructive", title: "Sign-In Failed", description: "System error: Unit is missing owner information." });
            return { success: false, deviceWarning: false };
        }

        const userDocRef = doc(firestore, 'users', studentId);
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            toast({ variant: "destructive", title: "Sign-In Failed", description: "System error: Your user profile could not be found." });
            return { success: false, deviceWarning: false };
        }
        const registrationNumber = userDoc.data().registrationNumber;
        if (!registrationNumber) {
             toast({ variant: "destructive", title: "Sign-In Failed", description: "System error: Your registration number is missing." });
            return { success: false, deviceWarning: false };
        }

        const attendanceColRef = collection(firestore, `units/${unitId}/attendance`);

        const studentQuery = query(attendanceColRef, where("studentId", "==", studentId), where("sessionId", "==", sessionId));
        const studentSnapshot = await getDocs(studentQuery);
        if (!studentSnapshot.empty) {
            toast({ variant: "destructive", title: "Already Signed In", description: "You have already signed in for this session." });
            return { success: false, deviceWarning: false };
        }

        let deviceWarning = false;
        const deviceQuery = query(attendanceColRef, where("deviceId", "==", deviceId), where("sessionId", "==", sessionId));
        const deviceSnapshot = await getDocs(deviceQuery);
        if (!deviceSnapshot.empty) {
            deviceWarning = true;
        }

        try {
            const newRecord: Partial<AttendanceRecord> = {
                studentId,
                registrationNumber,
                sessionId,
                lecturerId,
                timestamp: serverTimestamp(),
                signInMethod,
                deviceId,
                status: 'PENDING',
                deviceFlag: deviceWarning,
            };
            if (locationData) {
                newRecord.location = {
                    lat: locationData.lat,
                    lng: locationData.lng,
                    accuracy: locationData.accuracy || 0,
                };
            }
            await addDoc(attendanceColRef, newRecord);
            return { success: true, deviceWarning };
        } catch (e) {
            console.error("Error recording attendance:", e);
            toast({ variant: "destructive", title: "Sign-In Failed", description: "An error occurred while recording your attendance." });
            return { success: false, deviceWarning: false };
        }
    }, [firestore, toast, studentUnits, units]);


  const handleQrSignIn = async (unitId: string, studentId: string, deviceId: string, pin: string, sessionIdFromQr: string): Promise<{ success: boolean; deviceWarning: boolean }> => {
    const unit = studentUnits.find(u => u.id === unitId);
    if (!unit) return { success: false, deviceWarning: false };
    
    const sessionEndTime = unit.sessionEndTime ? (unit.sessionEndTime as Timestamp).toDate() : null;

    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({ variant: "destructive", title: "Session Expired", description: "The attendance session has ended." });
      return { success: false, deviceWarning: false };
    }

    if (sessionIdFromQr !== unit.activeSessionId) {
        toast({ variant: 'destructive', title: 'Invalid Session', description: 'This QR code is for a different session.' });
        return { success: false, deviceWarning: false };
    }
    return recordSuccessfulSignIn(unitId, studentId, 'qr_code', deviceId);
  };
  
  const handleLocationSignIn = async (unitId: string, studentId: string, studentLocation: GeolocationCoordinates, deviceId: string): Promise<{ success: boolean; deviceWarning: boolean; distance?: number }> => {
    const unit = studentUnits.find(u => u.id === unitId);
    if (!unit) return { success: false, deviceWarning: false };
    
    const sessionEndTime = unit.sessionEndTime ? (unit.sessionEndTime as Timestamp).toDate() : null;
    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({ variant: "destructive", title: "Session Expired", description: "The attendance session has ended." });
      return { success: false, deviceWarning: false };
    }

    const locationForCheck = unit.lecturerLocation;

    if (!locationForCheck) {
        toast({ variant: "destructive", title: "Location Not Set", description: "The lecturer has not set a location for this session." });
        return { success: false, deviceWarning: false };
    }

    const studentAccuracy = studentLocation.accuracy || 0;
    if (studentAccuracy > 50) {
        toast({
            variant: "destructive",
            title: "Poor GPS Signal",
            description: `Your location accuracy is over 50 meters. Please move to a more open area and try again.`,
        });
        return { success: false, deviceWarning: false };
    }
    
    const distance = haversineDistance(studentLocation, locationForCheck);
    const sessionRadius = unit.sessionRadius || 50;
    const graceDistance = 20; // 20-meter buffer for accuracy issues

    if (distance > (sessionRadius + studentAccuracy + graceDistance)) {
        return { success: false, deviceWarning: false, distance: Math.round(distance) };
    }

    return recordSuccessfulSignIn(unitId, studentId, 'location', deviceId, studentLocation);
  };

  const handleManualSignIn = async (studentId: string, sessionId: string) => {
    if (!selectedUnitId || !selectedUnit || !user) return;
    
    const { lecturerId } = selectedUnit;
    if (!lecturerId) {
      console.error("Lecturer ID is missing from the selected unit.");
      toast({ variant: "destructive", title: "Error", description: "Cannot manually sign in. Unit owner is not defined."});
      return;
    }

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
        registrationNumber: student.registrationNumber,
        sessionId: sessionId,
        lecturerId: lecturerId,
        timestamp: serverTimestamp(),
        signInMethod: 'manual',
        status: 'APPROVED', // Manual sign-ins are auto-approved
        deviceFlag: false,
        deviceId: `manual-${user.uid}`
    });

    toast({ title: "Attendance Marked", description: `${student.name} has been manually marked as present.` });
  };
  
    const updateAttendanceStatus = async (recordId: string, status: 'APPROVED' | 'REJECTED') => {
        if (!selectedUnitId) return;
        const recordRef = doc(firestore, `units/${selectedUnitId}/attendance`, recordId);
        try {
            await updateDoc(recordRef, { status: status });
            toast({ title: 'Attendance Updated', description: `The record has been marked as ${status.toLowerCase()}.`});
        } catch (error) {
            console.error("Error updating attendance status:", error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the attendance record.' });
        }
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
      const endTime = new Date(new Date().getTime() + sessionDuration * 60000);
      
      await updateDoc(unitRef, {
          activeSessionId: newSessionId,
          sessionEndTime: Timestamp.fromDate(endTime),
          lecturerLocation: lecturerLocation,
          sessionRadius: radius,
          sessionHistory: arrayUnion(newSessionId),
      });

      setActiveSessionId(newSessionId);
      setSessionEndTime(endTime);
      setSessionActive(true);
    }
  };

  if (userLoading || isDataLoading) {
      return (
          <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6 mt-8">
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

  return (
    <main className="container mx-auto flex-1 p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl mx-auto space-y-6">
          {role === 'lecturer' && (
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
              <h2 className="text-2xl font-bold font-headline">{selectedUnit?.name || "No Unit Selected"}</h2>
              <div className="flex items-center gap-2">
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

          {role === 'student' && user && (
            <StudentView
              units={studentUnits}
              unitStatuses={unitStatuses}
              onLocationSignIn={handleLocationSignIn}
              onQrSignIn={handleQrSignIn}
              user={user}
              attendanceRecords={studentAttendanceRecords}
            />
          )}

          {role === 'lecturer' && user && (
            <LecturerDashboard
              lecturer={user}
              allUnits={units}
              students={studentsInUnit}
              unit={selectedUnit!}
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
              onDeleteUnit={handleUnitDelete}
              onUpdateAttendanceStatus={updateAttendanceStatus}
            />
          )}
        </div>
    </main>
  );
}

export default function Home() {
    const { user, loading } = useUserProfile();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/auth?redirected=true');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    return <DashboardContent />;
}
