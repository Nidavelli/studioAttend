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
