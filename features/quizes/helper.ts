import { Answer } from "./types";

export function formatTime(s: number) {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
}
   
export function scoreLabel(pct: number) {
    if (pct >= 90) return { label: "Excellent", color: "#00d4aa" };
    if (pct >= 75) return { label: "Proficient", color: "#4ade80" };
    if (pct >= 60) return { label: "Satisfactory", color: "#facc15" };
    return { label: "Needs Improvement", color: "#f87171" };
}

export function calcScore(answers: Answer[]) {
    if (!answers.length) return 0;
    return Math.round((answers.filter(a => a.correct).length / answers.length) * 100);
}
   
export const diffBadge: Record<string, "default" | "secondary" | "destructive"> = {
    beginner:     "secondary",
    intermediate: "default",
    advanced:     "destructive",
};