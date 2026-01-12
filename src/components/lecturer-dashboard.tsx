"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import type { Student } from '@/lib/data';
import type { SignedInStudent, Location } from '@/app/page';
import { findImage } from '@/lib/data';
import { AttendanceAnalytics } from '@/components/attendance-analytics';
import { AttendanceReport } from '@/components/attendance-report';
import { MapPin } from 'lucide-react';

export function LecturerDashboard({
  students,
  signedInStudents,
  isSessionActive,
  onToggleSession,
  onManualAttendanceToggle,
  lecturerLocation,
}: {
  students: Student[];
  signedInStudents: SignedInStudent[];
  isSessionActive: boolean;
  onToggleSession: () => void;
  onManualAttendanceToggle: (studentId: string, week: string) => void;
  lecturerLocation: Location | null;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-headline">Session Control</CardTitle>
          <CardDescription>Start or end the attendance session.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`h-3 w-3 rounded-full ${isSessionActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            <span className="font-medium">{isSessionActive ? 'Session Active' : 'Session Inactive'}</span>
          </div>
          <Button onClick={onToggleSession} className="w-full" variant={isSessionActive ? 'destructive' : 'default'}>
            {isSessionActive ? 'End Session' : 'Start Session'}
          </Button>

          {lecturerLocation && (
            <>
              <Separator className="my-2"/>
              <div className="w-full text-center p-2 rounded-lg bg-muted">
                <h4 className="font-semibold text-sm flex items-center justify-center gap-2"><MapPin className="h-4 w-4"/> Location Set</h4>
                <p className="text-xs text-muted-foreground font-mono">
                  Lat: {lecturerLocation.latitude.toFixed(5)}, Lon: {lecturerLocation.longitude.toFixed(5)}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-headline">Live Attendance Ledger</CardTitle>
          <CardDescription>Students who have signed in for the current session.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Sign-in Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {signedInStudents.length > 0 ? (
                  signedInStudents.map((student) => {
                    const avatar = findImage(student.avatarId);
                    return (
                      <TableRow key={student.id} className="data-[state=open]:animate-in data-[state=open]:fade-in">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={avatar?.imageUrl} alt={student.name} data-ai-hint={avatar?.imageHint}/>
                              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{student.signedInAt}</TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground h-24">
                      {isSessionActive ? 'Waiting for students to sign in...' : 'Session has not started.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="font-headline">Attendance Analytics</CardTitle>
          <CardDescription>Overall attendance records for all students.</CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceAnalytics students={students} />
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="font-headline">Printable Attendance Report</CardTitle>
          <CardDescription>Semester-wide attendance sheet for manual records and printing.</CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceReport students={students} onManualAttendanceToggle={onManualAttendanceToggle} />
        </CardContent>
      </Card>
    </div>
  );
}
