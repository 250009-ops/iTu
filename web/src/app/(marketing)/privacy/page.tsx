import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { LegalDoc, type LegalSection } from "@/components/marketing/shared/legal-doc";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How iTestU collects, uses, stores, and protects your personal data — including exam recordings, payment information, and your rights under GDPR.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "1 June 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "overview",
    heading: "Overview",
    body: (
      <p>
        This Privacy Policy explains what personal data iTestU collects, why we collect it, how we
        use and protect it, and the rights you have over it. We act as the data controller for the
        information you provide while using the Service.
      </p>
    ),
  },
  {
    id: "data-we-collect",
    heading: "Data we collect",
    body: (
      <>
        <p>We collect the following categories of information:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-medium text-foreground">Account data</span> — name, email, password
            hash, and target band.
          </li>
          <li>
            <span className="font-medium text-foreground">Exam data</span> — your written responses,
            Speaking session recordings, answers, scores, and examiner feedback.
          </li>
          <li>
            <span className="font-medium text-foreground">Payment data</span> — handled by our payment
            provider; we receive confirmation and billing metadata but not full card numbers.
          </li>
          <li>
            <span className="font-medium text-foreground">Usage data</span> — device, browser, and
            interaction logs used to operate and secure the Service.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "how-we-use",
    heading: "How we use your data",
    body: (
      <>
        <p>We use your data to:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Deliver mock exams and produce your band scores and feedback.</li>
          <li>Process bookings, payments, and refunds.</li>
          <li>Verify identity and protect exam integrity.</li>
          <li>Provide support and send service-related communications.</li>
          <li>Improve examiner calibration and platform quality.</li>
        </ul>
      </>
    ),
  },
  {
    id: "legal-basis",
    heading: "Legal basis for processing",
    body: (
      <p>
        We process your data to perform our contract with you (delivering the exams you book), to
        comply with legal obligations, and on the basis of our legitimate interests in operating and
        securing the Service. Where required, we rely on your consent — for example, for optional
        marketing emails, which you can withdraw at any time.
      </p>
    ),
  },
  {
    id: "recordings",
    heading: "Speaking recordings",
    body: (
      <p>
        Speaking sessions are recorded so that certified examiners can grade them and so you can review
        examiner feedback. Recordings are stored securely, accessible only to you and authorised
        examiners and staff, and are retained only as long as needed to deliver and support your
        results.
      </p>
    ),
  },
  {
    id: "sharing",
    heading: "Sharing & disclosure",
    body: (
      <>
        <p>
          We do not sell your personal data. We share it only with trusted processors who help us run
          the Service — such as hosting, payment, and communication providers — under contracts that
          require them to protect it.
        </p>
        <p>
          If your exam was sponsored by an institution, we may share your results with that institution
          where you have agreed to it as part of your enrolment.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    heading: "Data retention",
    body: (
      <p>
        We keep your data for as long as your account is active and as needed to provide the Service.
        After account closure, we retain limited records where required for legal, accounting, or
        security purposes, then delete or anonymise the rest.
      </p>
    ),
  },
  {
    id: "security",
    heading: "Security",
    body: (
      <p>
        We protect your data with encryption in transit, access controls, and infrastructure hosted on
        certified cloud providers. No system is perfectly secure, but we work continuously to safeguard
        your information and will notify you of any breach as required by law.
      </p>
    ),
  },
  {
    id: "rights",
    heading: "Your rights",
    body: (
      <>
        <p>
          Depending on your location, you have rights to access, correct, export, restrict, or delete
          your personal data, and to object to certain processing. You may also withdraw consent for
          marketing at any time.
        </p>
        <p>
          To exercise any of these rights, contact us at{" "}
          <a
            href="mailto:support@itestu.uz"
            className="font-medium text-navy underline underline-offset-2 hover:text-brand-red"
          >
            support@itestu.uz
          </a>
          .
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    heading: "Cookies",
    body: (
      <p>
        We use essential cookies to keep you signed in and to secure the Service, and limited analytics
        cookies to understand usage. You can control non-essential cookies through your browser
        settings.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <p>
        For any privacy questions or data requests, email{" "}
        <a
          href="mailto:support@itestu.uz"
          className="font-medium text-navy underline underline-offset-2 hover:text-brand-red"
        >
          support@itestu.uz
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        subtitle="How we collect, use, and protect your personal data — including exam recordings and payment information — and the rights you have over it."
      />
      <LegalDoc
        updated={UPDATED}
        sections={SECTIONS}
        contactEmail="support@itestu.uz"
        intro={
          <p>
            Your trust matters to us. This policy describes the data we handle when you use iTestU
            and how we keep it safe. It should be read together with our{" "}
            <a
              href="/terms"
              className="font-medium text-navy underline underline-offset-2 hover:text-brand-red"
            >
              Terms of Service
            </a>
            .
          </p>
        }
      />
    </>
  );
}
