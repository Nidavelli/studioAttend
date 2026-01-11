# **App Name**: AttendSync

## Core Features:

- Session Initiation: Lecturers can initiate attendance sessions, defining location radius and time window.
- Proximity Verification: Students' locations are validated against the lecturer's location using the Haversine formula to confirm they are within the allowed radius.
- Biometric Authentication: A biometric function simulates device-bound authentication to prevent proxy attendance.
- Attendance Recording: Upon successful location and biometric validation, attendance is recorded, checking for active sessions, proximity, and duplicate sign-ins.
- Real-Time Lecturer Ledger: Lecturers receive real-time updates via Socket.IO as students successfully sign in.
- Attendance Analytics: Computes attendance percentages per student and flags those below an 85% threshold.
- Attendance Sheet Template Generation: Generate a personalized attendance sheet template once a student signs, displaying their name and marked attendance for all weeks, utilizing generative AI as a tool.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5) to convey trust and security.
- Background color: Light gray (#F0F2F5), providing a clean, neutral backdrop.
- Accent color: Amber (#FFC107) to highlight important actions and notifications, creating contrast and drawing attention.
- Font pairing: 'Space Grotesk' (sans-serif) for headlines and 'Inter' (sans-serif) for body text. The former will give a contemporary, high-tech, digital feel.
- Code font: 'Source Code Pro' for displaying any code snippets.
- Use simple, clear icons to represent actions like 'sign in', 'location', and 'attendance'.
- Subtle animations to confirm successful sign-in and updates to the lecturer ledger.