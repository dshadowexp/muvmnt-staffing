import z from "zod";
import { QuizQuestionsSchema } from "@/services/ai/quizes/schema";

export type Question  = z.infer<typeof QuizQuestionsSchema>["questions"][number];
export type QuizState = "idle" | "loading" | "answering" | "finished" | "error";
 
export interface Answer {
  questionId:  string;
  selectedIds: string[];
  correct:     boolean;
}
