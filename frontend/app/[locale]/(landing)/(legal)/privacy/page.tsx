import type { Metadata } from "next";
import LegalWrapper from "@/app/[locale]/(landing)/(legal)/_components/legal-wrapper";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Muvmnt Staffing Inc. Privacy Policy — how we collect, use, and protect your personal information in compliance with PIPEDA, PHIPA, and applicable provincial privacy laws.",
};

const SECTIONS = [
  {
    id: "introduction",
    title: "Introduction & Our Commitment",
    content: (
      <>
        <p>
          Muvmnt Staffing Inc. (<strong>"Muvmnt," "we," "us," or "our"</strong>) is a Canadian healthcare staffing agency
          operating as a licensed Temporary Help Agency under Ontario's <em>Employment Standards Act, 2000</em> (ESA).
          We operate in Ontario, Alberta, British Columbia, and the Maritimes.
        </p>
        <p>
          We are committed to protecting the privacy and confidentiality of all personal information we collect
          from healthcare professionals (<strong>"Professionals"</strong>), healthcare facility clients
          (<strong>"Clients"</strong>), and visitors to our website at <strong>muvmnt.ca</strong>
          (collectively, <strong>"you"</strong>).
        </p>
        <p>
          This Privacy Policy describes how we collect, use, disclose, and safeguard personal information in
          accordance with:
        </p>
        <ul>
          <li>The <em>Personal Information Protection and Electronic Documents Act</em> (PIPEDA), S.C. 2000, c. 5</li>
          <li>Ontario's <em>Personal Health Information Protection Act, 2004</em> (PHIPA) — applicable to health information we may handle</li>
          <li>Alberta's <em>Personal Information Protection Act</em> (PIPA Alberta)</li>
          <li>British Columbia's <em>Personal Information Protection Act</em> (PIPA BC)</li>
          <li>Quebec's <em>Act Respecting the Protection of Personal Information in the Private Sector</em> (Law 25 / Bill 64)</li>
          <li>Ontario's <em>Health Care Staffing Agency Reporting Act, 2025</em> (Bill 11, Royal Assent June 5, 2025)</li>
        </ul>
        <div className="not-prose my-4 rounded-[10px] border-[1.5px] border-border bg-primary/5 px-5 py-4">
          <strong>Our Privacy Officer:</strong> You may contact our designated Privacy Officer at any time
          at <a href="mailto:privacy@muvmnt.ca">privacy@muvmnt.ca</a> or by mail to Muvmnt Staffing Inc.,
          Attention: Privacy Officer, [Address], Ontario, Canada.
        </div>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information We Collect",
    content: (
      <>
        <h3>From Healthcare Professionals</h3>
        <p>When you apply for placement through our platform or by other means, we may collect:</p>
        <ul>
          <li><strong>Identity & contact information:</strong> full name, home address, city, province, email address, telephone number</li>
          <li><strong>Professional credentials:</strong> professional designation (RN, RPN, PSW, etc.), licence or registration number, issuing regulatory college, years of experience, certifications, immunization records, and vulnerable sector screening documentation</li>
          <li><strong>Employment history:</strong> resume, work history, references, performance evaluations received from prior placements</li>
          <li><strong>Availability & preferences:</strong> preferred shift types, work settings, geographic availability, and employment type</li>
          <li><strong>Government-issued identification:</strong> where required for regulatory compliance, background checks, or proof of eligibility to work in Canada</li>
          <li><strong>Financial information:</strong> banking and payroll information for compensation purposes</li>
          <li><strong>Health-related information:</strong> only where directly relevant to performing healthcare duties (e.g., immunization records, occupational health clearances) — this information is treated as sensitive and collected only with your explicit consent</li>
        </ul>

        <h3>From Healthcare Facility Clients</h3>
        <ul>
          <li><strong>Organizational information:</strong> facility name, facility type, address, and province</li>
          <li><strong>Contact information:</strong> name, title, email address, and phone number of designated contacts</li>
          <li><strong>Staffing request details:</strong> roles requested, shift requirements, start and end dates, number of staff required, and any special requirements</li>
          <li><strong>Billing and contractual information:</strong> for invoicing and service agreement purposes</li>
        </ul>

        <h3>From Website Visitors</h3>
        <ul>
          <li><strong>Technical data:</strong> IP address, browser type, pages visited, and referring URLs collected automatically via cookies and server logs</li>
          <li><strong>Contact form submissions:</strong> any information voluntarily provided through inquiry or contact forms</li>
        </ul>

        <div className="not-prose my-4 rounded-[10px] border-[1.5px] border-border bg-primary/5 px-5 py-4">
          <strong>Minimum necessary:</strong> In accordance with PIPEDA's principle of limiting collection, we collect
          only the personal information that is necessary for the purposes identified in this policy. We do not collect
          personal information indiscriminately.
        </div>
      </>
    ),
  },
  {
    id: "purposes-of-collection",
    title: "Purposes of Collection & Use",
    content: (
      <>
        <p>We collect, use, and disclose personal information only for the following identified purposes:</p>

        <h3>For Healthcare Professionals</h3>
        <ul>
          <li>To evaluate your qualifications and suitability for healthcare placements</li>
          <li>To verify professional credentials, registrations, and certifications with applicable regulatory colleges (e.g., CNO, BCCNM, CARNA)</li>
          <li>To conduct or arrange background checks and vulnerable sector screenings as required by law or client facilities</li>
          <li>To match you with appropriate placement opportunities at Client facilities</li>
          <li>To communicate placement offers, shift schedules, and employment-related information</li>
          <li>To process payroll and manage your compensation</li>
          <li>To comply with our obligations as a licensed Temporary Help Agency under the ESA and the <em>Health Care Staffing Agency Reporting Act, 2025</em></li>
          <li>To maintain records as required by applicable legislation, including retaining placement contracts for a minimum of three (3) years after contract expiry</li>
        </ul>

        <h3>For Healthcare Facility Clients</h3>
        <ul>
          <li>To fulfil staffing requests and identify suitable Professional candidates</li>
          <li>To communicate placement confirmations, schedules, and billing information</li>
          <li>To comply with mandatory reporting obligations to the Ontario Minister of Health under the <em>Health Care Staffing Agency Reporting Act, 2025</em>, including submission of aggregate administrative, billing, and pay rate data every six (6) months</li>
          <li>To manage our contractual and legal relationship with your facility</li>
        </ul>

        <h3>For All Users</h3>
        <ul>
          <li>To operate, maintain, and improve our website and digital services</li>
          <li>To respond to inquiries and provide customer support</li>
          <li>To comply with applicable law, court orders, and regulatory requirements</li>
          <li>To detect and prevent fraud or unauthorized activity</li>
        </ul>

        <p>
          We will not use your personal information for any purpose other than those identified above
          without obtaining your prior consent, except as permitted or required by law.
        </p>
      </>
    ),
  },
  {
    id: "consent",
    title: "Consent",
    content: (
      <>
        <p>
          We obtain <strong>meaningful consent</strong> before or at the time of collecting personal information,
          in accordance with PIPEDA and applicable provincial legislation. Consent may be expressed (e.g., by
          checking a box, signing a form) or implied depending on the context and sensitivity of the information.
        </p>
        <p>
          For <strong>sensitive personal information</strong> — including health-related data such as immunization
          records, occupational health information, and any information touching on your physical or mental health —
          we always obtain <strong>explicit, express consent</strong>.
        </p>
        <p>
          You may <strong>withdraw your consent</strong> at any time, subject to legal or contractual restrictions
          and reasonable notice. Withdrawal of consent may affect our ability to provide services to you. To withdraw
          consent, contact our Privacy Officer at <a href="mailto:privacy@muvmnt.ca">privacy@muvmnt.ca</a>.
        </p>
        <div className="not-prose my-4 rounded-[10px] border-[1.5px] border-destructive/20 bg-destructive/5 px-5 py-4 text-[0.88rem]">
          <strong>Note for Professionals:</strong> Certain information (such as professional licence verification
          and vulnerable sector screening) is collected and retained as a legal requirement of placement in
          regulated healthcare settings. Withdrawal of consent for such purposes will prevent us from placing
          you in those settings.
        </div>
      </>
    ),
  },
  {
    id: "disclosure",
    title: "Disclosure of Personal Information",
    content: (
      <>
        <p>We may disclose your personal information to the following parties, strictly for the purposes identified:</p>

        <h3>Healthcare Facility Clients</h3>
        <p>
          We share relevant Professional profile information (credentials, experience, availability) with
          Client facilities for the purpose of evaluating and confirming placements. We do not share more
          information than is necessary for this purpose.
        </p>

        <h3>Regulatory Colleges & Licensing Bodies</h3>
        <p>
          We may verify credential information with regulatory colleges such as the College of Nurses of Ontario (CNO),
          the BC College of Nurses and Midwives (BCCNM), and the College and Association of Registered Nurses of
          Alberta (CARNA), as required for placement compliance.
        </p>

        <h3>Government & Regulatory Authorities</h3>
        <p>
          As a health care facility staffing agency operating in Ontario, we are required under the
          <em> Health Care Staffing Agency Reporting Act, 2025</em> to submit aggregate administrative, billing,
          and pay rate reports to the Ontario Minister of Health at least every six (6) months. These reports
          contain aggregate data only and are not linked to individual personal profiles.
        </p>
        <p>
          We may also disclose personal information to employment standards officers, the Ministry of Labour, or
          other regulatory bodies as required by law, court order, or regulatory investigation.
        </p>

        <h3>Service Providers</h3>
        <p>
          We may engage trusted third-party service providers (e.g., payroll processors, background check agencies,
          cloud hosting providers) who act on our behalf. These providers are contractually bound to:
        </p>
        <ul>
          <li>Use personal information only for the specific purpose for which it was disclosed</li>
          <li>Maintain confidentiality and appropriate security safeguards</li>
          <li>Comply with applicable Canadian privacy legislation</li>
        </ul>

        <h3>No Sale of Personal Information</h3>
        <div className="not-prose my-4 rounded-[10px] border-[1.5px] border-border bg-primary/5 px-5 py-4">
          <strong>We do not sell, rent, or trade your personal information to third parties for commercial
          or marketing purposes — ever.</strong>
        </div>
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention & Disposal",
    content: (
      <>
        <p>
          We retain personal information only for as long as necessary to fulfil the purposes for which it was
          collected, or as required by law.
        </p>
        <ul>
          <li>
            <strong>Placement contracts:</strong> Retained for a minimum of <strong>three (3) years</strong> after
            contract expiry, as required by the <em>Health Care Staffing Agency Reporting Act, 2025</em>
          </li>
          <li>
            <strong>Invoicing records:</strong> Retained for a minimum of <strong>three (3) years</strong> from
            the date of issuance
          </li>
          <li>
            <strong>Professional profiles (active):</strong> Retained for the duration of your engagement with
            Muvmnt and for a reasonable period thereafter to address any disputes or legal obligations
          </li>
          <li>
            <strong>Professional profiles (inactive):</strong> Retained for up to <strong>two (2) years</strong>{" "}
            from your last active engagement, after which we will securely dispose of or anonymize records
          </li>
          <li>
            <strong>Web analytics data:</strong> Retained for up to <strong>twelve (12) months</strong>
          </li>
          <li>
            <strong>Tax and payroll records:</strong> Retained for a minimum of <strong>six (6) years</strong>{" "}
            as required by the <em>Income Tax Act</em> (Canada)
          </li>
        </ul>
        <p>
          When personal information is no longer required, we destroy, erase, or anonymize it using methods
          appropriate to the sensitivity of the information (e.g., secure digital deletion, certified shredding
          for physical records).
        </p>
      </>
    ),
  },
  {
    id: "safeguards",
    title: "Security Safeguards",
    content: (
      <>
        <p>
          We implement physical, organizational, and technological safeguards appropriate to the sensitivity
          of the personal information we hold, in accordance with PIPEDA Schedule 1, Principle 7.
        </p>

        <h3>Technological Safeguards</h3>
        <ul>
          <li>Encryption of data in transit (TLS/SSL) and at rest for sensitive records</li>
          <li>Role-based access controls limiting data access to authorized personnel only</li>
          <li>Secure, password-protected systems with multi-factor authentication</li>
          <li>Regular security assessments and vulnerability testing</li>
        </ul>

        <h3>Organizational Safeguards</h3>
        <ul>
          <li>Designated Privacy Officer responsible for ongoing PIPEDA compliance</li>
          <li>Staff training on privacy obligations and data handling practices</li>
          <li>Confidentiality agreements for all employees and contractors</li>
          <li>Written privacy policies and procedures</li>
        </ul>

        <h3>Physical Safeguards</h3>
        <ul>
          <li>Secure office facilities with restricted access</li>
          <li>Locked storage for physical documents containing personal information</li>
          <li>Secure disposal of physical records</li>
        </ul>

        <h3>Breach Notification</h3>
        <p>
          In the event of a breach of security safeguards involving personal information under our control
          that poses a <em>real risk of significant harm</em> to individuals, we will:
        </p>
        <ul>
          <li>Notify the Office of the Privacy Commissioner of Canada (OPC) as required by PIPEDA</li>
          <li>Notify affected individuals as soon as reasonably practicable</li>
          <li>Maintain a record of all breaches for a minimum of <strong>24 months</strong></li>
          <li>Notify relevant third parties where they can help mitigate the harm</li>
        </ul>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your Rights & Access",
    content: (
      <>
        <p>
          Subject to limited exceptions permitted by law, you have the right to:
        </p>
        <ul>
          <li>
            <strong>Access:</strong> Request access to the personal information we hold about you, and
            receive a copy within <strong>30 days</strong> of your request
          </li>
          <li>
            <strong>Correction:</strong> Request correction of inaccurate, incomplete, or outdated personal
            information
          </li>
          <li>
            <strong>Withdrawal of consent:</strong> Withdraw consent for collection, use, or disclosure,
            subject to legal and contractual obligations
          </li>
          <li>
            <strong>Complaint:</strong> Lodge a complaint with our Privacy Officer and, if not resolved,
            with the Office of the Privacy Commissioner of Canada or the applicable provincial commissioner
          </li>
          <li>
            <strong>Deletion (where applicable):</strong> Request deletion of personal information where
            we no longer have a legal basis to retain it
          </li>
        </ul>
        <p>
          To exercise any of these rights, please contact our Privacy Officer in writing at{" "}
          <a href="mailto:privacy@muvmnt.ca">privacy@muvmnt.ca</a>. We will respond within <strong>30 days</strong>,
          or advise you if additional time is required (up to a maximum of 60 days in complex cases under PIPEDA).
        </p>

        <h3>Provincial Commissioner Contacts</h3>
        <ul>
          <li><strong>Canada (Federal / OPC):</strong> <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">priv.gc.ca</a> | 1-800-282-1376</li>
          <li><strong>Ontario (IPC):</strong> <a href="https://www.ipc.on.ca" target="_blank" rel="noopener noreferrer">ipc.on.ca</a> | 1-800-387-0073</li>
          <li><strong>Alberta (OIPC):</strong> <a href="https://www.oipc.ab.ca" target="_blank" rel="noopener noreferrer">oipc.ab.ca</a> | 1-888-878-4044</li>
          <li><strong>British Columbia (OIPC BC):</strong> <a href="https://www.oipc.bc.ca" target="_blank" rel="noopener noreferrer">oipc.bc.ca</a> | 1-800-663-7867</li>
          <li><strong>Quebec (CAI):</strong> <a href="https://www.cai.gouv.qc.ca" target="_blank" rel="noopener noreferrer">cai.gouv.qc.ca</a> | 1-888-528-7741</li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies & Website Analytics",
    content: (
      <>
        <p>
          Our website uses cookies and similar technologies to enhance your experience and collect
          aggregate usage data. We use:
        </p>
        <ul>
          <li>
            <strong>Essential cookies:</strong> Necessary for the website to function (e.g., form session
            data). These cannot be disabled.
          </li>
          <li>
            <strong>Analytics cookies:</strong> Used to understand how visitors interact with our website
            (e.g., pages visited, time spent). We use aggregated, anonymized data only.
          </li>
        </ul>
        <p>
          You may control cookies through your browser settings. Disabling non-essential cookies will not
          affect your ability to use our core services. We do not use tracking cookies for advertising
          or cross-site profiling purposes.
        </p>
        <p>
          Where required by applicable law (including Quebec's Law 25), we will obtain your consent before
          placing non-essential cookies on your device.
        </p>
      </>
    ),
  },
  {
    id: "cross-border",
    title: "Cross-Border Data Transfers",
    content: (
      <>
        <p>
          We are a Canadian company and our primary data storage and processing occurs within Canada.
          Certain third-party service providers (such as cloud hosting or payroll platforms) may process
          or store data in the United States or other jurisdictions.
        </p>
        <p>
          Where personal information is transferred outside Canada, we ensure equivalent levels of
          protection through contractual safeguards consistent with PIPEDA and applicable provincial
          privacy laws. We will inform you of such transfers upon request.
        </p>
        <p>
          You acknowledge that personal information transferred to other jurisdictions may be subject to
          the laws of those jurisdictions, including lawful access by government authorities.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children's Privacy",
    content: (
      <>
        <p>
          Our services are intended for adult healthcare professionals and healthcare facility administrators.
          We do not knowingly collect personal information from individuals under the age of 18.
          If you believe we have inadvertently collected such information, please contact us immediately
          at <a href="mailto:privacy@muvmnt.ca">privacy@muvmnt.ca</a> and we will promptly delete it.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to This Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices,
          legal requirements, or regulatory guidance. When we make material changes, we will:
        </p>
        <ul>
          <li>Update the "Last Updated" date at the top of this document</li>
          <li>Post the revised policy on our website at <strong>muvmnt.ca/privacy</strong></li>
          <li>Where required by law or where the change is significant, provide direct notice to affected individuals</li>
        </ul>
        <p>
          Your continued use of our services after the effective date of a revised policy constitutes
          your acceptance of the changes, except where we are required to obtain your express consent.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact Us",
    content: (
      <>
        <p>
          For any questions, concerns, or requests related to this Privacy Policy or our data practices,
          please contact our Privacy Officer:
        </p>
        <div className="not-prose my-4 rounded-[10px] border-[1.5px] border-border bg-primary/5 px-5 py-4">
          <strong>Muvmnt Staffing Inc. — Privacy Officer</strong><br />
          Email: <a href="mailto:privacy@muvmnt.ca">privacy@muvmnt.ca</a><br />
          Phone: 1-800-MUVMNT<br />
          Mailing Address: [Street Address], Ontario, Canada<br /><br />
          We will acknowledge your request within <strong>5 business days</strong> and respond fully
          within <strong>30 days</strong>, or notify you if more time is required.
        </div>
        <p>
          If you are not satisfied with our response, you have the right to contact the Office of the
          Privacy Commissioner of Canada at <a href="https://www.priv.gc.ca" target="_blank" rel="noopener noreferrer">www.priv.gc.ca</a> or
          1-800-282-1376.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalWrapper
      title="Privacy Policy"
      subtitle="How Muvmnt Staffing Inc. collects, uses, protects, and discloses your personal information — in compliance with PIPEDA, PHIPA, and applicable provincial privacy laws across Canada."
      effectiveDate="March 10, 2026"
      lastUpdated="March 10, 2026"
      sections={SECTIONS}
      relatedLink={{ label: "Terms of Use", href: "/terms" }}
    />
  );
}
