import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Data Processing Addendum | Regula",
  description: "Data Processing Addendum for Regula Enterprise customers",
};

export default function DataProcessingAddendumPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to Home
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Data Processing Addendum</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last updated:&nbsp;
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This Data Processing Addendum ("DPA") applies to Enterprise
            customers and supplements the Terms of Service and Privacy Policy.
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Definitions</h2>
            <ul className="list-none space-y-2">
              <li>
                <strong>"Controller"</strong> means the organization that
                determines the purposes and means of processing personal data.
              </li>
              <li>
                <strong>"Processor"</strong> means Regula, which processes
                personal data on behalf of the Controller.
              </li>
              <li>
                <strong>"Personal Data"</strong> means any information relating
                to an identified or identifiable natural person.
              </li>
              <li>
                <strong>"Processing"</strong> means any operation performed on
                personal data, including collection, storage, and analysis.
              </li>
              <li>
                <strong>"GDPR"</strong> means the General Data Protection
                Regulation (EU) 2016/679.
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Scope and Application
            </h2>
            <p>
              This DPA applies when Regula processes Personal Data on behalf of
              Enterprise customers in connection with the Service. The customer
              acts as the Controller, and Regula acts as the Processor.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Processing Details
            </h2>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.1 Subject Matter
            </h3>
            <p>
              The subject matter of processing is the provision of regulatory
              monitoring and compliance intelligence services.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">3.2 Duration</h3>
            <p>
              Processing continues for the duration of the Service agreement,
              plus any retention period required by law or specified in the
              agreement.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.3 Nature and Purpose
            </h3>
            <p>Processing includes:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Storage and management of user account data</li>
              <li>Monitoring and crawling of regulatory websites</li>
              <li>Content analysis and change detection</li>
              <li>Alert generation and delivery</li>
              <li>Analytics and service improvement</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.4 Types of Personal Data
            </h3>
            <p>We may process:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>User account information (name, email)</li>
              <li>Organization information</li>
              <li>Usage data and preferences</li>
              <li>Monitoring configuration data</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              3.5 Categories of Data Subjects
            </h3>
            <p>Data subjects include:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your organization's employees and authorized users</li>
              <li>Organization members and administrators</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Processor Obligations
            </h2>
            <p>Regula agrees to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Process Personal Data only in accordance with your documented
                instructions
              </li>
              <li>
                Implement appropriate technical and organizational measures to
                ensure security
              </li>
              <li>Maintain confidentiality of Personal Data</li>
              <li>Assist you in responding to data subject requests</li>
              <li>Notify you promptly of any data breaches</li>
              <li>
                Assist with data protection impact assessments when required
              </li>
              <li>
                Return or delete Personal Data upon termination of the agreement
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              5. Security Measures
            </h2>
            <p>Regula implements the following security measures:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption of data in transit (TLS/SSL)</li>
              <li>Encryption of data at rest</li>
              <li>Access controls and authentication</li>
              <li>Regular security audits and assessments</li>
              <li>Employee training on data protection</li>
              <li>Incident response procedures</li>
              <li>Regular backups and disaster recovery plans</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Sub-Processors</h2>
            <p>
              Regula may engage sub-processors to provide the Service. We will:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintain a list of sub-processors</li>
              <li>
                Ensure sub-processors are bound by equivalent data protection
                obligations
              </li>
              <li>
                Notify you of any new sub-processors (with opportunity to
                object)
              </li>
              <li>Remain liable for sub-processor compliance</li>
            </ul>
            <p className="mt-4">
              Current sub-processors include: Vercel (hosting), Neon (database),
              Stripe (payments), Resend (email), Firecrawl (web crawling), and
              Google (AI services).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              7. Data Subject Rights
            </h2>
            <p>
              Regula will assist you in responding to data subject requests,
              including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Right of access</li>
              <li>Right to rectification</li>
              <li>Right to erasure</li>
              <li>Right to restrict processing</li>
              <li>Right to data portability</li>
              <li>Right to object</li>
            </ul>
            <p className="mt-4">
              We will respond to your requests within 30 days, or as required by
              applicable law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              8. Data Breach Notification
            </h2>
            <p>In the event of a personal data breach, Regula will:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Notify you without undue delay (within 72 hours where feasible)
              </li>
              <li>
                Provide details of the breach, including nature, scope, and
                impact
              </li>
              <li>Describe measures taken or proposed to address the breach</li>
              <li>
                Assist you in meeting your breach notification obligations
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              9. International Transfers
            </h2>
            <p>
              Personal Data may be transferred to and processed in countries
              outside the European Economic Area (EEA). Regula ensures
              appropriate safeguards are in place, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Standard Contractual Clauses (SCCs) approved by the European
                Commission
              </li>
              <li>Adequacy decisions where applicable</li>
              <li>Other appropriate safeguards as required by law</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              10. Data Retention and Deletion
            </h2>
            <p>Personal Data will be retained in accordance with:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your subscription plan's retention period</li>
              <li>Your documented instructions</li>
              <li>Applicable legal requirements</li>
            </ul>
            <p className="mt-4">
              Upon termination of the agreement, Regula will delete or return
              all Personal Data within 30 days, unless retention is required by
              law.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              11. Audits and Compliance
            </h2>
            <p>Regula will:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Make available information necessary to demonstrate compliance
              </li>
              <li>
                Allow for audits by you or your authorized representatives (with
                reasonable notice)
              </li>
              <li>Maintain records of processing activities</li>
              <li>Cooperate with supervisory authorities</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              12. Liability and Indemnification
            </h2>
            <p>
              Each party's liability for data protection breaches is governed by
              the Terms of Service. Regula is liable for damages caused by
              processing only where it has not complied with obligations
              specifically directed to processors under GDPR.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">13. Governing Law</h2>
            <p>
              This DPA is governed by the laws of the jurisdiction specified in
              the Terms of Service, with due regard to applicable data
              protection laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              14. Contact Information
            </h2>
            <p>
              For questions about this DPA or to exercise data protection
              rights:
            </p>
            <p className="mt-2">
              Email:&nbsp;
              <a
                href="mailto:privacy@regula.com"
                className="text-primary hover:underline"
              >
                privacy@regula.com
              </a>
            </p>
            <p className="mt-2">
              Data Protection Officer:&nbsp;
              <a
                href="mailto:dpo@regula.com"
                className="text-primary hover:underline"
              >
                dpo@regula.com
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
