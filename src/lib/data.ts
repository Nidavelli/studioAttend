import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

export type Student = {
  id: string;
  name: string;
  email: string;
  avatarId: string;
  attendance: Record<string, boolean>;
};

export type Course = {
  id: string;
  name: string;
  code: string;
  attendanceThreshold: number;
  students: Student[];
};

export const courses: Course[] = [
  {
    id: 'c1',
    name: 'Advanced Web Architectures',
    code: 'CS-452',
    attendanceThreshold: 85,
    students: [
      {
        id: 's1',
        name: 'Liam Johnson',
        email: 'liam.j@example.com',
        avatarId: 'student-1',
        attendance: { '1': true, '2': true, '3': true, '4': false, '5': true, '6': true, '7': true, '8': true, '9': true, '10': true },
      },
      {
        id: 's2',
        name: 'Olivia Smith',
        email: 'olivia.s@example.com',
        avatarId: 'student-2',
        attendance: { '1': true, '2': true, '3': true, '4': true, '5': true, '6': true, '7': true, '8': true, '9': true, '10': true },
      },
      {
        id: 's3',
        name: 'Noah Williams',
        email: 'noah.w@example.com',
        avatarId: 'student-3',
        attendance: { '1': true, '2': false, '3': false, '4': true, '5': false, '6': true, '7': true, '8': false, '9': true, '10': true },
      },
      {
        id: 's4',
        name: 'Emma Brown',
        email: 'emma.b@example.com',
        avatarId: 'student-4',
        attendance: { '1': true, '2': true, '3': true, '4': true, '5': true, '6': false, '7': true, '8': true, '9': false, '10': true },
      },
      {
        id: 's5',
        name: 'Ava Jones',
        email: 'ava.j@example.com',
        avatarId: 'student-5',
        attendance: { '1': true, '2': true, '3': true, '4': true, '5': true, '6': true, '7': true, '8': true, '9': true, '10': false },
      },
    ],
  },
  {
    id: 'c2',
    name: 'Introduction to AI',
    code: 'CS-361',
    attendanceThreshold: 90,
    students: [
      {
        id: 's6',
        name: 'James Wilson',
        email: 'james.w@example.com',
        avatarId: 'student-1',
        attendance: { '1': true, '2': true, '3': true, '4': true, '5': true },
      },
      {
        id: 's7',
        name: 'Isabella Garcia',
        email: 'isabella.g@example.com',
        avatarId: 'student-2',
        attendance: { '1': true, '2': false, '3': true, '4': true, '5': true },
      },
    ],
  },
];


export function findImage(avatarId: string): ImagePlaceholder | undefined {
  return PlaceHolderImages.find(img => img.id === avatarId);
}

    