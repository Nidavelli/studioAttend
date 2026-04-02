

export type Student = {
  uid: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer';
  registrationNumber: string;
  avatarStyle?: string;
  avatarSeed?: string;
};

export type Unit = {
  id: string; // Firestore document ID
  name: string;
  code: string;
  lecturerId: string;
  attendanceThreshold: number;
  sessionHistory: string[]; // Array of session IDs
  activeSessionId?: string | null;
  sessionEndTime?: any | null; // Firestore Timestamp
  lecturerLocation?: { lat: number, lng: number };
  sessionRadius?: number;
};

export type AttendanceRecord = {
  id: string; // Firestore document ID
  studentId: string;
  registrationNumber: string;
  sessionId: string;
  lecturerId: string; // Denormalized for security rules
  timestamp: any; // Firestore Timestamp
  signInMethod: 'location' | 'qr_code' | 'manual';
  deviceId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  deviceFlag: boolean;
  location?: { lat: number, lng: number, accuracy: number };
};

export type UnitWithAttendance = Unit & {
  attendedSessionsCount: number;
};
