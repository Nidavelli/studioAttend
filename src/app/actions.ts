
"use server";

// The Genkit import is no longer needed for this simplified action.
// import { generatePersonalizedAttendanceSummary, type PersonalizedAttendanceSummaryInput } from "@/ai/flows/personalized-attendance-summary";

// We can define the input type directly here for clarity.
export type PersonalizedAttendanceSummaryInput = {
  studentName: string;
  attendanceRecords: string;
  attendanceThreshold: number;
};

export async function getAttendanceSummary(input: PersonalizedAttendanceSummaryInput): Promise<string> {
  try {
    const { studentName, attendanceRecords, attendanceThreshold } = input;

    // Handle case where there are no records
    if (!attendanceRecords) {
      return `${studentName} has no attendance records for this unit yet.`;
    }

    const records = attendanceRecords.split(', ').filter(r => r); // Filter out any empty strings
    const totalSessions = records.length;
    const attendedSessions = records.filter(r => r.endsWith('Present')).length;

    if (totalSessions === 0) {
      return `${studentName} has no attendance records for this unit yet.`;
    }

    const percentage = Math.round((attendedSessions / totalSessions) * 100);
    
    let summary = `${studentName} has attended ${attendedSessions} out of ${totalSessions} sessions (${percentage}%). `;

    if (percentage < attendanceThreshold) {
      summary += `This is below the recommended threshold of ${attendanceThreshold}% and improvement is required.`;
    } else {
      summary += `This meets or exceeds the recommended threshold of ${attendanceThreshold}%.`;
    }
    
    return summary;

  } catch (error) {
    console.error("Error generating attendance summary:", error);
    return "Error: Could not generate attendance summary.";
  }
}
