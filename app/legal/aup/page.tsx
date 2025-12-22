import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Acceptable Use Policy | Regula",
  description:
    "Acceptable Use Policy for Regula - Real-Time Regulatory Intelligence Platform",
};

export default function AcceptableUsePolicyPage() {
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
          <CardTitle className="text-3xl">Acceptable Use Policy</CardTitle>
          <p className="text-sm text-muted-foreground">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none dark:prose-invert">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              This Acceptable Use Policy ("AUP") governs your use of Regula
              ("Service"). By using the Service, you agree to comply with this
              AUP. Violations may result in suspension or termination of your
              account.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Prohibited Activities
            </h2>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.1 Illegal Activities
            </h3>
            <p>You may not use the Service to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Violate any applicable laws or regulations</li>
              <li>
                Engage in fraud, money laundering, or other financial crimes
              </li>
              <li>Infringe upon intellectual property rights</li>
              <li>Violate privacy or data protection laws</li>
              <li>Facilitate illegal activities</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.2 Unauthorized Access
            </h3>
            <p>You may not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                Attempt to gain unauthorized access to the Service or other
                systems
              </li>
              <li>
                Use automated tools to access the Service without permission
              </li>
              <li>Bypass security measures or authentication systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Test for vulnerabilities without authorization</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.3 Harmful Content and Activities
            </h3>
            <p>You may not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Transmit viruses, malware, or malicious code</li>
              <li>Engage in denial-of-service attacks</li>
              <li>Send spam or unsolicited communications</li>
              <li>Harass, abuse, or harm others</li>
              <li>
                Post or transmit offensive, defamatory, or discriminatory
                content
              </li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.4 Monitoring Restrictions
            </h3>
            <p>When using the Service to monitor websites, you must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Only monitor websites you are authorized to monitor</li>
              <li>Respect robots.txt and website terms of service</li>
              <li>Not exceed reasonable crawl frequencies</li>
              <li>Not monitor private or restricted-access content</li>
              <li>Comply with website owners' terms and conditions</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.5 Account Misuse
            </h3>
            <p>You may not:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Share account credentials with unauthorized users</li>
              <li>Create multiple accounts to circumvent usage limits</li>
              <li>
                Use the Service for competitive intelligence gathering without
                authorization
              </li>
              <li>Resell or redistribute access to the Service</li>
              <li>Reverse engineer or attempt to extract source code</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. Content Standards
            </h2>
            <p>Content you submit must:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Be accurate and truthful</li>
              <li>Not violate any third-party rights</li>
              <li>Not contain confidential information of others</li>
              <li>Comply with applicable laws and regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Rate Limiting and Resource Usage
            </h2>
            <p>You agree to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service within reasonable limits</li>
              <li>Not attempt to circumvent rate limits</li>
              <li>Not overload our systems with excessive requests</li>
              <li>Respect usage quotas based on your subscription plan</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              5. Compliance with Laws
            </h2>
            <p>
              You are responsible for ensuring your use of the Service complies
              with all applicable laws, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Data protection and privacy laws (GDPR, CCPA, etc.)</li>
              <li>Intellectual property laws</li>
              <li>Export control laws</li>
              <li>Industry-specific regulations</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. Reporting Violations
            </h2>
            <p>
              If you become aware of any violation of this AUP, please report it
              to us immediately at{" "}
              <a
                href="mailto:abuse@regula.com"
                className="text-primary hover:underline"
              >
                abuse@regula.com
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Enforcement</h2>
            <p>We reserve the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Investigate suspected violations</li>
              <li>Suspend or terminate accounts that violate this AUP</li>
              <li>
                Remove or disable access to content that violates this AUP
              </li>
              <li>Report violations to law enforcement when appropriate</li>
              <li>Take any other action we deem necessary</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              8. Changes to This Policy
            </h2>
            <p>
              We may update this AUP from time to time. We will notify you of
              material changes via email or through the Service. Continued use
              after changes constitutes acceptance.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
            <p>For questions about this AUP, contact us at:</p>
            <p className="mt-2">
              Email:{" "}
              <a
                href="mailto:legal@regula.com"
                className="text-primary hover:underline"
              >
                legal@regula.com
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
