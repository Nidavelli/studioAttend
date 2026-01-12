
"use client";

import React, { useState, useMemo, useEffect } from 'react';
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
import { Loader2, Fingerprint, MapPin, CheckCircle, XCircle, Timer } from 'lucide-react';
import type { Student } from '@/lib/data';
import { findImage } from '@/lib/data';
import { useToast } from "@/hooks/use-toast";
import type { Location } from '@/app/page';
import { StudentAttendanceReport } from './student-attendance-report';
import { generateSimpleId } from '@/lib/utils';


type SignInStep = 'idle' | 'locating' | 'authenticating' | 'success' | 'error';

const stepMessages: Record<SignInStep, { text: string; icon: React.ReactNode }> = {
  idle: { text: 'Sign In', icon: null },
  locating: { text: 'Verifying Location...', icon: <MapPin className="animate-pulse" /> },
  authenticating: { text: 'Authenticating Device...', icon: <Fingerprint className="animate-pulse" /> },
  success: { text: 'Signed In', icon: <CheckCircle /> },
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
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
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
}: {
  students: Student[];
  onSignIn: (studentId: string, deviceId: string) => Student | null;
  isSessionActive: boolean;
  lecturerLocation: Location | null;
  sessionRadius: number;
  sessionEndTime: Date | null;
  courseName: string;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [studentForReport, setStudentForReport] = useState<Student | null>(null);
  const [signInStep, setSignInStep] = useState<SignInStep>('idle');
  const [showSheet, setShowSheet] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const { toast } = useToast();

  React.useEffect(() => {
    // Generate a simple device ID on component mount
    setDeviceId(generateSimpleId());
    // Reset student selection when course changes
    setSelectedStudentId(null);
    setStudentForReport(null);
  }, [students]);
  
  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
  }

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [selectedStudentId, students]
  );

  const handleSignIn = async () => {
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
      setTimeout(() => setSignInStep('idle'), 5000);
      return;
    }

    setSignInStep('locating');
    
    if (!('geolocation' in navigator)) {
        toast({ variant: "destructive", title: "Location Error", description: "Geolocation is not supported by your browser." });
        setSignInStep('error');
        setTimeout(() => setSignInStep('idle'), 5000);
        return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const studentLocation: Location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };

        const distance = getDistance(lecturerLocation, studentLocation);

        if (distance > sessionRadius) {
            toast({
                variant: "destructive",
                title: "Location Error",
                description: `You are too far from the classroom. (Distance: ${Math.round(distance)}m)`,
            });
            setSignInStep('error');
            setTimeout(() => setSignInStep('idle'), 5000);
            return;
        }

        setSignInStep('authenticating');
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        const updatedStudent = onSignIn(selectedStudent.id, deviceId);
        
        if (updatedStudent) {
            setStudentForReport(updatedStudent);
            setSignInStep('success');
            setShowSheet(true);
        } else {
            // Handle case where sign-in failed (e.g., already signed in)
            // onSignIn would have already shown a toast if session expired.
            setSignInStep('error');
        }
    
        setTimeout(() => setSignInStep('idle'), 5000);

      },
      (error) => {
        toast({
            variant: "destructive",
            title: "Location Error",
            description: `Could not get your location: ${error.message}`,
        });
        setSignInStep('error');
        setTimeout(() => setSignInStep('idle'), 5000);
      }
    );
  };

  const studentAvatar = selectedStudent ? findImage(selectedStudent.avatarId) : null;

  return (
    <div className="mt-8 flex flex-col items-center gap-8">
      {!isSessionActive ? (
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>No Active Session</AlertTitle>
          <AlertDescription>
            The lecturer has not started an attendance session. Please wait.
          </AlertDescription>
        </Alert>
      ) : (
        sessionEndTime && <CountdownTimer endTime={sessionEndTime} />
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

      <Dialog open={showSheet} onOpenChange={setShowSheet}>
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
