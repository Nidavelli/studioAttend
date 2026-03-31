'use client';

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore } from '@/firebase/provider';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { RefreshCw, User, Mail, GraduationCap, School } from 'lucide-react';
import { getAvatarUrl, generateAvatar } from '@/lib/avatars';
import { useRouter } from 'next/navigation';

const profileFormSchema = z.object({
  name: z.string().min(1, { message: "Full name is required." }),
});

export default function ProfilePage() {
  const { user, loading } = useUserProfile();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [isSaving, setIsSaving] = useState(false);
  const [avatar, setAvatar] = useState({ style: '', seed: '' });

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
    if (user) {
      form.reset({ name: user.name || user.displayName || '' });
      setAvatar({ style: user.avatarStyle || 'identicon', seed: user.avatarSeed || user.uid });
    }
  }, [user, loading, router, form]);

  const handleRegenerateAvatar = async () => {
    if (!user) return;
    const newAvatar = generateAvatar(user.uid);
    setAvatar(newAvatar);
    
    const userDocRef = doc(firestore, 'users', user.uid);
    try {
        await updateDoc(userDocRef, {
            avatarStyle: newAvatar.style,
            avatarSeed: newAvatar.seed,
        });
        toast({ title: 'Avatar Updated!', description: 'Your new avatar has been saved.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your new avatar.' });
        setAvatar({ style: user.avatarStyle || 'identicon', seed: user.avatarSeed || user.uid });
    }
  };

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    setIsSaving(true);
    
    const userDocRef = doc(firestore, 'users', user.uid);

    try {
        await updateDoc(userDocRef, {
            name: values.name
        });
        if (user.displayName !== values.name) {
            await updateAuthProfile(user, { displayName: values.name });
        }
        toast({ title: 'Profile Updated', description: 'Your changes have been saved successfully.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your profile changes.' });
    } finally {
        setIsSaving(false);
    }
  };
  
  if (loading || !user) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 flex justify-center">
            <Card className="w-full max-w-2xl h-fit">
                <CardHeader><Skeleton className="h-8 w-48" /></CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col items-center gap-4">
                        <Skeleton className="h-32 w-32 rounded-full" />
                        <Skeleton className="h-10 w-40" />
                    </div>
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        </main>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(avatar.style, avatar.seed);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="font-headline text-3xl">My Profile</CardTitle>
            <CardDescription>View and edit your personal information.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="flex flex-col items-center gap-4">
                <Image
                    src={avatarUrl}
                    alt="User Avatar"
                    width={128}
                    height={128}
                    className="rounded-full bg-muted border"
                    unoptimized
                />
                <Button variant="outline" onClick={handleRegenerateAvatar}>
                    <RefreshCw className="mr-2 h-4 w-4"/>
                    Regenerate Avatar
                </Button>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><User /> Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={isSaving}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail /> Email Address</Label>
                    <Input value={user.email || ''} readOnly disabled />
                </div>
                
                 <div className="space-y-2">
                    <Label className="flex items-center gap-2">{user.role === 'lecturer' ? <School/> : <GraduationCap/>} Role</Label>
                    <Input value={user.role?.charAt(0).toUpperCase() + user.role?.slice(1)} readOnly disabled />
                </div>

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </Form>

          </CardContent>
        </Card>
      </main>
    </div>
  );
}
