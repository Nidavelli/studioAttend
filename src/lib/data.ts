import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

// The Student type now only holds user profile information.
// Attendance is managed in a separate collection.
export type Student = {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer';
  avatarId: string;
};

// The Unit type is expanded to track session history,
// which is essential for calculating attendance percentages.
export type Unit = {
  id: string; // Firestore document ID
  name: string;
  code: string;
  lecturerId: string;
  attendanceThreshold: number;
  enrolledStudents: string[]; // Array of student UIDs
  sessionHistory: string[]; // Array of session IDs
};

// Represents a single, immutable attendance record for a student in a session.
export type AttendanceRecord = {
  id: string; // Firestore document ID
  studentId: string;
  sessionId: string;
  timestamp: any; // Firestore Timestamp
  signInMethod: 'location' | 'qr_code';
};

// A helper type for the student dashboard to combine unit data
// with their personal attendance count for that unit.
export type UnitWithAttendance = Unit & {
  attendedSessionsCount: number;
};


export function findImage(avatarId: string): ImagePlaceholder | undefined {
  // This function remains to support existing avatar logic.
  return PlaceHolderImages.find(img => img.id === avatarId);
}
