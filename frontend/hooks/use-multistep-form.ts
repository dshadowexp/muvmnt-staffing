import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

export interface MultistepFormStep {
    id:          string
    title:       string
    description: string
    route:       string
    icon:        LucideIcon
}

function getLastSegment(pathOrRoute: string): string {
    const parts = pathOrRoute.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
}

export function useMultistepForm(steps: MultistepFormStep[]) {
    const pathname = usePathname();
    const currentPath = getLastSegment(pathname ?? "");
    const [currentStepIndex, setCurrentStepIndex] = useState(0);

    useEffect(() => {
        const idx = steps.findIndex((step) => getLastSegment(step.route) === currentPath);
        setCurrentStepIndex(idx >= 0 ? idx : 0);
    }, [currentPath, steps]);

    function next() {
        setCurrentStepIndex(i => {
            if (i >= steps.length - 1) return i
            return i + 1
        })
    }

    function back() {
        setCurrentStepIndex(i => {
            if (i <= 0) return i
            return i - 1
        })
    }

    function goTo(index: number) {
        setCurrentStepIndex(index)
    }

    return {
        currentStepIndex,
        step: steps[currentStepIndex],
        steps,
        isFirstStep: currentStepIndex === 0,
        isLastStep: currentStepIndex === steps.length - 1,
        goTo,
        next,
        back,
    }
}