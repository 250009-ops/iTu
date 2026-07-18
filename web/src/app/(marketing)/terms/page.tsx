import type { Metadata } from "next";
import { PageHero } from "@/components/marketing/ui/page-hero";
import { LegalDoc, type LegalSection } from "@/components/marketing/shared/legal-doc";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms governing your use of the iTestU platform — bookings, payments, exam conduct, refunds, and your rights and responsibilities as a candidate.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "1 June 2026";

const SECTIONS: LegalSection[] = [
  {
    id: "acceptance",
    heading: "Acceptance of these terms",
    body: (
      <>
        <p>
          By creating an account, booking a mock exam, or otherwise using the iTestU platform
          (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not
          agree, you must not use the Service.
        </p>
        <p>
          These terms form a binding agreement between you and iTestU. We may update them from
          time to time; the &ldquo;last updated&rdquo; date above reflects the current version.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    heading: "Eligibility & accounts",
    body: (
      <>
        <p>
          You must be at least 16 years old to create an account. You are responsible for keeping your
          login credentials secure and for all activity that occurs under your account.
        </p>
        <p>
          You agree to provide accurate registration information and to keep it up to date. We may
          suspend or terminate accounts that contain false information or that are used to violate
          these terms.
        </p>
      </>
    ),
  },
  {
    id: "bookings",
    heading: "Bookings & exam sessions",
    body: (
      <>
        <p>
          A mock exam booking reserves a specific session, examiner, and time slot. Listening, Reading,
          and Writing are delivered as a computer-based test; Speaking is conducted as a live video
          session with a certified examiner.
        </p>
        <p>
          You must complete your exam within the scheduled window. Sessions missed without notice, or
          interrupted by issues within your control (such as connectivity or equipment), may be
          treated as completed and are not eligible for a free retake.
        </p>
      </>
    ),
  },
  {
    id: "payments",
    heading: "Payments & pricing",
    body: (
      <>
        <p>
          Prices are shown at checkout and are charged in the currency displayed. Payments are
          processed securely by our payment provider; we do not store your card details.
        </p>
        <p>
          We may change prices for future bookings at any time. Any applicable taxes are your
          responsibility unless stated otherwise.
        </p>
      </>
    ),
  },
  {
    id: "refunds",
    heading: "Cancellations & refunds",
    body: (
      <>
        <p>
          You may cancel a booking for a full refund up to 48 hours before your scheduled session.
          Cancellations within 48 hours are eligible for a 50% refund or a free reschedule, at your
          choice.
        </p>
        <p>
          If we cancel a session for reasons within our control, you are entitled to a full refund or a
          rescheduled session at no extra cost.
        </p>
      </>
    ),
  },
  {
    id: "conduct",
    heading: "Exam integrity & acceptable use",
    body: (
      <>
        <p>
          To keep results meaningful, you agree not to record, copy, redistribute, or publish exam
          content, and not to use external assistance, impersonation, or any prohibited materials
          during a session.
        </p>
        <p>
          We may invalidate results and suspend accounts where we reasonably believe exam integrity has
          been compromised.
        </p>
      </>
    ),
  },
  {
    id: "results",
    heading: "Results & feedback",
    body: (
      <>
        <p>
          Band scores and examiner feedback are provided for practice and self-assessment only. Mock
          results are an indicative estimate and are not an official IELTS score and carry no official
          standing with any official IELTS test provider, including British Council or Cambridge.
        </p>
        <p>
          We take care to calibrate our examiners, but actual results on a real IELTS exam may differ.
        </p>
      </>
    ),
  },
  {
    id: "ip",
    heading: "Intellectual property",
    body: (
      <p>
        All exam materials, software, branding, and content on the Service are owned by iTestU or
        our licensors and are protected by intellectual property laws. You receive a limited,
        non-transferable licence to use them for your personal exam preparation only.
      </p>
    ),
  },
  {
    id: "liability",
    heading: "Disclaimers & limitation of liability",
    body: (
      <>
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
          guarantee that your real IELTS outcome will match your mock results.
        </p>
        <p>
          To the maximum extent permitted by law, our total liability arising from your use of the
          Service is limited to the amount you paid us in the 12 months preceding the relevant claim.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    heading: "Termination",
    body: (
      <p>
        You may close your account at any time. We may suspend or terminate access if you breach these
        terms. Provisions that by their nature should survive termination — including payment, IP, and
        liability terms — will remain in effect.
      </p>
    ),
  },
  {
    id: "contact",
    heading: "Contact",
    body: (
      <p>
        Questions about these terms can be sent to{" "}
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

export default function TermsPage() {
  return (
    <>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        subtitle="The agreement that governs your use of the iTestU platform — bookings, payments, exam conduct, and your rights as a candidate."
      />
      <LegalDoc
        updated={UPDATED}
        sections={SECTIONS}
        intro={
          <p>
            Please read these terms carefully before using iTestU. They explain how bookings and
            payments work, what we expect during exam sessions, and how results and refunds are
            handled. Together with our{" "}
            <a
              href="/privacy"
              className="font-medium text-navy underline underline-offset-2 hover:text-brand-red"
            >
              Privacy Policy
            </a>
            , they govern your relationship with us.
          </p>
        }
      />
    </>
  );
}
