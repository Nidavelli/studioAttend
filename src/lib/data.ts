import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

// The Student type now includes a `uid` from Firebase Auth.
// The `attendance` is still managed locally for now, to be moved to Firestore in Phase 4.
export type Student = {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer';
  avatarId: string; // This will be phased out, but kept for avatar logic
  attendance: Record<string, boolean>;
};

// The Unit type aligns with the new Firestore document structure.
// It stores student IDs instead of full student objects.
export type Unit = {
  id: string; // Firestore document ID
  name: string;
  code: string;
  lecturerId: string;
  attendanceThreshold: number;
  enrolledStudents: string[]; // Array of student UIDs
};


export function findImage(avatarId: string): ImagePlaceholder | undefined {
  // This function remains to support existing avatar logic.
  return PlaceHolderImages.find(img => img.id === avatarId);
}
