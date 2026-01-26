
"use client";

import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, FileText } from 'lucide-react';
import type { Student, Unit, AttendanceRecord } from '@/lib/data';
import { findImage } from '@/lib/data';
import { getAttendanceSummary } from '@/app/actions';

export function AttendanceAnalytics({ students, unit, attendanceRecords }: { students: Student[], unit: Unit, attendanceRecords: AttendanceRecord[] }) {
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ title: string; content: string } | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);

  const calculateAttendance = (student: Student) => {
    const totalSessions = unit.sessionHistory?.length || 0;
    if (totalSessions === 0) return { percentage: 0, attended: 0, total: 0 };
    
    const attendedSessions = attendanceRecords.filter(r => r.studentId === student.uid).length;
    const uniqueAttendedSessions = new Set(attendanceRecords.filter(r => r.studentId === student.uid).map(r => r.sessionId)).size;

    return {
      percentage: Math.round((uniqueAttendedSessions / totalSessions) * 100),
      attended: uniqueAttendedSessions,
      total: totalSessions
    };
  };

  const handleGenerateSummary = async (student: Student) => {
    setLoadingSummary(student.uid);

    const studentRecords = attendanceRecords.filter(r => r.studentId === student.uid);
    const attendedSessionIds = new Set(studentRecords.map(r => r.sessionId));

    const attendanceString = (unit.sessionHistory || []).map((sessionId, index) => {
      const week = index + 1;
      const present = attendedSessionIds.has(sessionId);
      return `Week ${week}: ${present ? 'Present' : 'Absent'}`;
    }).join(', ');
      
    const summaryContent = await getAttendanceSummary({
      studentName: student.name,
      attendanceRecords: attendanceString,
      attendanceThreshold: unit.attendanceThreshold,
    });

    setSummary({
      title: `Attendance Summary for ${student.name}`,
      content: summaryContent,
    });
    setLoadingSummary(null);
    setIsSummaryOpen(true);
  };

  if (!unit) return null;

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
              const isBelowThreshold = percentage < unit.attendanceThreshold;
              const avatar = findImage(student.avatarId);
              const isLoading = loadingSummary === student.uid;

              return (
                <TableRow key={student.uid}>
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
                            Below {unit.attendanceThreshold}%
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
                      disabled={isLoading || (unit.sessionHistory?.length || 0) === 0}
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
