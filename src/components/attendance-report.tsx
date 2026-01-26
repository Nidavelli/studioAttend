
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer, Check, X } from 'lucide-react';
import type { Student, Unit, AttendanceRecord } from '@/lib/data';
import { cn } from '@/lib/utils';

export function AttendanceReport({ 
  students, 
  unit, 
  attendanceRecords,
  onManualSignIn
}: { 
  students: Student[]; 
  unit: Unit; 
  attendanceRecords: AttendanceRecord[];
  onManualSignIn: (studentId: string, sessionId: string) => void;
}) {
  
  const handlePrint = () => {
    window.print();
  };

  const sessionHeaders = unit?.sessionHistory || [];
  if (!unit) return null;

  return (
    <div>
      <div className="flex justify-end mb-4 print:hidden">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>
      <div id="printable-report">
        <h2 className="text-xl font-bold mb-4 font-headline text-center">Attendance Report for {unit.name}</h2>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
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
                            "h-8 w-8",
                            isPresent ? "cursor-default text-green-500" : "text-muted-foreground"
                          )}
                          disabled={isPresent}
                          onClick={() => onManualSignIn(student.uid, sessionId)}
                          aria-label={`Mark ${student.name} as present for session ${sessionId}`}
                        >
                          {isPresent ? <Check /> : <X />}
                        </Button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
