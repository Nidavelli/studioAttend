
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Fingerprint, CheckCircle, XCircle, AlertTriangle, QrCode, Pin, MapPin, PlusCircle, Sparkles, BookOpen } from 'lucide-react';
import type { UnitWithAttendance, AttendanceRecord } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { generateSimpleId } from '@/lib/utils';
import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { joinUnit } from '@/lib/units';
import { useUser } from '@/firebase/auth/use-user';
import { Progress } from '@/components/ui/progress';
import type { GeolocationCoordinates, UnitStatus } from '@/app/page';
import Confetti from 'react-confetti';
import { useWindowSize } from '@react-hook/window-size';
import { StudentAttendanceGrid } from './student-attendance-grid';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';
import { Skeleton } from './ui/skeleton';


type SignInStep = 'idle' | 'methodChoice' | 'locating' | 'scanning' | 'pinEntry' | 'recording' | 'success' | 'error' | 'locationError';
type SignInError = {
  title: string;
  description: string;
} | null;

const joinUnitFormSchema = z.object({
  unitCode: z.string().min(3, "Unit code must be at least 3 characters."),
});

function JoinUnitForm({ setOpen }: { setOpen: (open: boolean) => void }) {
  const { user } = useUser();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof joinUnitFormSchema>>({
    resolver: zodResolver(joinUnitFormSchema),
    defaultValues: { unitCode: "" },
  });

  async function onSubmit(values: z.infer<typeof joinUnitFormSchema>) {
     if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to join a unit." });
        return;
    }
    const result = await joinUnit(values.unitCode, user.uid);
    if (result.success) {
      toast({ title: "Unit Joined", description: `You have successfully joined the unit.` });
      setOpen(false);
      form.reset();
    } else {
      toast({ variant: "destructive", title: "Failed to Join", description: result.error });
    }
  }

  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="unitCode"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unit Code</FormLabel>
                        <FormControl>
                            <Input placeholder="Enter the code from your lecturer" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Join Unit
            </Button>
        </form>
      </Form>
  )
}

function UnitCard({ 
  unit, 
  status,
  onSignIn,
  onViewAttendance,
}: { 
  unit: UnitWithAttendance, 
  status: UnitStatus,
  onSignIn: (unitId: string) => void,
  onViewAttendance: (unit: UnitWithAttendance) => void,
}) {
  const totalSessions = unit.sessionHistory?.length || 0;
  const percentage = totalSessions > 0 ? Math.round((unit.attendedSessionsCount / totalSessions) * 100) : 0;
  const isAtRisk = percentage < unit.attendanceThreshold;

  const getButtonContent = () => {
    switch (status) {
        case 'active':
            return (
                <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Sign In Now
                </>
            );
        case 'recently_closed':
            return 'Session Closed';
        case 'inactive':
        default:
            return 'Session Inactive';
    }
  };

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{unit.name}</CardTitle>
        <CardDescription>{unit.code}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Attendance</span>
            <span className={`text-sm font-bold ${isAtRisk ? 'text-destructive' : 'text-foreground'}`}>{percentage}%</span>
          </div>
          <Progress value={percentage} className={isAtRisk ? '[&>div]:bg-destructive' : ''} />
          <p className="text-xs text-muted-foreground mt-1">
            Attended {unit.attendedSessionsCount} of {totalSessions} sessions.
          </p>
        </div>
      </CardContent>
      <CardFooter className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline"
          onClick={() => onViewAttendance(unit)}
        >
          <BookOpen className="mr-2 h-4 w-4" /> View
        </Button>
        <Button 
          className={`${status === 'active' ? 'animate-pulse' : ''}`}
          disabled={status !== 'active'}
          onClick={() => onSignIn(unit.id)}
        >
          {getButtonContent()}
        </Button>
      </CardFooter>
    </Card>
  )
}


export function StudentView({
  units,
  unitStatuses,
  onLocationSignIn,
  onQrSignIn,
}: {
  units: UnitWithAttendance[];
  unitStatuses: Record<string, UnitStatus>;
  onLocationSignIn: (unitId: string, studentId: string, location: GeolocationCoordinates, deviceId: string) => Promise<{ success: boolean, distance?: number }>;
  onQrSignIn: (unitId: string, studentId: string, deviceId: string, pin: string, sessionIdFromQr: string) => Promise<{ success: boolean }>;
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [signInStep, setSignInStep] = useState<SignInStep>('idle');
  const [signInError, setSignInError] = useState<SignInError>(null);
  const [pin, setPin] = useState('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [qrData, setQrData] = useState<{unitId: string, sessionId: string} | null>(null);
  const { toast } = useToast();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrReaderId = "qr-reader";
  const [isJoinUnitOpen, setIsJoinUnitOpen] = useState(false);
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);
  const [signingInUnitId, setSigningInUnitId] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [width, height] = useWindowSize();

  const [viewingAttendanceUnit, setViewingAttendanceUnit] = useState<UnitWithAttendance | null>(null);
  const [viewingAttendanceRecords, setViewingAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  useEffect(() => {
    setDeviceId(generateSimpleId());
  }, []);

  useEffect(() => {
    if (viewingAttendanceUnit && user) {
      setIsLoadingAttendance(true);
      const attendanceQuery = query(
        collection(firestore, `units/${viewingAttendanceUnit.id}/attendance`),
        where("studentId", "==", user.uid)
      );
      const unsubscribe = onSnapshot(attendanceQuery, (snapshot) => {
        const records: AttendanceRecord[] = [];
        snapshot.forEach(doc => records.push({ id: doc.id, ...doc.data() } as AttendanceRecord));
        setViewingAttendanceRecords(records);
        setIsLoadingAttendance(false);
      }, (error) => {
        console.error("Error fetching attendance details:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch attendance details.' });
        setIsLoadingAttendance(false);
      });
      return () => unsubscribe();
    }
  }, [viewingAttendanceUnit, user, firestore, toast]);

  useEffect(() => {
    if (signInStep === 'scanning' && isSignInDialogOpen) {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrReaderId);
      }
      const qrCode = html5QrCodeRef.current;
      
      const onScanSuccess = (decodedText: string, result: Html5QrcodeResult) => {
        if (qrCode.isScanning) {
          qrCode.stop().then(() => {
            try {
              const data = JSON.parse(decodedText);
              if (data.unitId && data.sessionId) {
                setQrData(data);
                setSignInStep('pinEntry');
                toast({ title: "QR Code Scanned" });
              } else {
                throw new Error("Invalid QR code data");
              }
            } catch (e) {
                toast({ variant: 'destructive', title: 'Invalid QR Code', description: 'This QR code is not for AttendSync.' });
                resetSignInFlow();
            }
          }).catch(err => console.error("Failed to stop scanner", err));
        }
      };

      qrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        onScanSuccess,
        (errorMessage: string) => {}
      ).catch(err => {
        toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not start QR scanner. Please grant camera permissions.' });
        resetSignInFlow();
      });
    }

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => {});
      }
    };
  }, [signInStep, isSignInDialogOpen, toast]);
  
  const resetSignInFlow = () => {
    setSignInStep('methodChoice');
    setPin('');
    setSignInError(null);
    setQrData(null);
    if(signingInUnitId) setSigningInUnitId(null);
    setShowConfetti(false);
  };
  
  const startSignIn = (unitId: string) => {
    setSigningInUnitId(unitId);
    setIsSignInDialogOpen(true);
    setSignInStep('methodChoice');
  }

  const handleViewAttendance = (unit: UnitWithAttendance) => {
    setViewingAttendanceUnit(unit);
  };

  const recordQrAttendance = async () => {
    if (!user || !qrData || !signingInUnitId) return;
    setSignInStep('recording');
    const { success } = await onQrSignIn(signingInUnitId, user.uid, deviceId!, pin, qrData.sessionId);
    if (success) {
      setShowConfetti(true);
      setSignInStep('success');
    } else {
      setSignInError({ title: "Sign-in Failed", description: "The PIN was incorrect, session expired, or you already signed in." });
      setSignInStep('error');
    }
  };
  
  const handleLocationAuth = () => {
    if (!user || !signingInUnitId) return;
    setSignInStep('locating');
    if (!navigator.geolocation) {
      setSignInError({ title: "Location Not Supported", description: "Your browser does not support geolocation. Please use the QR code method." });
      setSignInStep('locationError');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const studentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSignInStep('recording');
        
        const { success, distance } = await onLocationSignIn(signingInUnitId, user.uid, studentLocation, deviceId!);
        
        if (success) {
          setShowConfetti(true);
          setSignInStep('success');
        } else {
          if (distance) {
              setSignInError({ title: "Too Far Away", description: `You are approximately ${distance} meters from the classroom. Please move closer.` });
          } else {
              setSignInError({ title: "Sign-in Failed", description: `Could not verify your location or you may have already signed in.` });
          }
          setSignInStep('locationError');
        }
      },
      (error) => {
        setSignInError({ title: "Location Access Denied", description: "Please enable location services in your browser settings, or use the QR code sign-in method." });
        setSignInStep('locationError');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter a 4-digit PIN.' });
      return;
    }
    recordQrAttendance();
  };

  if (units.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Welcome, Student!</CardTitle>
            <CardDescription>You are not enrolled in any units. Join a unit to see attendance sessions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isJoinUnitOpen} onOpenChange={setIsJoinUnitOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2"/> Join a Unit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a New Unit</DialogTitle>
                  <DialogDescription>
                    Enter the unit code provided by your lecturer.
                  </DialogDescription>
                </DialogHeader>
                <JoinUnitForm setOpen={setIsJoinUnitOpen} />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  const renderSignInContent = () => {
    switch (signInStep) {
      case 'methodChoice':
        return (
            <div className="w-full grid grid-cols-1 gap-4">
                <Button onClick={handleLocationAuth} size="lg"><MapPin className="mr-2"/>Sign In with Location</Button>
                <Button onClick={() => setSignInStep('scanning')} size="lg" variant="outline"><QrCode className="mr-2"/>Sign In with QR Code</Button>
            </div>
        );
      case 'locating':
        return <div className="flex flex-col items-center gap-4 text-center p-8"><Loader2 className="h-10 w-10 animate-spin" /><p>Getting your location...</p></div>;
      case 'locationError':
        return (
          <div className="w-full space-y-4">
            <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>{signInError?.title}</AlertTitle><AlertDescription>{signInError?.description}</AlertDescription></Alert>
            <Button onClick={resetSignInFlow} className="w-full">Try Again</Button>
          </div>
        );
      case 'scanning':
        return (
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="text-muted-foreground text-sm">Point camera at the QR code.</p>
            <div id={qrReaderId} className="w-full aspect-square max-w-sm bg-muted rounded-lg overflow-hidden"/>
            <Button variant="outline" onClick={resetSignInFlow}>Cancel</Button>
          </div>
        );
      case 'pinEntry':
        return (
          <form onSubmit={handleSubmitPin} className="flex flex-col items-center gap-4 w-full">
            <Pin className="h-8 w-8 text-primary" />
            <p className="text-muted-foreground text-center">Enter the 4-digit PIN.</p>
            <Input type="number" value={pin} onChange={(e) => setPin(e.target.value)} className="text-center text-2xl font-mono tracking-widest h-14" maxLength={4} required autoFocus />
            <div className="flex gap-2 w-full"><Button type="button" variant="outline" onClick={() => setSignInStep('scanning')} className="w-full">Back</Button><Button type="submit" className="w-full">Submit</Button></div>
          </form>
        );
      case 'recording':
      case 'success':
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 w-full text-center p-8">
            {signInStep === 'recording' && <><Loader2 className="h-10 w-10 animate-spin" /><p>Recording attendance...</p></>}
            {signInStep === 'success' && <><CheckCircle className="h-10 w-10 text-green-500" /><p>Sign-in Successful!</p><p className="text-sm text-muted-foreground">Your attendance has been recorded.</p></>}
            {signInStep === 'error' && <><XCircle className="h-10 w-10 text-destructive" /><p>{signInError?.title}</p><p className="text-sm text-muted-foreground">{signInError?.description}</p></>}
          </div>
        );
      default:
        return <Loader2 className="h-10 w-10 animate-spin" />;
    }
  };

  return (
    <div className="space-y-6">
        {showConfetti && <Confetti width={width} height={height} recycle={false} onConfettiComplete={() => setShowConfetti(false)} />}
        <Card>
            <CardHeader>
                <CardTitle className="font-headline">Join a New Unit</CardTitle>
                <CardDescription>Enter the unit code provided by your lecturer to enroll in a new course.</CardDescription>
            </CardHeader>
            <CardContent>
                <Dialog open={isJoinUnitOpen} onOpenChange={setIsJoinUnitOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full"><PlusCircle className="mr-2"/> Join a Unit</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                        <DialogTitle>Join a New Unit</DialogTitle>
                        <DialogDescription>
                            Enter the unit code provided by your lecturer.
                        </DialogDescription>
                        </DialogHeader>
                        <JoinUnitForm setOpen={setIsJoinUnitOpen} />
                    </DialogContent>
                </Dialog>
            </CardContent>
        </Card>
        
        <div>
          <h2 className="text-2xl font-bold font-headline mb-4">My Enrolled Units</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {units.map(unit => (
              <UnitCard 
                key={unit.id} 
                unit={unit} 
                status={unitStatuses[unit.id] || 'inactive'}
                onSignIn={startSignIn}
                onViewAttendance={handleViewAttendance}
              />
            ))}
          </div>
        </div>

      <Dialog open={isSignInDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) { resetSignInFlow(); setIsSignInDialogOpen(false); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Student Sign-In</DialogTitle></DialogHeader>
          {renderSignInContent()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingAttendanceUnit} onOpenChange={(isOpen) => { if (!isOpen) setViewingAttendanceUnit(null); }}>
        <DialogContent className="max-w-3xl">
          {viewingAttendanceUnit && (
             <DialogHeader>
                <DialogTitle>My Attendance for {viewingAttendanceUnit.name}</DialogTitle>
                <DialogDescription>
                    A record of your attendance for each session in this unit. Check marks indicate presence.
                </DialogDescription>
            </DialogHeader>
          )}
          {isLoadingAttendance ? (
            <div className="space-y-4 p-8">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : viewingAttendanceUnit && user ? (
            <StudentAttendanceGrid 
              unit={viewingAttendanceUnit} 
              studentId={user.uid}
              attendanceRecords={viewingAttendanceRecords}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
