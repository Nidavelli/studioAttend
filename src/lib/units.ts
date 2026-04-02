
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

    const enrollmentRef = doc(db, `units/${unitId}/enrolledStudents`, studentId);
    const enrollmentSnap = await getDoc(enrollmentRef);

    if (enrollmentSnap.exists()) {
        throw new Error("You are already enrolled in this unit.");
    }
    
    await setDoc(enrollmentRef, {
        studentId: studentId,
        enrolledAt: serverTimestamp()
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
    
    const batch = writeBatch(db);

    // Delete all enrolled students in the subcollection
    const enrolledStudentsRef = collection(db, 'units', unitId, 'enrolledStudents');
    const enrolledStudentsSnapshot = await getDocs(enrolledStudentsRef);
    enrolledStudentsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });

    // Delete all attendance records in the subcollection
    const attendanceRef = collection(db, 'units', unitId, 'attendance');
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
