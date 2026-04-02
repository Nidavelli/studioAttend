
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, runTransaction, updateDoc, arrayUnion, deleteDoc, writeBatch } from "firebase/firestore";
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
      enrolledStudents: [],
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

    const unitDocRef = querySnapshot.docs[0].ref;

    await runTransaction(db, async (transaction) => {
      const unitDoc = await transaction.get(unitDocRef);
      if (!unitDoc.exists()) {
        throw new Error("Unit document not found.");
      }

      const unitData = unitDoc.data();
      const currentEnrolledStudents = unitData.enrolledStudents || [];
      
      if (currentEnrolledStudents.includes(studentId)) {
        throw new Error("You are already enrolled in this unit.");
      }
      
      const newEnrolledStudents = [...currentEnrolledStudents, studentId];
      transaction.update(unitDocRef, { enrolledStudents: newEnrolledStudents });
    });

    return { success: true };
  } catch (error: any)
  {
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
  unitId: string
): Promise<{ success: boolean; error?: string; }> {
  try {
    const unitRef = doc(db, 'units', unitId);
    const attendanceRef = collection(db, 'units', unitId, 'attendance');

    // Delete all attendance records in the subcollection
    const attendanceSnapshot = await getDocs(attendanceRef);
    const batch = writeBatch(db);
    attendanceSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    // Delete the unit document itself
    await deleteDoc(unitRef);

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting unit:", error);
    return { success: false, error: error.message || "Failed to delete unit." };
  }
}
