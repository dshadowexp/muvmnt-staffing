"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import {
    MultiSelect,
    MultiSelectContent,
    MultiSelectItem,
    MultiSelectTrigger,
    MultiSelectValue,
} from "@/components/ui/multi-select";
import { OPTIONAL_COMPLIANCE_IDS } from "@/lib/compliance";
import { STAFF_REQUEST_SKILL_IDS } from "@/lib/skills";

import {
    STAFF_REQUEST_LOCKED_COMPLIANCE_REQUIREMENTS,
} from "../constants";

const lockedComplianceSet = new Set<string>(
    STAFF_REQUEST_LOCKED_COMPLIANCE_REQUIREMENTS,
);

export type StaffRequestJobProfileApplyPayload = {
    profession: string;
    tasks: string[];
    requirements: string[];
};

export type StaffRequestJobProfileSettingsProps = {
    profession: string;
    tasks: string[];
    requirements: string[];
    onApply: (payload: StaffRequestJobProfileApplyPayload) => void;
    /** Trigger sits on solid primary (e.g. find-staff hero). */
    triggerOnPrimary?: boolean;
};

export function StaffRequestJobProfileSettings({
    profession: initialProfession,
    tasks: initialTasks,
    requirements: initialRequirements,
    onApply,
    triggerOnPrimary = false,
}: StaffRequestJobProfileSettingsProps) {
    const t = useTranslations("staffRequest.wizard");
    const tCompliance = useTranslations("compliance");
    const tSkills = useTranslations("skills");
    const [open, setOpen] = useState(false);
    const [tasks, setTasks] = useState<string[]>(initialTasks);
    const [extraRequirements, setExtraRequirements] = useState<string[]>(() =>
        initialRequirements.filter((r) => !lockedComplianceSet.has(r)),
    );

    useEffect(() => {
        if (!open) return;
        setTasks(initialTasks);
        setExtraRequirements(
            initialRequirements.filter((r) => !lockedComplianceSet.has(r)),
        );
    }, [open, initialTasks, initialRequirements]);

    const fullRequirements = useMemo(
        () => [
            ...new Set([
                ...STAFF_REQUEST_LOCKED_COMPLIANCE_REQUIREMENTS,
                ...extraRequirements,
            ]),
        ],
        [extraRequirements],
    );

    function handleSave() {
        onApply({
            profession: initialProfession,
            tasks,
            requirements: fullRequirements,
        });
        setOpen(false);
    }

    return (
        <>
            <Button
                type="button"
                variant="outline"
                size="icon-lg"

                className={cn(
                    "shrink-0 self-start",
                    triggerOnPrimary &&
                        "border-primary-foreground/40 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground",
                )}
                aria-label={t("preferencesOpenAria")}
                onClick={() => setOpen(true)}
            >
                <Settings className="size-4" aria-hidden />
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent
                    className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-lg"
                    showCloseButton
                >
                    <DialogHeader>
                        <DialogTitle>{t("preferencesTitle")}</DialogTitle>
                        <DialogDescription>
                            {t("preferencesDescription")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-5">
                        <Field>
                            <FieldLabel>{t("skillsLabel")}</FieldLabel>
                            <FieldDescription>
                                {t("skillsHint")}
                            </FieldDescription>
                            <MultiSelect
                                values={tasks}
                                onValuesChange={setTasks}
                            >
                                <MultiSelectTrigger className="w-full min-w-0">
                                    <MultiSelectValue
                                        placeholder={t("skillsPlaceholder")}
                                        overflowBehavior="wrap"
                                    />
                                </MultiSelectTrigger>
                                <MultiSelectContent
                                    search={{
                                        placeholder: t("searchPlaceholder"),
                                        emptyMessage: t("searchEmpty"),
                                    }}
                                >
                                    {STAFF_REQUEST_SKILL_IDS.map((id) => (
                                        <MultiSelectItem key={id} value={id}>
                                            {tSkills(id)}
                                        </MultiSelectItem>
                                    ))}
                                </MultiSelectContent>
                            </MultiSelect>
                        </Field>

                        <Field>
                            <FieldLabel>{t("requirementsLabel")}</FieldLabel>
                            <FieldDescription>
                                {t("requirementsLockedHint")}
                            </FieldDescription>
                            <div className="flex flex-wrap gap-1.5 py-1">
                                {STAFF_REQUEST_LOCKED_COMPLIANCE_REQUIREMENTS.map(
                                    (id) => (
                                        <Badge
                                            key={id}
                                            variant="secondary"
                                            className="font-normal"
                                        >
                                            {tCompliance(id)}
                                        </Badge>
                                    ),
                                )}
                            </div>
                            <MultiSelect
                                values={extraRequirements}
                                onValuesChange={setExtraRequirements}
                            >
                                <MultiSelectTrigger className="w-full min-w-0">
                                    <MultiSelectValue
                                        placeholder={t(
                                            "requirementsExtraPlaceholder",
                                        )}
                                        overflowBehavior="wrap"
                                    />
                                </MultiSelectTrigger>
                                <MultiSelectContent
                                    search={{
                                        placeholder: t("searchPlaceholder"),
                                        emptyMessage: t("searchEmpty"),
                                    }}
                                >
                                    {OPTIONAL_COMPLIANCE_IDS.map((id) => (
                                        <MultiSelectItem key={id} value={id}>
                                            {tCompliance(id)}
                                        </MultiSelectItem>
                                    ))}
                                </MultiSelectContent>
                            </MultiSelect>
                        </Field>
                    </div>

                    <DialogFooter className="gap-4 sm:gap-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                        >
                            {t("preferencesCancel")}
                        </Button>
                        <Button type="button" onClick={handleSave}>
                            {t("preferencesSave")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export type StaffRequestJobProfileSettingsRowProps =
    StaffRequestJobProfileSettingsProps & {
        children: ReactNode;
        rowClassName?: string;
    };

/** Header row: left slot (title / icon) + job profile settings trigger. */
export function StaffRequestJobProfileSettingsRow({
    children,
    rowClassName,
    ...settingsProps
}: StaffRequestJobProfileSettingsRowProps) {
    return (
        <div
            className={cn(
                "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
                rowClassName,
            )}
        >
            <div className="min-w-0 flex-1">{children}</div>
            <StaffRequestJobProfileSettings {...settingsProps} />
        </div>
    );
}
