'use client';

import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { firebaseApp } from './config';

const auth = getAuth(firebaseApp);
const firestore = getFirestore(firebaseApp);

export const initializeFirebase = () => {
  return { firebaseApp, auth, firestore };
};

export * from './provider';
export * from './auth/use-user';
