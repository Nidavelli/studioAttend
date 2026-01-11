"use client";

import React, { useState, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Fingerprint, MapPin, CheckCircle } from 'lucide-react';
import type { Student } from '@/lib/data';
import { findImage, COURSE_NAME } from '@/lib/data';
import { getPersonalizedSheet } from '@/app/actions';
import { AttendanceSheet } from '@/components/attendance-sheet';

type SignInStep = 'idle' | 'locating' | 'authenticating' | 'success' | 'error';

const stepMessages: Record<SignInStep, { text: string; icon: React.ReactNode }> = {
  idle: { text: 'Sign In', icon: null },
  locating: { text: 'Verifying Location...', icon: <MapPin className="animate-pulse" /> },
  authenticating: { text: 'Authenticating...', icon: <Fingerprint className="animate-pulse" /> },
  success: { text: 'Signed In', icon: <CheckCircle /> },
  error: { text: 'Sign In Failed', icon: null },
};


export function StudentView({
  students,
  onSignIn,
  isSessionActive,
}: {
  students: Student[];
  onSignIn: (studentId: string) => void;
  isSessionActive: boolean;
}) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [signInStep, setSignInStep] = useState<SignInStep>('idle');
  const [showSheet, setShowSheet] = useState(false);
  const [attendanceSheetContent, setAttendanceSheetContent] = useState('');

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [selectedStudentId, students]
  );

  const handleSignIn = async () => {
    if (!selectedStudent) return;

    setSignInStep('locating');
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setSignInStep('authenticating');
    await new Promise((resolve) => setTimeout(resolve, 1500));

    onSignIn(selectedStudent.id);
    setSignInStep('success');
    
    const sheet = await getPersonalizedSheet({ 
      studentName: selectedStudent.name,
      courseName: COURSE_NAME,
      attendanceRecord: selectedStudent.attendance
    });
    setAttendanceSheetContent(sheet);
    setShowSheet(true);

    setTimeout(() => setSignInStep('idle'), 5000);
  };

  const studentAvatar = selectedStudent ? findImage(selectedStudent.avatarId) : null;

  return (
    <div className="mt-8 flex flex-col items-center gap-8">
      {!isSessionActive && (
        <Alert variant="destructive" className="max-w-md">
          <AlertTitle>No Active Session</AlertTitle>
          <AlertDescription>
            The lecturer has not started an attendance session. Please wait.
          </AlertDescription>
        </Alert>
      )}

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-headline text-center">Student Sign-In</CardTitle>
          <CardDescription className="text-center">Select your name to sign in for today's class.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Select onValueChange={setSelectedStudentId} disabled={!isSessionActive}>
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
            {signInStep !== 'idle' && signInStep !== 'success' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {stepMessages[signInStep].icon && signInStep !== 'idle' && <span className="mr-2">{stepMessages[signInStep].icon}</span>}
            {stepMessages[signInStep].text}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showSheet} onOpenChange={setShowSheet}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline">Personalized Attendance Sheet</DialogTitle>
          </DialogHeader>
          <AttendanceSheet content={attendanceSheetContent} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
