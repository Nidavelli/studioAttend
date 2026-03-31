
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, Check, X } from 'lucide-react';
import type { Student, Unit } from '@/lib/data';
import { cn } from '@/lib/utils';
import { AttendSyncIcon } from './icons';
import type { User } from 'firebase/auth';


type AttendanceRecord = {
  id: string;
  studentId: string;
  sessionId: string;
  timestamp: any;
  signInMethod: string;
};


export function AttendanceReport({ 
  students, 
  unit, 
  attendanceRecords,
  onManualSignIn,
  lecturer,
}: { 
  students: Student[]; 
  unit: Unit; 
  attendanceRecords: AttendanceRecord[];
  onManualSignIn: (studentId: string, sessionId: string) => void;
  lecturer: User;
}) {
  
  const handlePrint = () => {
    window.print();
  };

  const sessionHeaders = unit?.sessionHistory || [];
  if (!unit) return null;

  return (
    <div>
      <div className="flex justify-end mb-4 no-print">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>
      <div id="printable-report">
        <div className="hidden print:block mb-8">
            <div className="flex justify-between items-center border-b pb-4">
                <div className="flex items-center gap-3">
                    <AttendSyncIcon className="h-8 w-8 text-primary" />
                    <h1 className="text-2xl font-headline font-bold">AttendSync</h1>
                </div>
                <div className="text-right text-sm">
                    <p className="font-bold">{unit.name} ({unit.code})</p>
                    <p>Lecturer: {lecturer.displayName}</p>
                    <p>Date: {new Date().toLocaleDateString()}</p>
                </div>
            </div>
        </div>
        <h2 className="text-xl font-bold mb-4 font-headline text-center print:text-left">Attendance Grid for {unit.name}</h2>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Reg. Number</TableHead>
                {sessionHeaders.map((_, i) => (
                  <TableHead key={`session-header-${i + 1}`} className="text-center">
                    S{i + 1}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.uid}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell className="font-mono text-xs">{student.registrationNumber}</TableCell>
                  {sessionHeaders.map((sessionId) => {
                    const isPresent = attendanceRecords.some(
                      record => record.studentId === student.uid && record.sessionId === sessionId
                    );
                    return (
                      <TableCell 
                        key={`${student.uid}-session-${sessionId}`} 
                        className="text-center"
                      >
                        <Button
                          variant={isPresent ? "ghost" : "outline"}
                          size="icon"
                          className={cn(
                            "h-8 w-8 no-print",
                            isPresent ? "cursor-default text-green-500" : "text-muted-foreground"
                          )}
                          disabled={isPresent}
                          onClick={() => onManualSignIn(student.uid, sessionId)}
                          aria-label={`Mark ${student.name} as present for session ${sessionId}`}
                        >
                          {isPresent ? <Check /> : <X />}
                        </Button>
                        <span className="hidden print:inline">
                            {isPresent ? <Check className="text-green-500 mx-auto" /> : <X className="text-destructive mx-auto"/>}
                        </span>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="hidden print:block mt-24">
            <div className="flex justify-between items-center">
                <div className="w-1/2">
                    <p className="font-bold">Lecturer's Signature:</p>
                    <div className="border-b-2 border-gray-400 mt-16"></div>
                </div>
                <div className="w-1/4 text-center">
                    <p className="font-bold">Date:</p>
                    <div className="border-b-2 border-gray-400 mt-16"></div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
