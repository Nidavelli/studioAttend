'use server';

/**
 * @fileOverview Generates a personalized attendance summary for a student.
 *
 * - generatePersonalizedAttendanceSummary - A function that generates the summary.
 * - PersonalizedAttendanceSummaryInput - The input type for the generatePersonalizedAttendanceSummary function.
 * - PersonalizedAttendanceSummaryOutput - The return type for the generatePersonalizedAttendanceSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PersonalizedAttendanceSummaryInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  attendanceRecords: z.string().describe('A string containing all attendance records for the student, week by week.'),
  attendanceThreshold: z.number().describe('The minimum attendance percentage required.'),
});
export type PersonalizedAttendanceSummaryInput = z.infer<typeof PersonalizedAttendanceSummaryInputSchema>;

const PersonalizedAttendanceSummaryOutputSchema = z.object({
  summary: z.string().describe('A personalized summary of the student\'s attendance, highlighting patterns and areas for improvement.'),
});
export type PersonalizedAttendanceSummaryOutput = z.infer<typeof PersonalizedAttendanceSummaryOutputSchema>;

export async function generatePersonalizedAttendanceSummary(
  input: PersonalizedAttendanceSummaryInput
): Promise<PersonalizedAttendanceSummaryOutput> {
  return personalizedAttendanceSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'personalizedAttendanceSummaryPrompt',
  input: {schema: PersonalizedAttendanceSummaryInputSchema},
  output: {schema: PersonalizedAttendanceSummaryOutputSchema},
  prompt: `You are an AI assistant specialized in generating personalized attendance summaries for students.

  Given the student's name, their attendance records, and the required attendance threshold, create a summary that highlights attendance patterns and potential areas for improvement.

  Student Name: {{{studentName}}}
  Attendance Records: {{{attendanceRecords}}}
  Attendance Threshold: {{{attendanceThreshold}}}%

  Provide a concise and actionable summary to help the student proactively manage their attendance.
  Focus on:
  - Identifying any weeks where attendance was below the threshold.
  - Suggesting strategies to improve attendance in the future.
  - Pointing out any positive attendance patterns.
`,
});

const personalizedAttendanceSummaryFlow = ai.defineFlow(
  {
    name: 'personalizedAttendanceSummaryFlow',
    inputSchema: PersonalizedAttendanceSummaryInputSchema,
    outputSchema: PersonalizedAttendanceSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
