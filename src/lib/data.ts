import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

export type Student = {
  id: string;
  name: string;
  avatarId: string;
  attendance: Record<string, boolean>;
};

export const COURSE_NAME = "CS-452: Advanced Web Architectures";
export const ATTENDANCE_THRESHOLD = 85;

export const students: Student[] = [
  {
    id: 's1',
    name: 'Liam Johnson',
    avatarId: 'student-1',
    attendance: { '1': true, '2': true, '3': true, '4': false, '5': true, '6': true, '7': true, '8': true, '9': true, '10': true },
  },
  {
    id: 's2',
    name: 'Olivia Smith',
    avatarId: 'student-2',
    attendance: { '1': true, '2': true, '3': true, '4': true, '5': true, '6': true, '7': true, '8': true, '9': true, '10': true },
  },
  {
    id: 's3',
    name: 'Noah Williams',
    avatarId: 'student-3',
    attendance: { '1': true, '2': false, '3': false, '4': true, '5': false, '6': true, '7': true, '8': false, '9': true, '10': true },
  },
  {
    id: 's4',
    name: 'Emma Brown',
    avatarId: 'student-4',
    attendance: { '1': true, '2': true, '3': true, '4': true, '5': true, '6': false, '7': true, '8': true, '9': false, '10': true },
  },
  {
    id: 's5',
    name: 'Ava Jones',
    avatarId: 'student-5',
    attendance: { '1': true, '2': true, '3': true, '4': true, '5': true, '6': true, '7': true, '8': true, '9': true, '10': false },
  },
];

export function findImage(avatarId: string): ImagePlaceholder | undefined {
  return PlaceHolderImages.find(img => img.id === avatarId);
}
