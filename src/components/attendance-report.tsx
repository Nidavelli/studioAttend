"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import type { Student } from '@/lib/data';

const TOTAL_WEEKS = 13;

export function AttendanceReport({ students }: { students: Student[] }) {
  
  const handlePrint = () => {
    const printContent = document.getElementById('printable-report');
    if (printContent) {
      const originalContents = document.body.innerHTML;
      document.body.innerHTML = `
        <html>
          <head>
            <title>Attendance Report</title>
            <link rel="stylesheet" href="/globals.css" />
            <style>
              @media print {
                body {
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .no-print {
                  display: none;
                }
              }
              body { font-family: sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f2f2f2; }
              .week-col { text-align: center; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `;
      window.print();
      document.body.innerHTML = originalContents;
      // We need to reload to re-initialize the React app state
      window.location.reload();
    }
  };

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>
      <div id="printable-report">
        <h2 className="text-xl font-bold mb-4 font-headline text-center">Attendance Report</h2>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reg. No.</TableHead>
                <TableHead>Student Name</TableHead>
                {Array.from({ length: TOTAL_WEEKS }, (_, i) => (
                  <TableHead key={`week-header-${i + 1}`} className="text-center">
                    W{i + 1}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-mono">{student.id}</TableCell>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  {Array.from({ length: TOTAL_WEEKS }, (_, i) => {
                    const week = (i + 1).toString();
                    const isPresent = student.attendance[week];
                    return (
                      <TableCell key={`${student.id}-week-${week}`} className="week-col">
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
