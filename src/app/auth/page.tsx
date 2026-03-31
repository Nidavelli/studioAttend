'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import zxcvbn from "zxcvbn";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from '@/lib/utils';
import { generateAvatar } from '@/lib/avatars';

const signUpSchema = z.object({
  name: z.string().min(1, { message: "Full name is required." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  role: z.enum(['student', 'lecturer'], { required_error: "You must select a role." }),
  registrationNumber: z.string().min(3, "Registration number is required").max(20, "Registration number must be 20 characters or less."),
  password: z.string()
      .min(8, { message: "Password must be at least 8 characters long." })
      .regex(/[A-Z]/, { message: "Must contain at least one uppercase letter." })
      .regex(/[a-z]/, { message: "Must contain at least one lowercase letter." })
      .regex(/[0-9]/, { message: "Must contain at least one number." }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});


const PasswordStrengthMeter = ({ password }: { password?: string }) => {
    if (!password) {
        return (
             <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full" />
                </div>
                 <p className="text-xs text-muted-foreground">
                    Password must be at least 8 characters and contain one uppercase, one lowercase and one number.
                </p>
            </div>
        );
    }
    const result = zxcvbn(password);
    const score = result.score; // 0, 1, 2, 3, 4

    const getStrengthLabel = () => {
        switch (score) {
            case 0: return 'Very Weak';
            case 1: return 'Weak';
            case 2: return 'Fair';
            case 3: return 'Strong';
            case 4: return 'Very Strong';
            default: return '';
        }
    };

    const getBarColor = () => {
        switch (score) {
            case 0: return 'bg-destructive';
            case 1: return 'bg-orange-500';
            case 2: return 'bg-yellow-500';
            case 3: return 'bg-green-400';
            case 4: return 'bg-green-500';
            default: return 'bg-muted';
        }
    };

    return (
        <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2">
                <div
                    className={cn("h-2 rounded-full transition-all duration-300", getBarColor())}
                    style={{ width: `${(score + 1) * 20}%` }}
                />
            </div>
            <div className="flex justify-between items-center text-xs">
                <span className="font-medium text-muted-foreground">Strength: <span className="font-bold text-foreground">{getStrengthLabel()}</span></span>
            </div>
            {result.feedback.suggestions.length > 0 && (
                <div className="text-xs text-muted-foreground">
                    {result.feedback.suggestions.map((suggestion, index) => (
                        <p key={index}>{suggestion}</p>
                    ))}
                </div>
            )}
        </div>
    );
};

function AuthPageContent() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);

  useEffect(() => {
    if (searchParams.get('redirected') === 'true') {
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'You must be logged in to view the dashboard.',
        });
    }
  }, [searchParams, toast]);

  const form = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "student",
      registrationNumber: "",
    },
  });
  const watchedPassword = form.watch("password");

  const handleLoginSuccess = (user: any) => {
    toast({
      title: 'Login Successful',
      description: `Welcome back, ${user.displayName || user.email}!`,
    });
    router.push('/dashboard');
  };

  const handleSignUpSuccess = async (user: any) => {
    toast({
      title: 'Sign Up Successful!',
      description: `Welcome, ${user.displayName}!`,
    });
    router.push('/dashboard');
  };

  const handleAuthError = (error: any) => {
    let description = error.message || 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-in-use') {
        description = 'This email address is already in use by another account.';
    } else if (error.code === 'auth/invalid-credential') {
        description = 'Invalid email or password. Please try again.';
    } else if (error.code === 'auth/weak-password') {
        description = 'The password is too weak. Please choose a stronger password.';
    }
     else if (error.code === 'permission-denied') {
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

  const handleEmailSignUp = async (values: z.infer<typeof signUpSchema>) => {
    let userCredential;
    try {
      userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
    } catch (error) {
      handleAuthError(error);
      return;
    }

    try {
      const user = userCredential.user;
      await updateProfile(user, { displayName: values.name });

      const { style, seed } = generateAvatar(user.uid);

      const userDocRef = doc(firestore, 'users', user.uid);
      await setDoc(userDocRef, {
        uid: user.uid,
        name: values.name,
        email: values.email,
        role: values.role,
        registrationNumber: values.registrationNumber,
        avatarStyle: style,
        avatarSeed: seed,
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
                 <h1 className="text-3xl font-bold font-headline">Welcome to AttendSync</h1>
                 <p className="text-balance text-muted-foreground">
                    Your modern attendance solution
                 </p>
            </div>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                 <div className="grid gap-2 text-center pt-4">
                     <h2 className="text-xl font-bold">Login to your Account</h2>
                 </div>
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
                <div className="grid gap-2 text-center pt-4">
                     <h2 className="text-xl font-bold">Create your AttendSync Account</h2>
                </div>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleEmailSignUp)} className="space-y-4 pt-4">
                    <FormField
                      control={form.control}
                      name="role"
                      render={({ field }) => (
                        <FormItem className="space-y-2">
                          <FormLabel>Your Role</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="grid grid-cols-2 gap-4"
                            >
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem value="student" id="r1" className="peer sr-only" />
                                </FormControl>
                                <Label
                                  htmlFor="r1"
                                  className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                  <GraduationCap className="h-5 w-5" />
                                  Student
                                </Label>
                              </FormItem>
                              <FormItem>
                                <FormControl>
                                  <RadioGroupItem value="lecturer" id="r2" className="peer sr-only" />
                                </FormControl>
                                <Label
                                  htmlFor="r2"
                                  className="flex items-center justify-center gap-2 rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                                >
                                  <School className="h-5 w-5" />
                                  Lecturer
                                </Label>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Registration Number</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. PA106/G/17469/26" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="m@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                               <Input type={showSignUpPassword ? 'text' : 'password'} {...field} />
                               <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                >
                                  {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                             <div className="relative">
                                <Input type={showSignUpConfirmPassword ? 'text' : 'password'} {...field} />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                  onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                                >
                                  {showSignUpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <PasswordStrengthMeter password={watchedPassword} />
                    
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      Create Account
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AuthPageContent />
        </Suspense>
    )
}
