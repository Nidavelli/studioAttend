# CHAPTER SEVEN: APPENDICES

## 7.1 Introduction

The appendices provide supplementary material that supports the main body of the project report. This section contains detailed evidence of the system's implementation and testing, including visual screenshots of the user interface, comprehensive test case documentation, and excerpts of key code snippets that were critical to the system's functionality. This information is included here to provide a deeper, more technical look into the project without disrupting the narrative flow of the main chapters.

---

## Appendix A: System Screenshots

This appendix contains a collection of screenshots from the final AttendSync application, illustrating the key user interfaces for both the lecturer and student roles.

---

### A.1 Login and Sign-Up Page

*Figure A.1: The main login page, showing options for email/password and Google Sign-In, with a clear separation between the "Sign In" and "Sign Up" forms.*

![Login Page](https://placeholder.com/image.jpg "Figure A.1: Login Page")

---

### A.2 Student Role Selection

*Figure A.2: The role selection screen presented to new users after signing up with a Google account for the first time.*

![Student Role Selection](https://placeholder.com/image.jpg "Figure A.2: Student Role Selection")

---

### A.3 Student Dashboard

*Figure A.3: The primary dashboard for a student, displaying a grid of cards for each enrolled unit, including attendance progress and session status.*

![Student Dashboard](https://placeholder.com/image.jpg "Figure A.3: Student Dashboard")

---

### A.4 Student Sign-In Dialog (Method Choice)

*Figure A.4: The dialog that appears when a student clicks "Sign In Now," presenting the choice between location-based and QR code sign-in.*

![Student Sign-In Dialog](https://placeholder.com/image.jpg "Figure A.4: Student Sign-In Dialog")

---

### A.5 Location Sign-In Failure (Geofence Error)

*Figure A.5: The error message and map displayed to a student who attempts to sign in with location but is outside the designated radius.*

![Geofence Error](https://placeholder.com/image.jpg "Figure A.5: Geofence Error")

---

### A.6 Lecturer Dashboard (Session Inactive)

*Figure A.6: The main dashboard for a lecturer before a session has started, showing the session control panel for setting location, radius, and duration.*

![Lecturer Dashboard Inactive](https://placeholder.com/image.jpg "Figure A.6: Lecturer Dashboard Inactive")

---

### A.7 Lecturer Dashboard (Session Active)

*Figure A.7: The lecturer's dashboard during an active session, prominently displaying the live QR code, refreshing PIN, and countdown timer.*

![Lecturer Dashboard Active](https://placeholder.com/image.jpg "Figure A.7: Lecturer Dashboard Active")

---

### A.8 Live Attendance Ledger

*Figure A.8: A close-up of the Live Attendance Ledger, showing students appearing in real-time as they successfully sign in.*

![Live Attendance Ledger](https://placeholder.com/image.jpg "Figure A.8: Live Attendance Ledger")

---

### A.9 Attendance Analytics Tab

*Figure A.9: The "Attendance Analytics" tab, showing a summary of each student's overall attendance percentage and status.*

![Attendance Analytics](https://placeholder.com/image.jpg "Figure A.9: Attendance Analytics")

---

### A.10 Manual Attendance Grid

*Figure A.10: The "Manual Attendance Grid" tab, providing a comprehensive matrix of student attendance for all past sessions, with the ability for lecturers to manually mark a student present.*

![Manual Attendance Grid](https://placeholder.com/image.jpg "Figure A.10: Manual Attendance Grid")

---

## Appendix B: Detailed Test Cases

This appendix provides a more detailed breakdown of the test cases executed during the system testing phase.

---

### B.1 System Test Cases

| Test Case ID | Scenario                               | Steps                                                                                                                                                                                            | Expected Result                                                                                                    | Actual Result | Status  |
| :----------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------- | :------------ | :------ |
| **ST-01**    | Student Sign-in (Location - Success)   | 1. Lecturer starts session with 100m radius. <br> 2. Student A (within 50m) logs in. <br> 3. Student A clicks "Sign In Now". <br> 4. Student A chooses "Sign In with Location".                   | Student A is marked present. Success message and confetti are shown. Student A appears on the live ledger.         | As expected   | Passed  |
| **ST-02**    | Student Sign-in (Location - Failure)   | 1. Lecturer starts session with 50m radius. <br> 2. Student B (at 200m) logs in. <br> 3. Student B clicks "Sign In Now". <br> 4. Student B chooses "Sign In with Location".                       | Sign-in fails. An error message is displayed with a map showing the student is outside the geofence.               | As expected   | Passed  |
| **ST-03**    | Student Sign-in (QR + PIN - Success)   | 1. Lecturer starts session. <br> 2. Student C scans the QR code. <br> 3. Student C enters the correct, currently displayed PIN.                                                                    | Student C is marked present. Success message is shown. Student C appears on the live ledger.                       | As expected   | Passed  |
| **ST-04**    | Student Sign-in (QR + PIN - Failure)   | 1. Lecturer starts session. <br> 2. Student D scans the QR code. <br> 3. Student D enters an incorrect PIN.                                                                                        | Sign-in fails. An "Incorrect PIN" error is displayed.                                                              | As expected   | Passed  |
| **ST-05**    | Duplicate Sign-in Attempt              | 1. Student A successfully signs in using location. <br> 2. Student A attempts to sign in again using either location or QR code.                                                                | Sign-in fails. An error message "You have already signed in for this session" is displayed.                        | As expected   | Passed  |
| **ST-06**    | Lecturer Creates Unit                  | 1. Lecturer logs in. <br> 2. Clicks "New Unit". <br> 3. Fills in unit name, code, and threshold. <br> 4. Clicks "Create Unit".                                                                      | The new unit is created and appears in the "Select a unit" dropdown. A success toast is shown.                     | As expected   | Passed  |
| **ST-07**    | Student Joins Unit                     | 1. Student logs in. <br> 2. Clicks "Join a Unit". <br> 3. Enters a valid unit code. <br> 4. Clicks "Join Unit".                                                                                    | The student is enrolled. A new unit card appears on their dashboard.                                               | As expected   | Passed  |
| **ST-08**    | Real-time UI Update for Student        | 1. Student and Lecturer are logged in on separate devices. <br> 2. Lecturer starts a session for a unit the student is enrolled in.                                                                 | The student's unit card for that unit automatically updates from "Session Inactive" to a pulsing "Sign In Now".    | As expected   | Passed  |
| **ST-09**    | Manual Attendance Override             | 1. Lecturer navigates to the "Manual Attendance Grid". <br> 2. For an absent student (marked with X), the lecturer clicks the X button.                                                            | The X changes to a checkmark. The student's attendance record is created. Their overall percentage is updated.     | As expected   | Passed  |

---

### B.2 Database Security Rule Test Cases

| Test Case ID | Rule Being Tested                     | Action                                                                                                 | Authenticated As | Expected Result                                        | Status |
| :----------- | :------------------------------------ | :----------------------------------------------------------------------------------------------------- | :--------------- | :----------------------------------------------------- | :----- |
| **DB-01**    | `users` write access                  | Attempt to update another user's profile document.                                                     | 'Student'        | Permission Denied.                                     | Passed |
| **DB-02**    | `units` create access                 | Attempt to create a new document in the `/units` collection.                                           | 'Student'        | Permission Denied.                                     | Passed |
| **DB-03**    | `units` create access                 | Attempt to create a new document in the `/units` collection.                                           | 'Lecturer'       | Success.                                               | Passed |
| **DB-04**    | `units` student enrollment (valid)    | Attempt to update a unit by adding own UID to `enrolledStudents` array.                                | 'Student'        | Success.                                               | Passed |
| **DB-05**    | `units` student enrollment (invalid)  | Attempt to update a unit by changing the unit `name`.                                                  | 'Student'        | Permission Denied.                                     | Passed |
| **DB-06**    | `attendance` create access (valid)    | Create an attendance record for self in an active session of an enrolled unit.                         | 'Student'        | Success.                                               | Passed |
| **DB-07**    | `attendance` create access (invalid)  | Create an attendance record for self in a unit they are not enrolled in.                               | 'Student'        | Permission Denied.                                     | Passed |
| **DB-08**    | Immutability of `attendance` records  | Attempt to `update` an existing attendance record.                                                     | 'Student'        | Permission Denied.                                     | Passed |
| **DB-09**    | Immutability of `attendance` records  | Attempt to `delete` an existing attendance record.                                                     | 'Lecturer'       | Permission Denied.                                     | Passed |

---

## Appendix C: Key Code Snippets

This appendix provides excerpts of the most critical functions and configurations from the AttendSync codebase.

---

### C.1 Haversine Distance Calculation

*File: `/src/lib/utils.ts`*
*Description: The core function used for the location-based sign-in. It calculates the great-circle distance between two GPS coordinates in meters, which is then compared against the lecturer-defined session radius.*

```typescript
/**
 * Calculates the distance between two geolocation coordinates using the Haversine formula.
 * @param coords1 - The first coordinates { lat, lng }.
 * @param coords2 - The second coordinates { lat, lng }.
 * @returns The distance in meters.
 */
export function haversineDistance(
  coords1: { lat: number; lng: number },
  coords2: { lat: number; lng: number }
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;

  const R = 6371e3; // Earth's radius in meters
  const dLat = toRad(coords2.lat - coords1.lat);
  const dLon = toRad(coords2.lng - coords1.lng);
  const lat1 = toRad(coords1.lat);
  const lat2 = toRad(coords2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
```

---

### C.2 Firestore Security Rules for Attendance Records

*File: `firestore.rules`*
*Description: These rules are the cornerstone of the system's data integrity. They define who can read and create attendance records and, most critically, enforce their immutability by explicitly denying all update and delete operations.*

```rules
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... other rules for users and units
    
    match /units/{unitId} {

      // ... unit rules
      
      // Rules for the nested 'attendance' sub-collection
      match /attendance/{attendanceId} {
        // A user can read a record if they are the lecturer of the unit,
        // OR if the record belongs to them. This covers both GET and LIST.
        allow read: if
          (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'lecturer' &&
           get(/databases/$(database)/documents/units/$(unitId)).data.lecturerId == request.auth.uid)
          ||
          (resource.data.studentId == request.auth.uid);

        // CREATE rule: A student can create an attendance record for themselves if they are enrolled in the unit
        // and the session is valid. A lecturer can also create a record on behalf of any student.
        allow create: if (
                        request.auth != null &&
                        request.resource.data.studentId == request.auth.uid && // Student signing in for themselves
                        request.auth.uid in get(/databases/$(database)/documents/units/$(unitId)).data.enrolledStudents &&
                        request.resource.data.sessionId in get(/databases/$(database)/documents/units/$(unitId)).data.sessionHistory
                      ) || (
                        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'lecturer' && // Lecturer manual sign-in
                        get(/databases/$(database)/documents/units/$(unitId)).data.lecturerId == request.auth.uid
                      );
        
        // No one can update or delete attendance records to ensure an immutable log.
        allow update, delete: if false;
      }
    }
  }
}
```

---

### C.3 Student Real-Time Session Status Listener

*File: `/src/app/page.tsx`*
*Description: This `useEffect` hook is the heart of the real-time experience for students. It subscribes to changes in the units they are enrolled in. When a lecturer starts a session (populating `activeSessionId` in the database), this listener instantly receives the update and changes the UI, prompting the student to sign in without needing a page refresh.*

```typescript
// Effect for students to fetch units
useEffect(() => {
    if (role !== 'student' || !user) return;
    setIsDataLoading(true);
    const q = query(collection(firestore, "units"), where("enrolledStudents", "array-contains", user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const fetchedUnits: Unit[] = [];
        querySnapshot.forEach((doc) => {
            const unitData = { id: doc.id, ...doc.data() } as Unit;
            fetchedUnits.push(unitData);
            // Real-time update for active session
            if (unitData.activeSessionId && unitData.sessionEndTime && (unitData.sessionEndTime as Timestamp).toDate() > new Date()) {
              setSelectedUnitId(unitData.id);
              setActiveSessionId(unitData.activeSessionId);
            }
        });

        // ... logic to fetch attendance counts for each unit ...
        
    }, (error) => {
        // ... error handling
    });

    return () => unsubscribe();
}, [role, user, firestore, toast, auth]);
```

---

### C.4 AI Summary Generation Server Action

*File: `/src/app/actions.ts`*
*Description: This server action is the bridge between the frontend and the Genkit AI service. It securely calls the AI flow on the server with the student's data, ensuring that API keys and proprietary prompts are not exposed to the client.*

```typescript
"use server";

import { generatePersonalizedAttendanceSummary, type PersonalizedAttendanceSummaryInput } from "@/ai/flows/personalized-attendance-summary";

export async function getAttendanceSummary(input: PersonalizedAttendanceSummaryInput): Promise<string> {
  try {
    const result = await generatePersonalizedAttendanceSummary(input);
    return result.summary;
  } catch (error) {
    console.error("Error generating attendance summary:", error);
    return "Error: Could not generate attendance summary.";
  }
}
```
