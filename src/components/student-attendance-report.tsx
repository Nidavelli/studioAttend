"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Check, X } from 'lucide-react';
import type { Student } from '@/lib/data';
import { COURSE_NAME } from '@/lib/data';

const TOTAL_WEEKS = 13;

export function StudentAttendanceReport({ student }: { student: Student }) {
  return (
    <div>
      <div className="text-center mb-4">
        <h3 className="font-bold">{student.name}</h3>
        <p className="text-sm text-muted-foreground">{COURSE_NAME}</p>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => (
                <TableHead key={`week-header-${i + 1}`} className="text-center">
                  W{i + 1}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {Array.from({ length: TOTAL_WEEKS }, (_, i) => {
                const week = (i + 1).toString();
                const isPresent = student.attendance[week];
                return (
                  <TableCell 
                    key={`${student.id}-week-${week}`} 
                    className="text-center"
                  >
                    {isPresent === true && <Check className="h-5 w-5 text-green-600 mx-auto" />}
                    {isPresent === false && <X className="h-5 w-5 text-red-600 mx-auto" />}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
