import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { firebaseApp } from './config';

export const initializeFirebase = () => {
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  return { firebaseApp, auth, firestore };
};

export * from './provider';
export * from './auth/use-user';
