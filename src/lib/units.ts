
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
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
    
    // Check if unit code already exists
    const q = query(unitsRef, where("code", "==", unitCode));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      return { success: false, error: "A unit with this code already exists." };
    }

    await addDoc(unitsRef, {
      name: unitName,
      code: unitCode,
      lecturerId: lecturerId,
      attendanceThreshold: attendanceThreshold,
      enrolledStudents: [],
      createdAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error creating unit:", error);
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
    const unitData = unitDoc.data();

    if (unitData.enrolledStudents.includes(studentId)) {
        return { success: false, error: "You are already enrolled in this unit." };
    }

    await updateDoc(doc(db, "units", unitDoc.id), {
      enrolledStudents: arrayUnion(studentId),
    });

    return { success: true };
  } catch (error: any)
  {
    console.error("Error joining unit:", error);
    return { success: false, error: error.message || "Failed to join unit." };
  }
}
