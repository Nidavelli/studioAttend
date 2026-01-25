
"use client";

import React, { useState, useEffect } from 'react';
import QRCode from "react-qr-code";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Student, Unit } from '@/lib/data';
import type { SignedInStudent } from '@/app/page';
import { findImage } from '@/lib/data';
import { AttendanceAnalytics } from '@/components/attendance-analytics';
import { AttendanceReport } from '@/components/attendance-report';
import { AlertTriangle, Timer, QrCode, MapPin, Loader2, PlusCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { GeolocationCoordinates } from './student-view';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createUnit } from '@/app/actions';
import { useUser } from '@/firebase/auth/use-user';


const CountdownTimer = ({ endTime }: { endTime: Date }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
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

const LocationMap = ({ location }: { location: GeolocationCoordinates }) => {
  const { lat, lng } = location;
  const delta = 0.002;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

  return (
    <div className="w-full space-y-2">
        <Label>Location Preview</Label>
        <iframe
            className="w-full h-40 rounded-md border"
            loading="lazy"
            allowFullScreen
            src={mapUrl}
        ></iframe>
    </div>
  );
};

const createUnitFormSchema = z.object({
  unitName: z.string().min(3, "Unit name must be at least 3 characters."),
  unitCode: z.string().min(3, "Unit code must be at least 3 characters.").max(10, "Unit code must be 10 characters or less."),
  attendanceThreshold: z.coerce.number().min(0).max(100, "Threshold must be between 0 and 100."),
});

function CreateUnitForm({ setOpen }: { setOpen: (open: boolean) => void }) {
  const { user } = useUser();
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
    if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in to create a unit." });
        return;
    }
    const result = await createUnit(values.unitName, values.unitCode, user.uid, values.attendanceThreshold);
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

export function LecturerDashboard({
  students,
  unit,
  signedInStudents,
  isSessionActive,
  onToggleSession,
  onManualAttendanceToggle,
  sessionDuration,
  setSessionDuration,
  sessionEndTime,
  sessionPin,
  lecturerLocation,
  setLecturerLocation,
  radius,
  setRadius,
}: {
  students: Student[];
  unit: Unit;
  signedInStudents: SignedInStudent[];
  isSessionActive: boolean;
  onToggleSession: () => void;
  onManualAttendanceToggle: (studentId: string, week: string) => void;
  sessionDuration: number;
  setSessionDuration: (duration: number) => void;
  sessionEndTime: Date | null;
  sessionPin: string;
  lecturerLocation: GeolocationCoordinates | null;
  setLecturerLocation: (location: GeolocationCoordinates | null) => void;
  radius: number;
  setRadius: (radius: number) => void;
}) {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isCreateUnitOpen, setIsCreateUnitOpen] = useState(false);
  const { toast } = useToast();

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
        setLecturerLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        toast({
            title: "Location Set",
            description: "Your current location has been set for the session.",
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
  
  if (!unit) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-10">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>Welcome, Lecturer!</CardTitle>
            <CardDescription>You haven't created any units yet. Create a unit to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isCreateUnitOpen} onOpenChange={setIsCreateUnitOpen}>
              <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2"/> Create Your First Unit</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a New Unit</DialogTitle>
                  <DialogDescription>
                    Fill in the details below to add a new unit.
                  </DialogDescription>
                </DialogHeader>
                <CreateUnitForm setOpen={setIsCreateUnitOpen} />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="font-headline">Session Control</CardTitle>
          <CardDescription>Manage the attendance session.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-4">
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

                {lecturerLocation && <LocationMap location={lecturerLocation} />}

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
                 <div className="w-full pt-4 mt-4 border-t">
                   <LocationMap location={lecturerLocation} />
                 </div>
               )}
             </>
          )}

        </CardContent>
      </Card>
      
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="font-headline">Live Session Details</CardTitle>
          <CardDescription>Scan QR and enter the PIN to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
           {isSessionActive ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="bg-white p-4 rounded-lg">
                    <QRCode value={unit.name} size={160} />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground text-sm">CURRENT PIN</p>
                    <p className="text-6xl font-mono font-bold tracking-widest text-primary animate-pulse">{sessionPin}</p>
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

      <Card className="md:col-span-2 lg:col-span-3">
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
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={avatar?.imageUrl} alt={student.name} data-ai-hint={avatar?.imageHint}/>
                              <AvatarFallback>{student.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.name}</span>
                            {student.isDuplicateDevice && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Signed in from a previously used device.</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{student.signedInAt}</TableCell>
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
          <AttendanceAnalytics students={students} attendanceThreshold={unit.attendanceThreshold} />
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
