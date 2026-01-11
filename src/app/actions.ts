"use server";

import { generatePersonalizedAttendanceSheet, type GeneratePersonalizedAttendanceSheetInput } from "@/ai/flows/generate-personalized-attendance-sheet";
import { generatePersonalizedAttendanceSummary, type PersonalizedAttendanceSummaryInput } from "@/ai/flows/personalized-attendance-summary";

export async function getPersonalizedSheet(input: GeneratePersonalizedAttendanceSheetInput): Promise<string> {
  try {
    const result = await generatePersonalizedAttendanceSheet(input);
    return result.attendanceSheet;
  } catch (error) {
    console.error("Error generating personalized sheet:", error);
    return "Error: Could not generate attendance sheet.";
  }
}

export async function getAttendanceSummary(input: PersonalizedAttendanceSummaryInput): Promise<string> {
  try {
    const result = await generatePersonalizedAttendanceSummary(input);
    return result.summary;
  } catch (error) {
    console.error("Error generating attendance summary:", error);
    return "Error: Could not generate attendance summary.";
  }
}
