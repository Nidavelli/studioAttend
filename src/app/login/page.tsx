'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { AttendSyncIcon } from '@/components/icons';
import { GraduationCap, School, Eye, EyeOff, CheckCircle, MapPin, QrCode } from 'lucide-react';


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);


  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [signUpRole, setSignUpRole] = useState('student');

  const handleLoginSuccess = (user: any) => {
    toast({
      title: 'Login Successful',
      description: `Welcome back, ${user.displayName || user.email}!`,
    });
    router.push('/');
  };

  const handleSignUpSuccess = async (user: any) => {
    toast({
      title: 'Sign Up Successful!',
      description: `Welcome, ${user.displayName}!`,
    });
    router.push('/');
  };

  const handleAuthError = (error: any) => {
    let description = error.message || 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-in-use') {
        description = 'This email address is already in use by another account.';
    } else if (error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please try again.';
    } else if (error.code === 'permission-denied') {
        description = 'There was a problem setting up your profile. Please check Firestore rules.';
    }
    
    toast({
      variant: 'destructive',
      title: 'Authentication Failed',
      description: description,
    });
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await signInWithEmailAndPassword(auth, signInEmail, signInPassword);
      handleLoginSuccess(result.user);
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
    } catch (error) {
      handleAuthError(error);
      return;
    }

    try {
      const user = userCredential.user;
      await updateProfile(user, { displayName: signUpName });

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        name: signUpName,
        email: signUpEmail,
        role: signUpRole,
      });

      await user.reload();
      await handleSignUpSuccess(user);
    } catch (error) {
        console.error("Error saving user profile:", error);
        toast({
            variant: 'destructive',
            title: 'Registration Incomplete',
            description: 'Your account was created, but we failed to save your profile information. Please contact support.',
        });
    }
  };


  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col bg-muted p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-primary" />
        <div className="relative z-20 flex items-center text-lg font-medium">
            <AttendSyncIcon className="h-8 w-8 mr-3" />
            AttendSync
        </div>
        <div className="relative z-20 mt-auto">
            <div className="space-y-2">
                 <h2 className="text-4xl font-bold font-headline">Modernize Your Attendance Tracking</h2>
                 <p className="text-primary-foreground/80">
                    AttendSync replaces tedious manual attendance with a secure, real-time system, ensuring academic integrity and saving valuable class time.
                 </p>
            </div>
        </div>
         <div className="relative z-20 mt-10">
            <h3 className="font-semibold mb-4 font-headline">Key Features:</h3>
            <ul className="space-y-4">
                <li className="flex items-start gap-3">
                    <QrCode className="h-6 w-6 mt-1 text-accent"/>
                    <div>
                        <h4 className="font-semibold">Dynamic QR Attendance</h4>
                        <p className="text-sm text-primary-foreground/70">Lecturers generate time-sensitive QR codes and PINs for secure, in-class verification.</p>
                    </div>
                </li>
                <li className="flex items-start gap-3">
                    <MapPin className="h-6 w-6 mt-1 text-accent"/>
                     <div>
                        <h4 className="font-semibold">Geofenced Location Verification</h4>
                        <p className="text-sm text-primary-foreground/70">Ensure students are physically present with location-based sign-ins within a set radius.</p>
                    </div>
                </li>
                <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 mt-1 text-accent"/>
                     <div>
                        <h4 className="font-semibold">Immutable & Secure Records</h4>
                        <p className="text-sm text-primary-foreground/70">All attendance records are permanent and tamper-proof, providing a reliable audit trail.</p>
                    </div>
                </li>
            </ul>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
            <div className="grid gap-2 text-center">
                 <h1 className="text-3xl font-bold font-headline">Login to AttendSync</h1>
                 <p className="text-balance text-muted-foreground">
                    Enter your credentials to access your dashboard
                 </p>
            </div>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={handleEmailSignIn} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-signin">Email</Label>
                    <Input
                      id="email-signin"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                    />
                  </div>
                  <div className="relative space-y-2">
                    <Label htmlFor="password-signin">Password</Label>
                    <Input
                      id="password-signin"
                      type={showSignInPassword ? 'text' : 'password'}
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-7 h-7 w-7"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                    >
                        {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="submit" className="w-full">
                    Sign In
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={handleEmailSignUp} className="space-y-4 pt-4">
                   <div className="space-y-2">
                    <Label>Your Role</Label>
                    <RadioGroup defaultValue="student" className="grid grid-cols-2 gap-4" onValueChange={setSignUpRole}>
                      <div>
                        <RadioGroupItem value="student" id="r1" className="peer sr-only" />
                        <Label
                          htmlFor="r1"
                          className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                          <GraduationCap className="h-5 w-5" />
                          Student
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="lecturer" id="r2" className="peer sr-only" />
                        <Label
                          htmlFor="r2"
                          className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                           <School className="h-5 w-5" />
                          Lecturer
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name-signup">Full Name</Label>
                    <Input
                      id="name-signup"
                      type="text"
                      placeholder="John Doe"
                      required
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-signup">Email</Label>
                    <Input
                      id="email-signup"
                      type="email"
                      placeholder="m@example.com"
                      required
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                    />
                  </div>
                   <div className="relative space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input
                      id="password-signup"
                      type={showSignUpPassword ? 'text' : 'password'}
                      required
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                    />
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-7 h-7 w-7"
                        onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    >
                        {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="submit" className="w-full">
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}
