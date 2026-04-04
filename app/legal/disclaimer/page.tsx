import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { publicLegalMetadata } from "@/lib/seo-metadata";

export const metadata = publicLegalMetadata(
  "/legal/disclaimer",
  "Regulatory Content Disclaimer | Regula",
  "Regulatory Content Disclaimer for Regula - Real-Time Regulatory Intelligence Platform",
);

export default function RegulatoryContentDisclaimerPage() {
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
          <CardTitle className="text-3xl">
            Regulatory Content Disclaimer
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Last updated:&nbsp;
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              1. Nature of Service
            </h2>
            <p>
              Regula is a monitoring and alerting service that tracks changes to
              regulatory websites and content. We provide automated detection of
              changes, AI-powered summaries, and alert notifications. Regula is
              NOT a legal or compliance advisory service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. No Legal Advice</h2>
            <p>
              <strong>IMPORTANT:</strong> The information provided by Regula,
              including summaries, alerts, and content analysis, does not
              constitute legal, compliance, or regulatory advice. You should not
              rely on Regula's summaries or alerts as a substitute for
              professional legal or compliance counsel.
            </p>
            <p className="mt-4">
              Always consult with qualified legal or compliance professionals
              before making decisions based on regulatory changes detected by
              Regula.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Accuracy and Completeness
            </h2>
            <p>While we strive to provide accurate information, Regula:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Does not guarantee the accuracy of monitored content</li>
              <li>May not detect all changes to monitored websites</li>
              <li>Relies on third-party sources that may contain errors</li>
              <li>May experience technical issues affecting monitoring</li>
              <li>Does not verify the legal validity of regulatory content</li>
            </ul>
            <p className="mt-4">
              You are responsible for verifying the accuracy and completeness of
              any regulatory information relevant to your operations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. AI-Generated Summaries
            </h2>
            <p>
              Regula uses artificial intelligence to generate summaries of
              regulatory changes. These summaries:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Are generated automatically and may contain errors</li>
              <li>May not capture all nuances or implications</li>
              <li>Should be reviewed against the original source material</li>
              <li>Are not a substitute for reading the full regulatory text</li>
              <li>May misinterpret or oversimplify complex regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Timeliness</h2>
            <p>
              While Regula aims to provide timely alerts, there may be delays
              in:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Detecting changes to monitored websites</li>
              <li>Processing and analyzing content</li>
              <li>Delivering alerts to users</li>
            </ul>
            <p className="mt-4">
              Critical regulatory changes may require immediate attention. Do
              not rely solely on Regula for time-sensitive compliance matters.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. Jurisdiction and Applicability
            </h2>
            <p>Regulatory content monitored by Regula may:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Apply to specific jurisdictions only</li>
              <li>Have different requirements for different entities</li>
              <li>Be subject to interpretation by regulatory authorities</li>
              <li>Change or be superseded by new regulations</li>
              <li>Not be applicable to your specific situation</li>
            </ul>
            <p className="mt-4">
              You are responsible for determining the applicability of any
              regulatory content to your organization and operations.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              7. Third-Party Content
            </h2>
            <p>Regula monitors content from third-party websites, including:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Government regulatory websites</li>
              <li>Financial services authority websites</li>
              <li>Other official regulatory sources</li>
            </ul>
            <p className="mt-4">
              We are not responsible for the accuracy, completeness, or
              timeliness of content on these third-party websites. The original
              source should always be consulted for authoritative information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. No Warranties</h2>
            <p>
              REGULA PROVIDES THE SERVICE "AS IS" WITHOUT WARRANTIES OF ANY
              KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Warranties of accuracy or completeness</li>
              <li>
                Warranties of merchantability or fitness for a particular
                purpose
              </li>
              <li>
                Warranties that the Service will be uninterrupted or error-free
              </li>
              <li>
                Warranties regarding the legal effect of regulatory content
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              9. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, REGULA SHALL NOT BE LIABLE
              FOR ANY DAMAGES ARISING FROM:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Your reliance on information provided by the Service</li>
              <li>Missed or delayed detection of regulatory changes</li>
              <li>Errors in AI-generated summaries</li>
              <li>Inaccuracies in monitored content</li>
              <li>Compliance failures or regulatory violations</li>
              <li>Business decisions made based on Regula alerts</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              10. Your Responsibilities
            </h2>
            <p>You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Verifying all regulatory information independently</li>
              <li>Consulting with legal and compliance professionals</li>
              <li>Maintaining your own compliance programs</li>
              <li>Ensuring your use of Regula complies with applicable laws</li>
              <li>Not relying solely on Regula for compliance decisions</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p>For questions about this disclaimer, contact us at:</p>
            <p className="mt-2">
              Email:&nbsp;
              <a
                href="mailto:support@regula.mushoodhanif.com"
                className="text-primary hover:underline"
              >
                support@regula.mushoodhanif.com
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
