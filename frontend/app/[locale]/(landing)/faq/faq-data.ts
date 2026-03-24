/** Static FAQ content — imported by server page and client accordion (no fetch). */

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is-muvmnt",
    question: "What is Muvmnt?",
    answer:
      "Muvmnt connects Canadian healthcare facilities with pre-screened, credentialed professionals for temporary staffing, home care, and relief coverage. We focus on fast matching and compliance so you can fill shifts without long hiring cycles.",
  },
  {
    id: "who-can-use",
    question: "Who can use Muvmnt?",
    answer:
      "Healthcare organizations and facilities can post staffing needs. Licensed and credentialed professionals (nurses, PSWs, allied health, and more) can create a profile and apply to opportunities that match their skills and availability.",
  },
  {
    id: "how-matching",
    question: "How does matching work?",
    answer:
      "Facilities describe the role, dates, and requirements. We surface candidates from our vetted pool based on credentials, experience, and availability. Workers can also browse and apply to open roles that fit their preferences.",
  },
  {
    id: "cost",
    question: "Is there a cost to create an account?",
    answer:
      "You can create an account and explore the platform at no upfront cost. Pricing for facilities and optional upgrades for professionals are described in our pricing section when you sign in.",
  },
  {
    id: "credentials",
    question: "How are credentials verified?",
    answer:
      "We collect and verify professional licenses, certifications, and other requirements according to your role and provincial rules. Exact steps are shown during onboarding so you always know what’s needed.",
  },
  {
    id: "data-privacy",
    question: "How is my data protected?",
    answer:
      "We handle personal information in line with Canadian privacy law (including PIPEDA where applicable). We only share what’s necessary for placements, and you can read more in our Privacy Policy.",
  },
  {
    id: "ontario",
    question: "Do you operate outside Ontario?",
    answer:
      "We’re focused on Ontario healthcare staffing today. If you’re elsewhere in Canada, you can still reach out — we’ll let you know when coverage expands.",
  },
  {
    id: "support",
    question: "How do I get help?",
    answer:
      "Use the contact options in the footer or email us at info@muvmnt.ca. For account-specific issues, sign in and use in-app support where available.",
  },
];
