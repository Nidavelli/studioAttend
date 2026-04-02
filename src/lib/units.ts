
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, runTransaction, updateDoc, arrayUnion, deleteDoc, writeBatch, setDoc, getDoc, arrayRemove } from "firebase/firestore";
import { firebaseApp } from "@/firebase/config";

const db = getFirestore(firebaseApp);

export async function createUnit(
  unitName: string,
  unitCode: string,
  lecturerId: string,
  attendanceThreshold: number
): Promise<{ success: boolean; error?: string; }> {
  try {
    const unitsRef = collection(db, "units");
    
    await addDoc(unitsRef, {
      name: unitName,
      code: unitCode,
      lecturerId: lecturerId,
      attendanceThreshold: attendanceThreshold,
      sessionHistory: [],
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error creating unit:", error);
    if (error.code === 'permission-denied') {
        return { success: false, error: "Permission denied. Please ensure you are logged in as a lecturer and your security rules are configured correctly." };
    }
    return { success: false, error: error.message || "Failed to create unit." };
  }
}


export async function joinUnit(
  unitCode: string,
  studentId: string
): Promise<{ success: boolean; error?: string; }> {
   try {
    const unitsRef = collection(db, "units");
    const q = query(unitsRef, where("code", "==", unitCode));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { success: false, error: "Unit with this code not found." };
    }

    const unitDoc = querySnapshot.docs[0];
    const unitId = unitDoc.id;
    
    const userRef = doc(db, 'users', studentId);

    await runTransaction(db, async (transaction) => {
        const userDocSnap = await transaction.get(userRef);
        if (!userDocSnap.exists()) {
            throw new Error("Your user profile could not be found. Cannot join unit.");
        }

        const enrollmentRef = doc(db, "units", unitId, "enrolledStudents", studentId);
        const enrollmentDoc = await transaction.get(enrollmentRef);
        if (enrollmentDoc.exists()) {
             throw new Error("You are already enrolled in this unit.");
        }

        // Create the enrollment document in the subcollection
        transaction.set(enrollmentRef, {
            studentId: studentId,
            enrolledAt: serverTimestamp(),
        });
        
        // Update the user's document with the enrolled unit ID
        transaction.update(userRef, {
            enrolledUnitIds: arrayUnion(unitId)
        });
    });

    return { success: true };
  } catch (error: any)
  {
    console.error("Error joining unit:", error);
    return { success: false, error: error.message || "Failed to join unit. Check permissions." };
  }
}

export async function addSessionToUnitHistory(unitId: string, sessionId: string) {
    const unitRef = doc(db, "units", unitId);
    await updateDoc(unitRef, {
        sessionHistory: arrayUnion(sessionId)
    });
}

export async function deleteUnit(
  unitId: string,
  firestore: any
): Promise<{ success: boolean; error?: string; }> {
  try {
    const unitRef = doc(firestore, 'units', unitId);
    
    const batch = writeBatch(firestore);

    // Query the enrolledStudents sub-collection to get all student IDs
    const enrollmentsRef = collection(firestore, 'units', unitId, 'enrolledStudents');
    const enrollmentsSnapshot = await getDocs(enrollmentsRef);
    
    // For each enrolled student, remove the unitId from their enrolledUnitIds array
    enrollmentsSnapshot.docs.forEach((enrollmentDoc) => {
        const studentId = enrollmentDoc.id;
        const userRef = doc(firestore, 'users', studentId);
        batch.update(userRef, {
            enrolledUnitIds: arrayRemove(unitId)
        });
        // Also delete the enrollment document itself
        batch.delete(enrollmentDoc.ref);
    });

    // Delete all attendance records in the subcollection
    const attendanceRef = collection(firestore, 'units', unitId, 'attendance');
    const attendanceSnapshot = await getDocs(attendanceRef);
    attendanceSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    
    // Delete the unit document itself
    batch.delete(unitRef);

    await batch.commit();

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting unit:", error);
    return { success: false, error: error.message || "Failed to delete unit." };
  }
}
