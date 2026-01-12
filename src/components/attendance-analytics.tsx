"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, FileText } from 'lucide-react';
import type { Student } from '@/lib/data';
import { findImage } from '@/lib/data';
import { getAttendanceSummary } from '@/app/actions';

export function AttendanceAnalytics({ students, attendanceThreshold }: { students: Student[], attendanceThreshold: number }) {
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ title: string; content: string } | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const calculateAttendance = (student: Student) => {
    const totalWeeks = Object.keys(student.attendance).length;
    if (totalWeeks === 0) return { percentage: 0, attended: 0, total: 0 };
    const attendedWeeks = Object.values(student.attendance).filter(present => present).length;
    return {
      percentage: Math.round((attendedWeeks / totalWeeks) * 100),
      attended: attendedWeeks,
      total: totalWeeks
    };
  };

  const handleGenerateSummary = async (student: Student) => {
    setLoadingSummary(student.id);
    const attendanceString = Object.entries(student.attendance)
      .map(([week, present]) => `Week ${week}: ${present ? 'Present' : 'Absent'}`)
      .join(', ');
      
    const summaryContent = await getAttendanceSummary({
      studentName: student.name,
      attendanceRecords: attendanceString,
      attendanceThreshold: attendanceThreshold,
    });

    setSummary({
      title: `Attendance Summary for ${student.name}`,
      content: summaryContent,
    });
    setLoadingSummary(null);
    setIsSummaryOpen(true);
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Attendance</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const { percentage, attended, total } = calculateAttendance(student);
              const isBelowThreshold = percentage < attendanceThreshold;
              const avatar = findImage(student.avatarId);
              const isLoading = loadingSummary === student.id;

              return (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={avatar?.imageUrl} alt={student.name} data-ai-hint={avatar?.imageHint} />
                        <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{student.name}</div>
                        {isBelowThreshold && (
                          <Badge variant="destructive" className="mt-1">
                            Below {attendanceThreshold}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Progress value={percentage} className="w-32" />
                      <span className="text-muted-foreground font-mono text-sm">{percentage}% ({attended}/{total})</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateSummary(student)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FileText className="h-4 w-4 mr-2"/>
                          <span>AI Summary</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline">{summary?.title}</DialogTitle>
            <DialogDescription className="whitespace-pre-wrap font-sans text-sm text-foreground/80 pt-4">
              {summary?.content}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
