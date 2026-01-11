'use server';

/**
 * @fileOverview Generates a personalized attendance sheet for a student after their first successful sign-in.
 *
 * - generatePersonalizedAttendanceSheet - A function that generates the personalized attendance sheet.
 * - GeneratePersonalizedAttendanceSheetInput - The input type for the generatePersonalizedAttendanceSheet function.
 * - GeneratePersonalizedAttendanceSheetOutput - The return type for the generatePersonalizedAttendanceSheet function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GeneratePersonalizedAttendanceSheetInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  courseName: z.string().describe('The name of the course.'),
  attendanceRecord: z
    .record(z.boolean())
    .describe(
      'A record of the student\'s attendance, where the key is the week number and the value is a boolean indicating attendance.'
    ),
});
export type GeneratePersonalizedAttendanceSheetInput = z.infer<
  typeof GeneratePersonalizedAttendanceSheetInputSchema
>;

const GeneratePersonalizedAttendanceSheetOutputSchema = z.object({
  attendanceSheet: z
    .string()
    .describe('The generated personalized attendance sheet.'),
});
export type GeneratePersonalizedAttendanceSheetOutput = z.infer<
  typeof GeneratePersonalizedAttendanceSheetOutputSchema
>;

export async function generatePersonalizedAttendanceSheet(
  input: GeneratePersonalizedAttendanceSheetInput
): Promise<GeneratePersonalizedAttendanceSheetOutput> {
  return generatePersonalizedAttendanceSheetFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePersonalizedAttendanceSheetPrompt',
  input: {
    schema: GeneratePersonalizedAttendanceSheetInputSchema,
  },
  output: {
    schema: GeneratePersonalizedAttendanceSheetOutputSchema,
  },
  prompt: `You are an AI assistant specialized in generating personalized attendance sheets for students.

  Generate a personalized attendance sheet for the student named {{studentName}} for the course {{courseName}}.
  The attendance record is as follows:
  {{#each attendanceRecord}}
  Week {{key}}: {{value}}
  {{/each}}

  The attendance sheet should clearly display the student's name, the course name, and the attendance record for each week.
  Make it easy to read and understand.
  `,
});

const generatePersonalizedAttendanceSheetFlow = ai.defineFlow(
  {
    name: 'generatePersonalizedAttendanceSheetFlow',
    inputSchema: GeneratePersonalizedAttendanceSheetInputSchema,
    outputSchema: GeneratePersonalizedAttendanceSheetOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
