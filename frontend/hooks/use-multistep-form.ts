import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";

export interface MultistepFormStep {
    id:          string
    title:       string
    description: string
    route:       string
    dependsOn:   string[]
    freezesWhen: string[]
    icon:        LucideIcon
    locked:      boolean
}

function getLastSegment(pathOrRoute: string): string {
    const parts = pathOrRoute.split("/").filter(Boolean);
    return parts[parts.length - 1] ?? "";
}

function findStepIndex(steps: MultistepFormStep[], pathname: string): number {
    const currentPath = getLastSegment(pathname ?? "");
    return steps.findIndex((step) => getLastSegment(step.route) === currentPath);
}

export function useMultistepForm(steps: MultistepFormStep[]) {
    const pathname = usePathname();
    const [currentStepIndex, setCurrentStepIndex] = useState(() => {
        const idx = findStepIndex(steps, pathname ?? "");
        return idx >= 0 ? idx : 0;
    });

    useEffect(() => {
        const idx = findStepIndex(steps, pathname ?? "");
        setCurrentStepIndex((prev) => (idx >= 0 ? idx : prev));
    }, [pathname, steps]);

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