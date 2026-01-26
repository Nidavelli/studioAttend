
"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { Student, Unit, AttendanceRecord } from '@/lib/data';

// This component is now deprecated and will not support manual toggling
// as attendance is now an immutable log. It serves as a display-only report.
export function AttendanceReport({ students, unit, attendanceRecords }: { students: Student[]; unit: Unit; attendanceRecords: AttendanceRecord[] }) {
  
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
                        {isPresent ? 'X' : ''}
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
