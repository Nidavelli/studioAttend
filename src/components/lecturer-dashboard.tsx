
"use client";

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Student, Unit, AttendanceRecord } from '@/lib/data';
import { getAvatarUrl } from '@/lib/avatars';
import { AttendanceAnalytics } from '@/components/attendance-analytics';
import { AttendanceReport } from '@/components/attendance-report';
import { Timer, QrCode, MapPin, Loader2, PlusCircle, CheckCircle, Trash2, Check, X, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { GeolocationCoordinates } from '@/app/dashboard/page';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createUnit } from '@/lib/units';
import type { User } from 'firebase/auth';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const GeofenceMap = dynamic(() => import('./geofence-map').then((mod) => mod.GeofenceMap), { 
    ssr: false,
    loading: () => <Skeleton className="h-64 w-full" />
});


const CountdownTimer = ({ endTime }: { endTime: Date }) => {
  const [timeLeft, setTimeLeft] = useState('');

  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = endTime.getTime() - now.getTime();

      if (difference > 0) {
        const minutes = Math.floor((difference / 1000 / 60) % 60);
        const seconds = Math.floor((difference / 1000) % 60);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeLeft('00:00');
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  return (
      <div className="w-full text-center p-2 rounded-lg bg-muted space-y-1">
        <h4 className="font-semibold text-xs flex items-center justify-center gap-2"><Timer className="h-4 w-4"/> TIME REMAINING</h4>
        <div className="text-2xl font-mono font-bold tracking-widest">{timeLeft}</div>
      </div>
  );
};

const createUnitFormSchema = z.object({
  unitName: z.string().min(3, "Unit name must be at least 3 characters."),
  unitCode: z.string().min(3, "Unit code must be at least 3 characters.").max(10, "Unit code must be 10 characters or less."),
  attendanceThreshold: z.coerce.number().min(0).max(100, "Threshold must be between 0 and 100."),
});

function CreateUnitForm({ lecturer, setOpen }: { lecturer: User, setOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof createUnitFormSchema>>({
    resolver: zodResolver(createUnitFormSchema),
    defaultValues: {
      unitName: "",
      unitCode: "",
      attendanceThreshold: 85,
    },
  });

  async function onSubmit(values: z.infer<typeof createUnitFormSchema>) {
    const result = await createUnit(values.unitName, values.unitCode, lecturer.uid, values.attendanceThreshold);
    if (result.success) {
      toast({ title: "Unit Created", description: `The unit "${values.unitName}" has been successfully created.` });
      setOpen(false);
      form.reset();
    } else {
      toast({ variant: "destructive", title: "Creation Failed", description: result.error });
    }
  }
  
  return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
                control={form.control}
                name="unitName"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unit Name</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., Advanced Web Architectures" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="unitCode"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unit Code</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g., CS-452" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="attendanceThreshold"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Attendance Threshold (%)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Unit
            </Button>
        </form>
      </Form>
  )
}

function UnitManagementTab({ allUnits, lecturer, onDeleteUnit }: { allUnits: Unit[], lecturer: User, onDeleteUnit: (unitId: string) => void }) {
    const [isCreateUnitOpen, setIsCreateUnitOpen] = useState(false);
    const maxUnitsReached = allUnits.length >= 5;

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Your Units</CardTitle>
                        <CardDescription>Manage your created units. You can create a maximum of 5 units.</CardDescription>
                    </div>
                    <Dialog open={isCreateUnitOpen} onOpenChange={setIsCreateUnitOpen}>
                        <DialogTrigger asChild>
                            <Button disabled={maxUnitsReached}>
                                <PlusCircle className="mr-2 h-4 w-4"/> New Unit
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create a New Unit</DialogTitle>
                                <DialogDescription>
                                  Fill in the details below to create a new course unit.
                                </DialogDescription>
                            </DialogHeader>
                            <CreateUnitForm lecturer={lecturer} setOpen={setIsCreateUnitOpen} />
                        </DialogContent>
                    </Dialog>
                </div>
                 {maxUnitsReached && (
                    <p className="text-sm text-destructive mt-2">You have reached the maximum of 5 units.</p>
                )}
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Unit Name</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allUnits.map(unit => (
                            <TableRow key={unit.id}>
                                <TableCell className="font-medium">{unit.name}</TableCell>
                                <TableCell className="font-mono">{unit.code}</TableCell>
                                <TableCell className="text-right">
                                     <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <Trash2 className="mr-2 h-4 w-4"/> Delete
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    This action cannot be undone. This will permanently delete the unit
                                                    and all associated attendance records.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => onDeleteUnit(unit.id)}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function LecturerDashboard({
  lecturer,
  allUnits,
  students,
  unit,
  attendanceRecords,
  isSessionActive,
  onToggleSession,
  sessionDuration,
  setSessionDuration,
  sessionEndTime,
  sessionPin,
  activeSessionId,
  lecturerLocation,
  setLecturerLocation,
  radius,
  setRadius,
  onManualSignIn,
  onDeleteUnit,
  onUpdateAttendanceStatus,
}: {
  lecturer: User;
  allUnits: Unit[];
  students: Student[];
  unit: Unit;
  attendanceRecords: AttendanceRecord[];
  isSessionActive: boolean;
  onToggleSession: () => void;
  sessionDuration: number;
  setSessionDuration: (duration: number) => void;
  sessionEndTime: Date | null;
  sessionPin: string;
  activeSessionId: string | null;
  lecturerLocation: GeolocationCoordinates | null;
  setLecturerLocation: (location: GeolocationCoordinates | null) => void;
  radius: number;
  setRadius: (radius: number) => void;
  onManualSignIn: (studentId: string, sessionId: string) => void;
  onDeleteUnit: (unitId: string) => void;
  onUpdateAttendanceStatus: (recordId: string, status: 'APPROVED' | 'REJECTED') => void;
}) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCopied, setIsCopied] = React.useState(false);
  const { toast } = useToast();

  const sessionAttendanceRecords = useMemo(() => 
      attendanceRecords
          .filter(r => r.sessionId === activeSessionId)
          .sort((a, b) => (b.timestamp?.toMillis() || 0) - (a.timestamp?.toMillis() || 0)),
      [attendanceRecords, activeSessionId]
  );

  const { flaggedDeviceGroups, singleDeviceRecords } = useMemo(() => {
      if (!isSessionActive) return { flaggedDeviceGroups: [], singleDeviceRecords: [] };

      const groupedByDevice = sessionAttendanceRecords.reduce((acc, record) => {
          const key = record.deviceId;
          if (!acc[key]) acc[key] = [];
          acc[key].push(record);
          return acc;
      }, {} as Record<string, AttendanceRecord[]>);
      
      const flagged = Object.values(groupedByDevice).filter(records => records.length > 1);
      const single = Object.values(groupedByDevice).filter(records => records.length === 1).flatMap(records => records);
      
      return { flaggedDeviceGroups: flagged, singleDeviceRecords: single };

  }, [isSessionActive, sessionAttendanceRecords]);

  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <UnitManagementTab allUnits={allUnits} lecturer={lecturer} onDeleteUnit={onDeleteUnit} />
      </div>
    );
  }

  const handleSetLocation = () => {
    setIsGettingLocation(true);
    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation Not Supported",
        description: "Your browser does not support geolocation.",
      });
      setIsGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = Math.round(position.coords.accuracy);
        setLecturerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: accuracy,
        });
        toast({
            title: "Location Set",
            description: `Your location has been set with an accuracy of ~${accuracy} meters.`,
        });
        setIsGettingLocation(false);
      },
      () => {
        toast({
            variant: "destructive",
            title: "Geolocation Failed",
            description: "Could not get your location. Please check browser permissions.",
        });
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const copyUnitCode = () => {
    if (!unit?.code) return;
    navigator.clipboard.writeText(unit.code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const qrCodeValue = isSessionActive ? JSON.stringify({ unitId: unit.id, sessionId: activeSessionId }) : '';

  const StatusBadge = ({ status }: { status: AttendanceRecord['status'] }) => {
    const variant = {
        'PENDING': 'default',
        'APPROVED': 'secondary',
        'REJECTED': 'destructive',
    }[status];
    const text = {
        'PENDING': 'Pending Review',
        'APPROVED': 'Approved',
        'REJECTED': 'Rejected',
    }[status];
    return <Badge variant={variant as any}>{text}</Badge>
  }
  
  const ActionButtons = ({ record }: { record: AttendanceRecord }) => {
    if (record.status !== 'PENDING') return null;
    return (
      <div className="flex gap-2">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onUpdateAttendanceStatus(record.id, 'APPROVED')}>
            <Check className="h-4 w-4 text-green-600"/>
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onUpdateAttendanceStatus(record.id, 'REJECTED')}>
            <X className="h-4 w-4 text-red-600"/>
        </Button>
      </div>
    );
  };

  return (
    <div className="space-y-6 mt-4 md:mt-8">
    <Tabs defaultValue="session">
        <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="session">Session Control</TabsTrigger>
            <TabsTrigger value="review">Session Review</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="grid">Attendance Grid</TabsTrigger>
        </TabsList>
        <TabsContent value="session" className="mt-6">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                 <Card className="lg:col-span-1">
                    <CardHeader>
                    <CardTitle className="font-headline">Session Control</CardTitle>
                    <CardDescription>Manage the attendance session for <span className="font-bold">{unit.name}</span>.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-4">
                    <div className="w-full space-y-2">
                        <Label>Unit Code (for students)</Label>
                        <div className="flex items-center space-x-2">
                            <Input type="text" readOnly value={unit.code} className="font-mono" />
                            <Button variant="outline" size="sm" onClick={copyUnitCode}>
                                {isCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : "Copy"}
                            </Button>
                        </div>
                    </div>
                    <hr className="w-full border-t my-2" />
                    {!isSessionActive ? (
                        <>
                        <div className="w-full space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="location">Session Location</Label>
                                <div className="flex gap-2">
                                    <Input 
                                        id="location"
                                        type="text"
                                        value={lecturerLocation ? `Lat: ${lecturerLocation.lat.toFixed(4)}, Lng: ${lecturerLocation.lng.toFixed(4)}` : 'Not set'}
                                        readOnly
                                        disabled={isSessionActive}
                                    />
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        onClick={handleSetLocation} 
                                        disabled={isGettingLocation || isSessionActive}
                                    >
                                        {isGettingLocation ? <Loader2 className="animate-spin" /> : <MapPin />}
                                    </Button>
                                </div>
                            </div>

                            {lecturerLocation && (
                                <div className='space-y-2'>
                                    <Label>Geofence Preview</Label>
                                    <GeofenceMap center={lecturerLocation} radius={radius} />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="radius">Radius (meters)</Label>
                                <Input 
                                    id="radius"
                                    type="number"
                                    value={radius}
                                    onChange={(e) => setRadius(Number(e.target.value))}
                                    disabled={isSessionActive}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration (min)</Label>
                                <Input 
                                    id="duration" 
                                    type="number"
                                    value={sessionDuration}
                                    onChange={(e) => setSessionDuration(Number(e.target.value))}
                                    placeholder="e.g. 15"
                                    disabled={isSessionActive}
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <span className={`h-3 w-3 rounded-full bg-red-500`}></span>
                            <span className="font-medium">Session Inactive</span>
                        </div>
                        <Button onClick={onToggleSession} className="w-full">
                            Start Session
                        </Button>
                        </>
                    ) : (
                        <>
                        <div className="flex items-center gap-2">
                            <span className={`h-3 w-3 rounded-full bg-green-500 animate-pulse`}></span>
                            <span className="font-medium">Session Active</span>
                        </div>
                        <Button onClick={onToggleSession} className="w-full" variant="destructive">
                            End Session
                        </Button>
                        {sessionEndTime && <CountdownTimer endTime={sessionEndTime} />}
                        {lecturerLocation && (
                            <div className="w-full pt-4 mt-4 border-t space-y-2">
                            <Label>Live Session Geofence</Label>
                            <GeofenceMap center={lecturerLocation} radius={radius} />
                            </div>
                        )}
                        </>
                    )}

                    </CardContent>
                </Card>
                
                <Card className="lg:col-span-2">
                    <CardHeader>
                    <CardTitle className="font-headline">Live Session Details</CardTitle>
                    <CardDescription>Students scan the QR code and enter the PIN to sign in.</CardDescription>
                    </CardHeader>
                    <CardContent>
                    {isSessionActive ? (
                        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                            <div className="bg-white p-4 rounded-lg">
                                <QRCode value={qrCodeValue} size={144} />
                            </div>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <p className="text-muted-foreground text-sm">CURRENT PIN</p>
                                <p className="text-4xl sm:text-6xl font-mono font-bold tracking-widest text-primary animate-pulse">{sessionPin}</p>
                                <p className="text-muted-foreground text-xs mt-2">PIN refreshes every 15 seconds</p>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground h-48 flex flex-col justify-center items-center">
                            <QrCode className="h-10 w-10 mb-4"/>
                            <p>Start a session to display QR Code and PIN.</p>
                        </div>
                    )}
                    </CardContent>
                </Card>
            </div>
        </TabsContent>
        <TabsContent value="review" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Session Review</CardTitle>
                    <CardDescription>Review and approve/reject attendance submissions for the current session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   {isSessionActive ? (
                    <>
                    {flaggedDeviceGroups.map((records, index) => (
                        <Card key={index} className="bg-amber-50 border-amber-200">
                             <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="text-amber-600"/> Device Sharing Flagged</CardTitle>
                                <CardDescription>Device ID: <span className="font-mono text-xs">{records[0].deviceId}</span></CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {records.map(record => {
                                            const student = students.find(s => s.uid === record.studentId);
                                            return (
                                                <TableRow key={record.id}>
                                                    <TableCell>{student?.name || 'Unknown'}</TableCell>
                                                    <TableCell className="font-mono text-xs">{record.timestamp?.toDate().toLocaleTimeString()}</TableCell>
                                                    <TableCell><StatusBadge status={record.status} /></TableCell>
                                                    <TableCell className="text-right"><ActionButtons record={record} /></TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}

                    <Card>
                        <CardHeader><CardTitle className="text-base">Individual Sign-ins</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Time</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                <TableBody>
                                {singleDeviceRecords.length > 0 ? singleDeviceRecords.map(record => {
                                     const student = students.find(s => s.uid === record.studentId);
                                     return (
                                        <TableRow key={record.id}>
                                            <TableCell>{student?.name || 'Unknown'}</TableCell>
                                            <TableCell className="font-mono text-xs">{record.timestamp?.toDate().toLocaleTimeString()}</TableCell>
                                            <TableCell><StatusBadge status={record.status} /></TableCell>
                                            <TableCell className="text-right"><ActionButtons record={record} /></TableCell>
                                        </TableRow>
                                    )
                                }) : (
                                    <TableRow><TableCell colSpan={4} className="text-center h-24 text-muted-foreground">Waiting for sign-ins...</TableCell></TableRow>
                                )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    </>
                   ) : (
                    <div className="text-center text-muted-foreground h-48 flex flex-col justify-center items-center">
                        <p>Start a session to review attendance.</p>
                    </div>
                   )}
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="analytics" className="mt-6">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Attendance Analytics</CardTitle>
                    <CardDescription>Overall attendance records for all students in this unit.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AttendanceAnalytics students={students} unit={unit} attendanceRecords={attendanceRecords} />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="grid" className="mt-6">
            <Card>
                 <CardHeader>
                    <CardTitle className="font-headline">Manual Attendance Grid</CardTitle>
                    <CardDescription>Manually mark a student as present for a specific session. This is a permanent action.</CardDescription>
                </CardHeader>
                <CardContent>
                    <AttendanceReport 
                        students={students} 
                        unit={unit} 
                        attendanceRecords={attendanceRecords}
                        onManualSignIn={onManualSignIn}
                        lecturer={lecturer}
                    />
                </CardContent>
            </Card>
        </TabsContent>
        <TabsContent value="management" className="mt-6">
             <UnitManagementTab allUnits={allUnits} lecturer={lecturer} onDeleteUnit={onDeleteUnit} />
        </TabsContent>
    </Tabs>
    </div>
  );
}
