'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase/provider';
import { doc, onSnapshot } from 'firebase/firestore';
import type { User as AuthUser } from 'firebase/auth';

export interface UserProfile extends AuthUser {
  name: string;
  role: 'student' | 'lecturer';
  avatarStyle?: string;
  avatarSeed?: string;
}

export function useUserProfile() {
  const { user: authUser, loading: authLoading } = useUser();
  const firestore = useFirestore();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (!authUser) {
      setLoading(false);
      setUserProfile(null);
      return;
    }

    const userDocRef = doc(firestore, 'users', authUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const profileData = docSnap.data();
        setUserProfile({
          ...authUser,
          name: profileData.name,
          email: authUser.email!,
          role: profileData.role,
          avatarStyle: profileData.avatarStyle,
          avatarSeed: profileData.avatarSeed,
        });
      } else {
        setUserProfile({
          ...authUser,
          name: authUser.displayName!,
          email: authUser.email!,
          role: 'student',
        });
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user profile:", error);
      setUserProfile({
        ...authUser,
        name: authUser.displayName!,
        email: authUser.email!,
        role: 'student',
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser, authLoading, firestore]);

  return { user: userProfile, loading };
}
