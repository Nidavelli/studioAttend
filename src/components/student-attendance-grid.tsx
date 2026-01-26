
'use client';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import type { Unit, AttendanceRecord } from '@/lib/data';

export function StudentAttendanceGrid({ 
  unit, 
  studentId,
  attendanceRecords,
}: { 
  unit: Unit; 
  studentId: string;
  attendanceRecords: AttendanceRecord[];
}) {
  const sessionHeaders = unit?.sessionHistory || [];
  if (!unit) return null;

  return (
    <div className="border rounded-lg overflow-x-auto mt-2">
      <Table>
        <TableHeader>
          <TableRow>
            {sessionHeaders.map((_, i) => (
              <TableHead key={`session-header-${i + 1}`} className="text-center">
                S{i + 1}
              </TableHead>
            ))}
            {sessionHeaders.length === 0 && (
                <TableHead className="text-center">No Sessions Yet</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            {sessionHeaders.length > 0 ? sessionHeaders.map((sessionId) => {
              const isPresent = attendanceRecords.some(
                record => record.studentId === studentId && record.sessionId === sessionId
              );
              return (
                <TableCell 
                  key={`${studentId}-session-${sessionId}`} 
                  className="text-center"
                >
                  {isPresent ? (
                    <Check className="h-5 w-5 text-green-500 mx-auto" />
                  ) : (
                    <X className="h-5 w-5 text-destructive mx-auto" />
                  )}
                </TableCell>
              );
            }) : (
               <TableCell className="text-center text-muted-foreground h-24">
                  No sessions have occurred for this unit.
               </TableCell>
            )}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
