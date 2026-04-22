/**
 * Skill ids stored in `skills.name` (worker) and `staff_requests.tasks`.
 * Labels: `messages` → `skills`; long copy: `skillsDesc`.
 */

/** Skills workers can add and assess via quiz (expand as you add quizzes). */
export const WORKER_SKILL_IDS = ["medi_admin"] as const;
export type WorkerSkillId = (typeof WORKER_SKILL_IDS)[number];

export const WORKER_SKILL_IDS_SET = new Set<string>(WORKER_SKILL_IDS);

/** Task/skill ids for staff request job profiles (schedule step). */
export const STAFF_REQUEST_SKILL_IDS = [
    "vital_signs_monitoring",
    "medi_admin",
    "blood_glucose_monitoring",
    "wound_care",
    "patient_bathing",
    "grooming_assistance",
    "toileting_assistance",
    "feeding_assistance",
    "mobility_assistance",
    "patient_transfers",
    "repositioning_patients",
    "fall_prevention_monitoring",
    "one_to_one_observation",
    "dementia_care_support",
    "meal_distribution",
    "room_cleaning_sanitation",
    "stocking_medical_supplies",
    "wheelchair_transport",
    "electronic_charting",
    "shift_handover_reporting",
    "infection_control_protocols",
    "emergency_response_assistance",
] as const;

export type StaffRequestSkillId = (typeof STAFF_REQUEST_SKILL_IDS)[number];

export const STAFF_REQUEST_SKILL_IDS_SET = new Set<string>(
    STAFF_REQUEST_SKILL_IDS,
);
