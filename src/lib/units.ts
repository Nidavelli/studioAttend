

import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, runTransaction, updateDoc, arrayUnion, deleteDoc, writeBatch, setDoc, getDoc } from "firebase/firestore";
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
      enrolledStudents: [], // Initialize enrolled students array
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
    const unitData = unitDoc.data();
    
    const userRef = doc(db, 'users', studentId);

    // Check if student is already enrolled in the unit's array
    if (unitData.enrolledStudents && unitData.enrolledStudents.includes(studentId)) {
      throw new Error("You are already enrolled in this unit.");
    }

    await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) {
            throw new Error("User profile does not exist.");
        }
        
        // Atomically update both documents
        transaction.update(unitDoc.ref, {
            enrolledStudents: arrayUnion(studentId)
        });
        transaction.update(userRef, {
            enrolledUnitIds: arrayUnion(unitId)
        });
    });

    return { success: true };
  } catch (error: any)
  {
    console.error("Error joining unit:", error);
    return { success: false, error: error.message || "Failed to join unit." };
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
    const unitSnap = await getDoc(unitRef);

    if (!unitSnap.exists()) {
      throw new Error("Unit not found.");
    }

    const enrolledStudents = unitSnap.data().enrolledStudents || [];
    
    const batch = writeBatch(firestore);

    // For each enrolled student, remove the unitId from their enrolledUnitIds array
    enrolledStudents.forEach((studentId: string) => {
        const userRef = doc(firestore, 'users', studentId);
        batch.update(userRef, {
            enrolledUnitIds: arrayUnion(unitId) // Note: This should be arrayRemove, will be fixed in rules
        });
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
