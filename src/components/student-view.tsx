
"use client";

import React, { useState, useEffect, useRef } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Fingerprint, CheckCircle, XCircle, Timer, AlertTriangle, QrCode, ScanLine, Pin, MapPin, PlusCircle } from 'lucide-react';
import type { Student, Unit } from '@/lib/data';
import { findImage } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import { StudentAttendanceReport } from './student-attendance-report';
import { generateSimpleId } from '@/lib/utils';
import { Html5Qrcode, type Html5QrcodeResult } from 'html5-qrcode';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { joinUnit } from '@/lib/units';
import { useUser } from '@/firebase/auth/use-user';


export type GeolocationCoordinates = {
  lat: number;
  lng: number;
};

type SignInStep = 'idle' | 'methodChoice' | 'locating' | 'scanning' | 'pinEntry' | 'biometric' | 'recording' | 'success' | 'error' | 'locationError';
type SignInError = {
  title: string;
  description: string;
} | null;

const CountdownTimer = ({ endTime }: { endTime: Date }) => {
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = endTime.getTime() - now.getTime();

      if (difference > 0) {
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('00:00');
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (!timeLeft || timeLeft === '00:00') return null;

  return (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground font-medium">
      <Timer className="h-4 w-4" />
      <span>Session ends in: <span className="font-mono font-bold">{timeLeft}</span></span>
    </div>
  );
};

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


export function StudentView({
  students,
  unit,
  onLocationSignIn,
  onQrSignIn,
  isSessionActive,
  sessionEndTime,
  studentForReport,
  onCloseReport,
}: {
  students: Student[];
  unit: Unit;
  onLocationSignIn: (studentId: string, location: GeolocationCoordinates, deviceId: string) => { student: Student | null, distance?: number };
  onQrSignIn: (studentId: string, deviceId: string, pin: string) => Student | null;
  isSessionActive: boolean;
  sessionEndTime: Date | null;
  studentForReport: Student | null;
  onCloseReport: () => void;
}) {
  const { user } = useUser();
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [signInStep, setSignInStep] = useState<SignInStep>('idle');
  const [signInError, setSignInError] = useState<SignInError>(null);
  const [pin, setPin] = useState('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const { toast } = useToast();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const qrReaderId = "qr-reader";
  const [isJoinUnitOpen, setIsJoinUnitOpen] = useState(false);

  useEffect(() => {
    setDeviceId(generateSimpleId());
    // Set the current user as the selected student automatically
    if (user) {
      setSelectedStudentId(user.uid);
      setSignInStep('methodChoice');
    }
  }, [user]);

  useEffect(() => {
    if (signInStep === 'scanning' && selectedStudentId) {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(qrReaderId);
      }
      const qrCode = html5QrCodeRef.current;
      
      qrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string, result: Html5QrcodeResult) => {
          if (qrCode.isScanning) {
            qrCode.stop().then(() => {
              setSignInStep('pinEntry');
              toast({ title: "QR Code Scanned", description: `Scanned: ${decodedText}` });
            }).catch(err => console.error("Failed to stop scanner", err));
          }
        },
        (errorMessage: string) => {}
      ).catch(err => {
        toast({ variant: 'destructive', title: 'Camera Error', description: 'Could not start QR scanner. Please grant camera permissions.' });
        setSignInStep('methodChoice');
      });
    }

    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(err => console.error("Failed to stop scanner on cleanup", err));
      }
    };
  }, [signInStep, selectedStudentId, toast]);
  
  const selectedStudent = React.useMemo(
    () => students.find((s) => s.uid === selectedStudentId),
    [selectedStudentId, students]
  );
  
  const resetSignInFlow = () => {
    setSignInStep(selectedStudentId ? 'methodChoice' : 'idle');
    setPin('');
    setSignInError(null);
  };

  const recordQrAttendance = () => {
    setSignInStep('recording');
    setTimeout(() => {
      const updatedStudent = onQrSignIn(selectedStudent!.uid, deviceId!, pin);
      if (updatedStudent) {
        setSignInStep('success');
      } else {
        setSignInError({ title: "Sign-in Failed", description: "The PIN was incorrect or the session expired. Please try again." });
        setSignInStep('error');
        setTimeout(() => setSignInStep('pinEntry'), 3000);
      }
    }, 500);
  };
  
  const handleLocationAuth = () => {
    setSignInStep('locating');
    if (!navigator.geolocation) {
      setSignInError({ title: "Location Not Supported", description: "Your browser does not support geolocation. Please use the QR code method." });
      setSignInStep('locationError');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const studentLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setSignInStep('recording');
        
        setTimeout(() => {
          const { student: updatedStudent, distance } = onLocationSignIn(selectedStudent!.uid, studentLocation, deviceId!);
          if (updatedStudent) {
            setSignInStep('success');
          } else {
            if (distance) {
               setSignInError({ title: "Too Far Away", description: `You are approximately ${distance} meters from the classroom. Please move closer or ask your lecturer for a manual sign-in.` });
            } else {
               setSignInError({ title: "Sign-in Failed", description: `Could not verify your location. Please ask your lecturer for help.` });
            }
            setSignInStep('locationError');
          }
        }, 500);

      },
      (error) => {
        setSignInError({ title: "Location Access Denied", description: "Please enable location services in your browser settings, or use the QR code sign-in method." });
        setSignInStep('locationError');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleBiometricAuth = async (onSuccess: () => void) => {
    setSignInStep('biometric');
    try {
        const isSupported = await (window.PublicKeyCredential as any)?.isUserVerifyingPlatformAuthenticatorAvailable?.();
        if (!isSupported) {
            toast({
                title: "Biometrics Not Required",
                description: "This device doesn't support biometrics. Continuing sign-in.",
            });
            onSuccess();
            return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: { id: window.location.hostname, name: "AttendSync" },
                user: {
                    id: new TextEncoder().encode(selectedStudent!.uid),
                    name: selectedStudent!.email,
                    displayName: selectedStudent!.name,
                },
                pubKeyCredParams: [{ type: "public-key", alg: -7 }], // ES256
                authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required",
                },
                timeout: 60000,
            }
        });

        if (credential) {
            onSuccess();
        } else {
            throw new Error("Biometric authentication failed or was canceled.");
        }
    } catch (error: any) {
        console.error("Biometric Error:", error);
        toast({
            variant: "destructive",
            title: "Biometric Failed",
            description: error.name === 'NotAllowedError' ? 'Authentication was canceled.' : 'Could not verify your identity.',
        });
        setSignInStep('methodChoice');
    }
  };

  const handleSubmitPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      toast({ variant: 'destructive', title: 'Invalid PIN', description: 'Please enter a 4-digit PIN.' });
      return;
    }
    handleBiometricAuth(recordQrAttendance);
  };

  const studentAvatar = selectedStudent ? findImage(selectedStudent.avatarId) : null;
  
  if (!unit) {
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


  const renderStepContent = () => {
    if (!selectedStudent) {
      return <Loader2 className="animate-spin" />
    }
    switch (signInStep) {
      case 'methodChoice':
        return (
            <>
                <div className="flex items-center gap-4 p-4 rounded-lg w-full">
                    <Avatar className="h-16 w-16">
                        <AvatarImage src={studentAvatar?.imageUrl} alt={selectedStudent!.name} data-ai-hint={studentAvatar?.imageHint} />
                        <AvatarFallback>{selectedStudent!.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="font-semibold text-lg">{selectedStudent!.name}</div>
                </div>
                <div className="w-full grid grid-cols-1 gap-4">
                    <Button onClick={handleLocationAuth} size="lg"><MapPin className="mr-2"/>Sign In with Location</Button>
                    <Button onClick={() => setSignInStep('scanning')} size="lg" variant="outline"><QrCode className="mr-2"/>Sign In with QR Code</Button>
                </div>
            </>
        );
      case 'locating':
        return (
          <div className="flex flex-col items-center gap-4 w-full text-center p-8">
            <Loader2 className="h-10 w-10 animate-spin" />
            <p>Getting your location...</p>
            <p className="text-sm text-muted-foreground">Please approve the location request.</p>
          </div>
        );
      case 'locationError':
        return (
          <div className="w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{signInError?.title}</AlertTitle>
              <AlertDescription>{signInError?.description}</AlertDescription>
            </Alert>
            <Button onClick={resetSignInFlow} className="w-full">Try Again</Button>
          </div>
        );
      case 'scanning':
        return (
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="text-muted-foreground text-sm">Point your camera at the QR code on the main screen.</p>
            <div id={qrReaderId} className="w-full aspect-square max-w-sm bg-muted rounded-lg overflow-hidden"/>
            <Button variant="outline" onClick={resetSignInFlow}>Cancel</Button>
          </div>
        );
      case 'pinEntry':
        return (
          <form onSubmit={handleSubmitPin} className="flex flex-col items-center gap-4 w-full">
            <Pin className="h-8 w-8 text-primary" />
            <p className="text-muted-foreground text-center">Enter the 4-digit PIN shown on the main screen.</p>
            <Input
              type="number"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-2xl font-mono tracking-widest h-14"
              maxLength={4}
              required
              autoFocus
            />
            <div className="flex gap-2 w-full">
              <Button type="button" variant="outline" onClick={() => setSignInStep('scanning')} className="w-full">Back</Button>
              <Button type="submit" className="w-full">Submit</Button>
            </div>
          </form>
        );
      case 'biometric':
      case 'recording':
      case 'success':
      case 'error':
        return (
          <div className="flex flex-col items-center gap-4 w-full text-center p-8">
            {signInStep === 'biometric' && <><Fingerprint className="h-10 w-10 animate-pulse" /><p>Verify with biometrics...</p></>}
            {signInStep === 'recording' && <><Loader2 className="h-10 w-10 animate-spin" /><p>Recording attendance...</p></>}
            {signInStep === 'success' && <><CheckCircle className="h-10 w-10 text-green-500" /><p>Sign-in Successful!</p></>}
            {signInStep === 'error' && <><XCircle className="h-10 w-10 text-destructive" /><p>{signInError?.title}</p><p className="text-sm text-muted-foreground">{signInError?.description}</p></>}
          </div>
        );
      case 'idle':
      default:
        return <Loader2 className="h-10 w-10 animate-spin" />;
    }
  };

  return (
    <div className="mt-8 flex flex-col items-center gap-8">
      {!isSessionActive ? (
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Active Session</AlertTitle>
          <AlertDescription>
            There are no active attendance sessions for this unit right now.
          </AlertDescription>
        </Alert>
      ) : (
        sessionEndTime && <CountdownTimer endTime={sessionEndTime} />
      )}

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-center">Student Sign-In</CardTitle>
          <CardDescription className="text-center">
            {signInStep !== 'idle' && "Follow the steps to sign in."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {renderStepContent()}
        </CardContent>
      </Card>

      <Dialog open={!!studentForReport || signInStep === 'success'} onOpenChange={(isOpen) => { if (!isOpen) { onCloseReport(); resetSignInFlow(); } }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline">My Attendance Report</DialogTitle>
            <DialogDescription>
              Your sign-in was successful. Here is your current attendance record for {unit.name}.
            </DialogDescription>
          </DialogHeader>
          {studentForReport && <StudentAttendanceReport student={studentForReport} courseName={unit.name} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
