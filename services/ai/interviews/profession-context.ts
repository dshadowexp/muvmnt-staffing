import { normalizeProfessionId, type ProfessionalRole } from "@/lib/professions";

const PROFESSION_CONTEXTS: Record<ProfessionalRole, string> = {
    rn: `Registered Nurse (RN) — This candidate holds (or is pursuing) an RN license.
Focus areas for the interview:
• Clinical assessment, patient triage and critical thinking
• Medication administration, IV therapy, and pharmacology knowledge
• Care planning, nursing documentation, and electronic charting
• Infection control procedures and emergency response protocols
• Patient advocacy, communication with interdisciplinary teams
• Experience with long-term care, acute care, or home care settings
• Familiarity with Ontario College of Nurses standards and CNO regulations`,

    rpn: `Registered Practical Nurse (RPN) — This candidate holds (or is pursuing) an RPN license.
Focus areas for the interview:
• Vital signs monitoring, wound care, and basic medication administration
• Assistance with activities of daily living and mobility
• Understanding of scope of practice vs. RN responsibilities
• Communication with patients, families, and care teams
• Documentation, care plans, and infection control
• Long-term care and community health settings experience
• CNO standards and regulatory compliance`,

    ien: `Internationally Educated Nurse (IEN) — This candidate holds (or is pursuing) an IEN license.
Focus areas for the interview:
• Clinical assessment, patient triage and critical thinking
• Medication administration, IV therapy, and pharmacology knowledge
• Care planning, nursing documentation, and electronic charting
• Infection control procedures and emergency response protocols
• Patient advocacy, communication with interdisciplinary teams
• Experience with long-term care, acute care, or home care settings
• Ontario College of Nurses standards and CNO regulations`,

    psw: `Personal Support Worker (PSW) — This candidate has completed (or is completing) a PSW certificate program.
Focus areas for the interview:
• Assistance with bathing, grooming, dressing, toileting, and feeding
• Safe patient transfers, repositioning, and mobility support
• Dementia and Alzheimer's care strategies
• Observation and reporting of patient condition changes
• Maintaining dignity, privacy, and cultural sensitivity
• Infection prevention and control in home or facility settings
• Time management across multiple clients`,

    healthcare_support_worker: `Healthcare Support Worker — This candidate provides non-clinical support in healthcare settings.
Focus areas for the interview:
• Patient observation and safety monitoring (fall prevention, 1:1 watch)
• Environmental cleaning, sanitation, and supply stocking
• Meal distribution and dietary assistance
• Patient transport (wheelchair, stretcher)
• Understanding of infection control protocols
• Communication with nursing and allied health staff
• Teamwork and reliability in fast-paced environments`,

    allied_health_practitioner: `Allied Health Practitioner — This candidate works in a specialized allied health discipline (physiotherapy, occupational therapy, respiratory therapy, etc.).
Focus areas for the interview:
• Clinical expertise in their specific discipline
• Assessment, treatment planning, and outcome measurement
• Collaboration with physicians, nurses, and care teams
• Patient education and rehabilitation goal setting
• Documentation and evidence-based practice
• Regulatory body standards and professional development`,

    dsw: `Developmental Services Worker (DSW) — This candidate supports individuals with intellectual and developmental disabilities.
Focus areas for the interview:
• Person-centred planning and individualized support strategies
• Behaviour management and crisis intervention techniques
• Communication supports (augmentative, visual, sign language basics)
• Community integration and skill-building activities
• Medication administration and health monitoring
• Documentation, reporting, and rights-based practice
• Understanding of Ontario DSW legislation and standards`,

    cook: `Cook / Dietary Aide — This candidate prepares meals and supports dietary needs in healthcare facilities.
Focus areas for the interview:
• Menu planning for therapeutic, modified-texture, and allergen-free diets
• Food safety, HACCP principles, and sanitation standards
• Large-batch cooking and portion control
• Understanding of nutritional requirements for elderly or ill populations
• Teamwork in institutional kitchen environments
• Dietary documentation and tray accuracy`,
};

export function getProfessionContext(profession: string): string {
    const id = normalizeProfessionId(profession);
    return PROFESSION_CONTEXTS[id];
}
