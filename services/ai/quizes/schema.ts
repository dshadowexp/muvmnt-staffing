import { z } from "zod";

export const QuizQuestionsSchema = z.object({
    questions: z.array(
        z.object({
            id:          z.string(),
            type:        z.enum(["single", "multi"]),
            question:    z.string(),
            options:     z.array(z.object({ id: z.string(), label: z.string() })),
            correctIds:  z.array(z.string()),
            explanation: z.string(),
            difficulty:  z.enum(["beginner", "intermediate", "advanced"]),
        })
    ),
});

export const QuestionSchema = z.object({
    questions: z.array(
      z.object({
        id:       z.string().describe('Unique question id e.g. q1, q2'),
        type:     z.enum(['single', 'multi']).describe(
            '"single" = one correct answer, "multi" = multiple correct answers (select all that apply)'
        ),
        question: z.string().describe(
            'The question text. If type is "multi", end with "(Select all that apply)"'
        ),
        options:  z.array(
            z.object({
                id:    z.string().describe('Option id: a, b, c, or d'),
                label: z.string().describe('Option text'),
            })
        ).length(4).describe('Exactly 4 answer options'),
        correctIds:  z.array(z.string()).min(1).describe(
            'Array of correct option ids. Single answer = ["a"], multi = ["a","c"] etc.'
        ),
        explanation: z.string().describe('Brief explanation of why the answer(s) are correct'),
        difficulty:  z.enum(['beginner', 'intermediate', 'advanced']),
      })
    ).length(2).describe('Exactly 2 questions per batch'),
});
  