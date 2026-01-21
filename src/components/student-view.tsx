
"use client";

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Fingerprint, MapPin, CheckCircle, XCircle, Timer, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { Student } from '@/lib/data';
import { findImage } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import type { Location } from '@/app/page';
import { StudentAttendanceReport } from './student-attendance-report';
import { generateSimpleId } from '@/lib/utils';


type SignInStep = 'idle' | 'locating' | 'biometric' | 'recording' | 'success' | 'error';

const stepMessages: Record<SignInStep, { text: string; icon: React.ReactNode }> = {
  idle: { text: 'Sign In', icon: null },
  locating: { text: 'Verifying Location...', icon: <MapPin className="animate-pulse" /> },
  biometric: { text: 'Waiting for Biometric Scan...', icon: <Fingerprint className="animate-pulse" /> },
  recording: { text: 'Recording Attendance...', icon: <ShieldCheck className="animate-pulse" /> },
  success: { text: 'Signed In Successfully', icon: <CheckCircle /> },
  error: { text: 'Sign In Failed', icon: <XCircle /> },
};

// Haversine formula to calculate distance between two lat/lon points
function getDistance(loc1: Location, loc2: Location) {
  const R = 6371e3; // metres
  const φ1 = loc1.latitude * Math.PI / 180;
  const φ2 = loc2.latitude * Math.PI / 180;
  const Δφ = (loc2.latitude - loc1.latitude) * Math.PI / 180;
  const Δλ = (loc2.longitude - loc1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

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


export function StudentView({
  students,
  onSignIn,
  isSessionActive,
  lecturerLocation,
  sessionRadius,
  sessionEndTime,
  courseName,
  studentForReport,
  onCloseReport,
}: {
  students: Student[];
  onSignIn: (studentId: string, deviceId: string) => Student | null;
  isSessionActive: boolean;
  lecturerLocation: Location | null;
  sessionRadius: number;
  sessionEndTime: Date | null;
  courseName: string;
  studentForReport: Student | null;
  onCloseReport: () => void;
}) {
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);
  const [signInStep, setSignInStep] = React.useState<SignInStep>('idle');
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [locationError, setLocationError] = React.useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    // Generate a simple device ID on component mount
    setDeviceId(generateSimpleId());
    // Reset student selection when course changes
    setSelectedStudentId(null);
    setSignInStep('idle');
  }, [students]);
  
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    setLocationError(null);
  }

  const selectedStudent = React.useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [selectedStudentId, students]
  );
  
  const resetSignIn = (delay = 3000) => {
    setTimeout(() => setSignInStep('idle'), delay);
  };

  const recordAttendance = () => {
    setSignInStep('recording');
    setTimeout(() => {
      const updatedStudent = onSignIn(selectedStudent!.id, deviceId!);
      if (updatedStudent) {
        setSignInStep('success');
      } else {
        setSignInStep('error');
      }
      resetSignIn();
    }, 500);
  };

  const handleBiometricAuth = async () => {
    setSignInStep('biometric');
    try {
        const isSupported = await (window.PublicKeyCredential as any)?.isUserVerifyingPlatformAuthenticatorAvailable?.();
        if (!isSupported) {
            toast({
                title: "Biometrics Not Supported",
                description: "Your device does not support biometric verification. Continuing with standard sign-in.",
            });
            recordAttendance();
            return;
        }

        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const credential = await navigator.credentials.create({
            publicKey: {
                challenge,
                rp: { id: window.location.hostname, name: "AttendSync" },
                user: {
                    id: new TextEncoder().encode(selectedStudent!.id),
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
            recordAttendance();
        } else {
            throw new Error("Biometric authentication failed or was canceled.");
        }
    } catch (error: any) {
        console.error("Biometric Error:", error);
        toast({
            variant: "destructive",
            title: "Biometric Failed",
            description: error.name === 'NotAllowedError' ? 'Authentication was canceled or not permitted.' : 'Could not verify your identity.',
        });
        setSignInStep('error');
        resetSignIn();
    }
  };

  const handleSignIn = async () => {
    setLocationError(null);

    if (!selectedStudent || !lecturerLocation || !deviceId) {
        toast({
            variant: "destructive",
            title: "Sign-in Error",
            description: "Session not active or device not ready.",
        });
        return;
    }
    
    if (sessionEndTime && new Date() > sessionEndTime) {
      toast({
        variant: "destructive",
        title: "Session Expired",
        description: "The attendance session has ended.",
      });
      setSignInStep('error');
      resetSignIn();
      return;
    }

    setSignInStep('locating');
    
    if (!('geolocation' in navigator)) {
        setLocationError("Your browser does not support Geolocation. Please ask your lecturer to mark you as present manually.");
        setSignInStep('error');
        resetSignIn();
        return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const studentLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const distance = getDistance(lecturerLocation, studentLocation);

        if (distance > sessionRadius) {
            setLocationError(`You appear to be too far from the classroom (${Math.round(distance)}m away). Please move closer or ask your lecturer to mark you as present manually.`);
            setSignInStep('error');
            resetSignIn();
            return;
        }

        // Location is verified, now proceed to biometrics
        handleBiometricAuth();
      },
      (error) => {
        setLocationError(`Your location could not be determined. This can happen on devices without a GPS chip or when using Wi-Fi-based location. Please ask your lecturer to mark you as present manually.`);
        setSignInStep('error');
        resetSignIn();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const studentAvatar = selectedStudent ? findImage(selectedStudent.avatarId) : null;

  return (
    <div className="mt-8 flex flex-col items-center gap-8">
      {!isSessionActive ? (
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>No Active Session</AlertTitle>
          <AlertDescription>
            The lecturer has not started an attendance session. Please wait.
          </AlertDescription>
        </Alert>
      ) : (
        sessionEndTime && <CountdownTimer endTime={sessionEndTime} />
      )}

      {locationError && (
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Location Verification Failed</AlertTitle>
          <AlertDescription>
            {locationError}
          </AlertDescription>
        </Alert>
      )}


      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-center">Student Sign-In</CardTitle>
          <CardDescription className="text-center">Select your name to sign in for today's class.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Select onValueChange={handleStudentSelect} value={selectedStudentId || ''} disabled={!isSessionActive}>
            <SelectTrigger>
              <SelectValue placeholder="Select your name" />
            </SelectTrigger>
            <SelectContent>
              {students.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedStudent && (
            <div className="flex items-center gap-4 p-4 rounded-lg w-full">
              <Avatar className="h-16 w-16">
                <AvatarImage src={studentAvatar?.imageUrl} alt={selectedStudent.name} data-ai-hint={studentAvatar?.imageHint} />
                <AvatarFallback>{selectedStudent.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="font-semibold text-lg">{selectedStudent.name}</div>
            </div>
          )}
          
          <Button
            onClick={handleSignIn}
            disabled={!selectedStudent || !isSessionActive || signInStep !== 'idle'}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {signInStep !== 'idle' && signInStep !== 'success' && signInStep !== 'error' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {stepMessages[signInStep].icon && signInStep !== 'idle' && <span className="mr-2">{stepMessages[signInStep].icon}</span>}
            {stepMessages[signInStep].text}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!studentForReport} onOpenChange={(isOpen) => !isOpen && onCloseReport()}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-headline">My Attendance Report</DialogTitle>
            <DialogDescription>
              Your sign-in was successful. Here is your current attendance record for {courseName}.
            </DialogDescription>
          </DialogHeader>
          {studentForReport && <StudentAttendanceReport student={studentForReport} courseName={courseName} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
