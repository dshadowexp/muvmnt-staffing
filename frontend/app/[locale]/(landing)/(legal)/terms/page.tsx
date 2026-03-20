import type { Metadata } from "next";
import LegalWrapper from "@/app/[locale]/(landing)/(legal)/_components/legal-wrapper";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Muvmnt Staffing Inc. Terms of Use — governing the use of our website and staffing services for healthcare professionals and facility clients across Canada.",
};

const SECTIONS = [
  {
    id: "acceptance",
    title: "Acceptance of Terms",
    content: (
      <>
        <p>
          These Terms of Use (<strong>"Terms"</strong>) constitute a legally binding agreement between
          you and <strong>Muvmnt Staffing Inc.</strong> (<strong>"Muvmnt," "we," "us," or "our"</strong>),
          a corporation incorporated in Ontario, Canada, operating as a licensed Temporary Help Agency
          under Ontario's <em>Employment Standards Act, 2000</em> (ESA).
        </p>
        <p>
          By accessing or using our website at <strong>muvmnt.ca</strong> (the <strong>"Site"</strong>),
          submitting a Professional application, or submitting a Client staffing request
          (collectively, our <strong>"Services"</strong>), you confirm that you have read, understood,
          and agree to be bound by these Terms and our{" "}
          <a href="/privacy">Privacy Policy</a>, which is incorporated herein by reference.
        </p>
        <p>
          If you are accessing our Services on behalf of an organization (such as a healthcare facility),
          you represent that you have authority to bind that organization to these Terms.
        </p>
        <div className="not-prose my-4 rounded-[10px] border-[1.5px] border-destructive/20 bg-destructive/5 px-5 py-4 text-[0.88rem]">
          <strong>If you do not agree to these Terms, you must not access or use our Services.</strong>{" "}
          Continued use of the Site or Services constitutes ongoing acceptance of these Terms, including
          any updates we make from time to time.
        </div>
      </>
    ),
  },
  {
    id: "definitions",
    title: "Definitions",
    content: (
      <>
        <p>In these Terms, the following definitions apply:</p>
        <ul>
          <li>
            <strong>"Professional"</strong> means a healthcare worker — including Registered Nurses (RNs),
            Registered Practical Nurses (RPNs), Personal Support Workers (PSWs), Developmental Support Workers
            (DSWs), allied health practitioners, and other healthcare support staff — who registers with Muvmnt
            seeking placement opportunities.
          </li>
          <li>
            <strong>"Client"</strong> means a healthcare facility, home care agency, retirement community,
            hospital, long-term care home, community health centre, or other organization that engages
            Muvmnt for temporary staffing services.
          </li>
          <li>
            <strong>"Assignment"</strong> means a temporary placement of a Professional at a Client facility
            pursuant to a staffing arrangement between Muvmnt and the Client.
          </li>
          <li>
            <strong>"Assignment Employee"</strong> has the meaning given in Ontario's ESA — an individual
            employed by Muvmnt for the purpose of being assigned to perform work on a temporary basis for Clients.
          </li>
          <li>
            <strong>"Placement Agreement"</strong> means the written agreement between Muvmnt and a Client
            governing the terms of each staffing arrangement.
          </li>
          <li>
            <strong>"Applicable Law"</strong> means all federal, provincial, and territorial legislation
            applicable to the parties, including the ESA, PIPEDA, PHIPA, the <em>Fixing Long-Term Care Act, 2021</em>,
            the <em>Health Care Staffing Agency Reporting Act, 2025</em>, the <em>Criminal Code</em> (vulnerable
            sector screening), WSIB legislation, and professional regulatory requirements.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "our-services",
    title: "Description of Services",
    content: (
      <>
        <p>
          Muvmnt provides temporary healthcare staffing services, connecting qualified healthcare Professionals
          with Client healthcare facilities across Canada. Our Services include:
        </p>
        <ul>
          <li>Recruitment, screening, credentialing, and placement of healthcare Professionals</li>
          <li>Temporary and relief staffing for hospitals, long-term care homes, retirement communities, home care agencies, and other healthcare settings</li>
          <li>Home care staffing coordination</li>
          <li>Payroll administration for placed Professionals</li>
          <li>Access to our online platform at muvmnt.ca for submitting applications and staffing requests</li>
        </ul>

        <h3>Licensing Compliance</h3>
        <p>
          Muvmnt operates as a licensed Temporary Help Agency as required under Ontario's ESA (effective
          July 1, 2024). Clients acknowledge that they are <strong>prohibited from knowingly engaging the
          services of an unlicensed temporary help agency</strong>. Muvmnt's current licence status is
          available from the Ontario Ministry of Labour upon request.
        </p>

        <h3>Health Care Staffing Agency Reporting</h3>
        <p>
          As a health care facility staffing agency under the <em>Health Care Staffing Agency Reporting
          Act, 2025</em>, Muvmnt is required to submit biannual reports to the Ontario Minister of Health
          containing aggregate administrative, billing, and pay rate information. Clients consent to the
          inclusion of aggregate (non-individually identifiable) data from their engagements in these reports.
        </p>
      </>
    ),
  },
  {
    id: "professional-terms",
    title: "Terms for Healthcare Professionals",
    content: (
      <>
        <h3>Application & Eligibility</h3>
        <p>By submitting an application to Muvmnt, you represent and warrant that:</p>
        <ul>
          <li>You are legally authorized to work in Canada in the province(s) where you seek placement</li>
          <li>You hold all professional designations, licences, and registrations you have represented, and these are current, valid, and in good standing with the applicable regulatory college</li>
          <li>All information provided in your application is accurate, complete, and not misleading</li>
          <li>You have disclosed any professional discipline history, findings of professional misconduct, or restrictions on your practice to Muvmnt prior to placement</li>
          <li>You consent to credential verification with regulatory colleges, background checks, and vulnerable sector screening as required by law or Client facilities</li>
          <li>You are physically and otherwise capable of performing the duties of the role(s) for which you are applying</li>
        </ul>

        <h3>Employment Relationship</h3>
        <p>
          When placed with a Client, you are an <strong>Assignment Employee of Muvmnt</strong>, not of the
          Client facility. Your employment rights and obligations are governed by:
        </p>
        <ul>
          <li>Ontario's <em>Employment Standards Act, 2000</em> (or the applicable provincial employment standards legislation in the province where work is performed)</li>
          <li>Your Assignment Employee agreement with Muvmnt</li>
          <li>The professional standards of your regulatory college</li>
        </ul>
        <p>
          Muvmnt, as your employer of record, is responsible for your pay, statutory deductions, WSIB
          coverage, and related employment obligations, unless otherwise specified in your agreement.
        </p>

        <h3>Professional Conduct</h3>
        <p>During any Assignment, you agree to:</p>
        <ul>
          <li>Comply with all applicable professional standards, codes of conduct, and regulatory requirements</li>
          <li>Follow all policies, procedures, and directives of the Client facility as communicated</li>
          <li>Maintain the confidentiality of patient information in accordance with PHIPA, PIPEDA, and professional obligations</li>
          <li>Report any patient safety concerns, incidents, or near-misses in accordance with Client facility protocols and applicable law</li>
          <li>Notify Muvmnt immediately of any changes to your licence status, professional standing, or ability to work</li>
          <li>Not use the Client engagement to solicit direct employment from the Client in a manner that circumvents Muvmnt</li>
        </ul>

        <h3>Non-Solicitation (Agency Staff)</h3>
        <p>
          In accordance with the <em>Health Care Staffing Agency Reporting Act, 2025</em>, Muvmnt does not
          assign healthcare workers who are currently employed by, or who left employment from, a hospital
          or long-term care home within the previous 12 months in the same or adjacent Ontario Health Team region.
        </p>
      </>
    ),
  },
  {
    id: "client-terms",
    title: "Terms for Healthcare Facility Clients",
    content: (
      <>
        <h3>Staffing Requests</h3>
        <p>By submitting a talent request through our platform or otherwise engaging our Services, you represent and warrant that:</p>
        <ul>
          <li>You are authorized to engage temporary staffing services on behalf of your organization</li>
          <li>Your facility is in good standing and compliant with all applicable healthcare licensing and regulatory requirements</li>
          <li>All information provided in your staffing request is accurate and complete</li>
          <li>You will not knowingly engage Muvmnt if Muvmnt's THA licence is not in good standing (in violation of ESA s. 74.1.1)</li>
        </ul>

        <h3>Client Obligations Under the ESA</h3>
        <p>As a Client of a licensed THA under Ontario's ESA, you acknowledge and agree to:</p>
        <ul>
          <li>Share relevant workplace health and safety information with Assignment Employees as required</li>
          <li>Comply with the <em>Occupational Health and Safety Act</em> (OHSA) in respect of Assignment Employees on your premises</li>
          <li>Provide accurate information about the work to be performed, including any known health and safety hazards</li>
          <li>Maintain anti-reprisal protections for Assignment Employees who exercise their rights</li>
          <li>Cooperate with any Ministry of Labour Employment Standards investigation involving Assignment Employees at your facility</li>
        </ul>
        <p>
          <strong>Joint and Several Liability:</strong> You acknowledge that under the ESA, Clients of THAs
          may bear joint and several liability with the THA for certain unpaid wages owed to Assignment Employees.
          Clients are encouraged to seek independent legal advice regarding their obligations.
        </p>

        <h3>Fees & Payment</h3>
        <p>
          Fees for staffing services are set out in the applicable Placement Agreement between Muvmnt and
          your facility. You agree to pay invoices within the timeframe specified in the Placement Agreement.
          Muvmnt reserves the right to charge interest on overdue amounts at a rate of 1.5% per month
          (18% per annum) or the maximum rate permitted by law, whichever is lower.
        </p>

        <h3>Reporting Transparency</h3>
        <p>
          Pursuant to the <em>Health Care Staffing Agency Reporting Act, 2025</em>, Muvmnt is required to
          report aggregate billing and pay rate information to the Ontario Minister of Health. The Minister
          may publish certain prescribed information from these reports. By engaging our Services, you
          acknowledge and consent to the inclusion of aggregate data from your engagements in these reports.
        </p>

        <h3>Non-Poaching</h3>
        <p>
          Muvmnt complies with Ontario's prohibition on poaching employees from hospitals and long-term care
          homes. Clients must notify Muvmnt if an Assignment Employee is or was recently employed by
          the Client facility within the past 12 months.
        </p>
      </>
    ),
  },
  {
    id: "website-use",
    title: "Website Use & Acceptable Use",
    content: (
      <>
        <p>You agree to use our Site and Services only for lawful purposes. You must not:</p>
        <ul>
          <li>Submit false, misleading, or fraudulent information in any form or application</li>
          <li>Attempt to gain unauthorized access to any part of our Site, systems, or data</li>
          <li>Use automated tools (bots, scrapers) to access, collect, or interact with our Site without prior written permission</li>
          <li>Upload or transmit malicious code, viruses, or any content designed to interfere with the Site's operation</li>
          <li>Use our Site in any way that violates Applicable Law, including privacy legislation</li>
          <li>Impersonate any person or entity, or falsely represent your affiliation with any organization</li>
          <li>Use our platform to circumvent or interfere with Muvmnt's staffing relationships with Clients or Professionals</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate access to our Services for any user who violates
          these Terms, without notice and without liability.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "Intellectual Property",
    content: (
      <>
        <p>
          All content on the Site — including the Muvmnt name and logo, text, graphics, website design,
          software, and other materials — is the property of Muvmnt Staffing Inc. or its licensors and
          is protected by Canadian and international copyright, trademark, and other intellectual property laws.
        </p>
        <p>
          We grant you a limited, non-exclusive, non-transferable, revocable licence to access and use the
          Site for its intended purpose only. You may not:
        </p>
        <ul>
          <li>Copy, reproduce, or distribute any Site content for commercial purposes without written permission</li>
          <li>Modify, adapt, translate, or create derivative works from our content</li>
          <li>Remove or alter any copyright, trademark, or proprietary notices</li>
        </ul>
        <p>
          Submissions made through our platform (such as resume content) remain your intellectual property.
          By submitting content to Muvmnt, you grant us a limited, royalty-free licence to use that content
          for the purposes of providing our Services.
        </p>
      </>
    ),
  },
  {
    id: "disclaimer",
    title: "Disclaimers & Limitation of Liability",
    content: (
      <>
        <h3>No Guarantee of Placement</h3>
        <p>
          Submission of a Professional application or a Client staffing request does not guarantee placement
          or the availability of suitable candidates. Muvmnt makes commercially reasonable efforts to fulfil
          staffing requests but does not warrant that placements will always be available.
        </p>

        <h3>Credential Verification Limitation</h3>
        <p>
          While Muvmnt conducts credential verification and screening, we cannot guarantee the absolute
          accuracy of information provided by Professionals. Clients are encouraged to apply their own
          facility-specific onboarding standards for all placed staff.
        </p>

        <h3>Limitation of Liability</h3>
        <p>
          To the maximum extent permitted by Applicable Law:
        </p>
        <ul>
          <li>
            Muvmnt's total liability to any party for any claim arising out of or relating to these Terms
            or our Services shall not exceed the <strong>total fees paid by that party to Muvmnt in the
            three (3) months preceding the claim</strong>
          </li>
          <li>
            Muvmnt shall not be liable for any indirect, incidental, special, consequential, or punitive
            damages, including loss of revenue, loss of profits, or loss of data, even if advised of the
            possibility of such damages
          </li>
        </ul>
        <p>
          Nothing in these Terms limits liability for fraud, gross negligence, wilful misconduct, or
          any liability that cannot be limited by law, including under applicable consumer protection legislation.
        </p>

        <h3>Patient Care Responsibility</h3>
        <div className="not-prose my-4 rounded-[10px] border-[1.5px] border-destructive/20 bg-destructive/5 px-5 py-4 text-[0.88rem]">
          <strong>Muvmnt is a staffing intermediary and does not direct or control clinical care decisions.</strong>{" "}
          All clinical decisions remain the professional responsibility of the individual Professional and
          the Client facility. Muvmnt assumes no liability for clinical outcomes, patient safety incidents,
          or professional practice decisions made during an Assignment.
        </div>
      </>
    ),
  },
  {
    id: "indemnification",
    title: "Indemnification",
    content: (
      <>
        <p>
          You agree to indemnify, defend, and hold harmless Muvmnt Staffing Inc. and its officers,
          directors, employees, agents, and successors from and against any claims, damages, losses,
          liabilities, costs, and expenses (including reasonable legal fees) arising from:
        </p>
        <ul>
          <li>Your breach of these Terms</li>
          <li>Your violation of Applicable Law, including professional regulatory requirements</li>
          <li>Any false or misleading information you provided to Muvmnt</li>
          <li>Your negligent or wrongful acts or omissions in connection with any Assignment or use of our Services</li>
          <li>Any third-party claims arising from your actions or omissions during an Assignment</li>
        </ul>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing Law & Dispute Resolution",
    content: (
      <>
        <p>
          These Terms are governed by and construed in accordance with the laws of the
          <strong> Province of Ontario</strong> and the federal laws of Canada applicable therein,
          without regard to conflict of law principles.
        </p>
        <p>
          Any dispute arising out of or in connection with these Terms shall first be subject to good-faith
          negotiation between the parties. If not resolved within <strong>30 days</strong>, the parties
          agree to submit the dispute to <strong>mediation</strong> administered by the ADR Institute of
          Ontario before commencing any legal proceedings.
        </p>
        <p>
          If mediation is unsuccessful, the parties submit to the exclusive jurisdiction of the courts
          of the <strong>Province of Ontario</strong>, sitting in the City of Toronto.
        </p>
        <p>
          Nothing in this section prevents either party from seeking urgent injunctive or other equitable
          relief from a court of competent jurisdiction where necessary to prevent irreparable harm.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General Provisions",
    content: (
      <>
        <h3>Entire Agreement</h3>
        <p>
          These Terms, together with our Privacy Policy and any applicable Placement Agreement or
          Assignment Employee agreement, constitute the entire agreement between you and Muvmnt
          with respect to your use of our Services and supersede all prior agreements on the same subject.
        </p>

        <h3>Severability</h3>
        <p>
          If any provision of these Terms is found to be invalid, illegal, or unenforceable by a court
          of competent jurisdiction, that provision shall be severed and the remaining provisions shall
          continue in full force and effect.
        </p>

        <h3>No Waiver</h3>
        <p>
          Failure by Muvmnt to enforce any right or provision of these Terms shall not constitute a
          waiver of that right or provision.
        </p>

        <h3>Assignment</h3>
        <p>
          You may not assign or transfer your rights or obligations under these Terms without our prior
          written consent. Muvmnt may assign these Terms in connection with a merger, acquisition,
          or sale of all or substantially all of its assets.
        </p>

        <h3>Updates to These Terms</h3>
        <p>
          We reserve the right to modify these Terms at any time. We will post the updated Terms on our
          Site with a revised "Last Updated" date. For material changes, we will provide reasonable notice
          where required. Your continued use of our Services following any update constitutes acceptance
          of the revised Terms.
        </p>

        <h3>Contact</h3>
        <div className="not-prose my-4 rounded-[10px] border-[1.5px] border-border bg-primary/5 px-5 py-4">
          <strong>Muvmnt Staffing Inc.</strong><br />
          Email: <a href="mailto:legal@muvmnt.ca">legal@muvmnt.ca</a><br />
          Phone: 1-800-MUVMNT<br />
          Address: [Street Address], Ontario, Canada
        </div>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalWrapper
      title="Terms of Use"
      subtitle="These Terms govern your use of the Muvmnt Staffing platform and services — whether you are a healthcare professional seeking placement or a facility seeking qualified staff."
      effectiveDate="March 10, 2026"
      lastUpdated="March 10, 2026"
      sections={SECTIONS}
      relatedLink={{ label: "Privacy Policy", href: "/privacy" }}
    />
  );
}
