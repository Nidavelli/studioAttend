
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithWebAuthn,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase/provider';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from '@/hooks/use-toast';
import { AttendSyncIcon } from '@/components/icons';
import { KeyRound, GraduationCap, School } from 'lucide-react';

const provider = new GoogleAuthProvider();

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  React.useEffect(() => {
    const checkSupport = async () => {
      if (window.PublicKeyCredential &&
          typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
        try {
          const isSupported = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setIsPasskeySupported(isSupported);
        } catch (e) {
          console.error("Error checking passkey support:", e);
          setIsPasskeySupported(false);
        }
      } else {
        setIsPasskeySupported(false);
      }
    };
    checkSupport();
  }, []);

  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');

  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState('student');

  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [newUser, setNewUser] = useState<User | null>(null);


  const handleLoginSuccess = (user: User) => {
    toast({
      title: 'Login Successful',
      description: `Welcome back, ${user.displayName || user.email}!`,
    });
    router.push('/');
  };

  const handleSignUpSuccess = async (user: User) => {
    toast({
      title: 'Sign Up Successful!',
      description: `Welcome, ${user.displayName}!`,
    });
    router.push('/');
  };

  const handleAuthError = (error: any) => {
    toast({
      variant: 'destructive',
      title: 'Authentication Failed',
      description: error.message || 'An unexpected error occurred.',
    });
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const userDocRef = doc(firestore, "users", result.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        handleLoginSuccess(result.user);
      } else {
        setNewUser(result.user);
        setShowRoleSelection(true);
      }
    } catch (error) {
      handleAuthError(error);
    }
  };

  const handleRoleSelection = async (selectedRole: string) => {
    if (!newUser) return;
    try {
        const userDocRef = doc(firestore, "users", newUser.uid);
        await setDoc(userDocRef, {
            uid: newUser.uid,
            name: newUser.displayName,
            email: newUser.email,
            role: selectedRole,
        });
        await handleSignUpSuccess(newUser);
    } catch (error) {
        handleAuthError(error);
    }
  };
  
  const handlePasskeySignIn = async () => {
    try {
        const credential = await signInWithWebAuthn(auth);
        handleLoginSuccess(credential.user);
    } catch (error) {
        handleAuthError(error);
    }
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
    try {
      const result = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
      await updateProfile(result.user, { displayName: signUpName });

      const userDocRef = doc(firestore, "users", result.user.uid);
      await setDoc(userDocRef, {
        uid: result.user.uid,
        name: signUpName,
        email: signUpEmail,
        role: signUpRole,
      });

      await result.user.reload();
      await handleSignUpSuccess(result.user);
    } catch (error) {
      handleAuthError(error);
    }
  };

  if (showRoleSelection) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <CardTitle className="font-headline">One Last Step</CardTitle>
            <CardDescription>
              Welcome, {newUser?.displayName}! Please select your role to finish setting up your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
              <RadioGroup defaultValue="student" className="grid grid-cols-2 gap-4" onValueChange={setSignUpRole}>
                <div>
                  <RadioGroupItem value="student" id="role-student" className="peer sr-only" />
                  <Label
                    htmlFor="role-student"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <GraduationCap className="mb-3 h-6 w-6" />
                    Student
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="lecturer" id="role-lecturer" className="peer sr-only" />
                  <Label
                    htmlFor="role-lecturer"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <School className="mb-3 h-6 w-6" />
                    Lecturer
                  </Label>
                </div>
              </RadioGroup>
            <Button onClick={() => handleRoleSelection(signUpRole)} className="w-full">
              Complete Registration
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center gap-3 mb-4">
             <AttendSyncIcon className="h-8 w-8 text-primary" />
             <h1 className="text-2xl font-headline font-bold text-foreground">
                AttendSync
             </h1>
          </div>
          <CardTitle className="font-headline">Welcome</CardTitle>
          <CardDescription>
            Sign in or create an account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
             {isPasskeySupported && (
               <Button variant="outline" className="w-full" onClick={handlePasskeySignIn}>
                 <KeyRound className="mr-2 h-4 w-4" />
                 Sign in with a passkey
               </Button>
             )}
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.38 6.42C12.55 13.44 17.84 9.5 24 9.5z"
                ></path>
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.09c4.5-4.18 7.09-10.36 7.09-17.74z"
                ></path>
                <path
                  fill="#FBBC05"
                  d="M10.94 28.72c-.52-1.57-.82-3.24-.82-5.04s.3-3.47.82-5.04l-8.38-6.42C.93 16.6 0 20.14 0 24s.93 7.4 2.56 11.14l8.38-6.42z"
                ></path>
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6.09c-2.15 1.45-4.92 2.3-8.16 2.3-6.15 0-11.44-3.94-13.38-9.36l-8.38 6.42C6.51 42.62 14.62 48 24 48z"
                ></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              Sign in with Google
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
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
                  <div className="space-y-2">
                    <Label htmlFor="password-signin">Password</Label>
                    <Input
                      id="password-signin"
                      type="password"
                      required
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
                    />
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
                  <div className="space-y-2">
                    <Label htmlFor="password-signup">Password</Label>
                    <Input
                      id="password-signup"
                      type="password"
                      required
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full">
                    Create Account
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
