import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Privacy Policy | Regula",
  description:
    "Privacy Policy for Regula - Real-Time Regulatory Intelligence Platform",
};

export default function PrivacyPolicyPage() {
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
          <CardTitle className="text-3xl">Privacy Policy</CardTitle>
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
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p>
              Regula ("we", "our", or "us") is committed to protecting your
              privacy. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you use our Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Information We Collect
            </h2>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.1 Account Information
            </h3>
            <p>When you register, we collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Email address</li>
              <li>Name</li>
              <li>Password (hashed)</li>
              <li>Organization information</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">2.2 Usage Data</h3>
            <p>We automatically collect:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>IP address</li>
              <li>Browser type and version</li>
              <li>Pages visited and time spent</li>
              <li>Device information</li>
              <li>Usage patterns and preferences</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              2.3 Monitoring Data
            </h3>
            <p>
              When you configure targets for monitoring, we collect and store:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>URLs of monitored websites</li>
              <li>Crawled content and versions</li>
              <li>Alert data and summaries</li>
              <li>Metadata about changes detected</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              3. How We Use Your Information
            </h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide and maintain the Service</li>
              <li>Process your requests and transactions</li>
              <li>Send you alerts and notifications</li>
              <li>Improve and optimize the Service</li>
              <li>Detect and prevent fraud or abuse</li>
              <li>Comply with legal obligations</li>
              <li>Communicate with you about the Service</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              4. Data Sharing and Disclosure
            </h2>
            <p>We may share your information with:</p>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              4.1 Service Providers
            </h3>
            <p>
              Third-party services that help us operate the Service, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Cloud hosting providers (Vercel, Neon)</li>
              <li>Payment processors (Stripe)</li>
              <li>Email services (Resend)</li>
              <li>Web crawling services (Firecrawl)</li>
              <li>AI services (Google Gemini)</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              4.2 Legal Requirements
            </h3>
            <p>
              We may disclose information if required by law or to protect our
              rights, property, or safety.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-2">
              4.3 Business Transfers
            </h3>
            <p>
              In the event of a merger, acquisition, or sale, your information
              may be transferred to the new entity.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
            <p>We retain your data according to your subscription plan:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Free:</strong> 3 months
              </li>
              <li>
                <strong>Starter:</strong> 1 year
              </li>
              <li>
                <strong>Growth:</strong> 3 years
              </li>
              <li>
                <strong>Enterprise:</strong> 5+ years (customizable)
              </li>
            </ul>
            <p className="mt-4">
              Account information is retained while your account is active. You
              may request deletion of your data at any time.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              6. Your Rights (GDPR/CCPA)
            </h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Rectification:</strong> Correct inaccurate data
              </li>
              <li>
                <strong>Erasure:</strong> Request deletion of your data
              </li>
              <li>
                <strong>Portability:</strong> Export your data in a
                machine-readable format
              </li>
              <li>
                <strong>Objection:</strong> Object to certain processing
                activities
              </li>
              <li>
                <strong>Restriction:</strong> Request limitation of processing
              </li>
              <li>
                <strong>Withdraw Consent:</strong> Withdraw previously given
                consent
              </li>
            </ul>
            <p className="mt-4">
              To exercise these rights, contact us at&nbsp;
              <a
                href="mailto:privacy@regula.com"
                className="text-primary hover:underline"
              >
                privacy@regula.com
              </a>
              .
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to
              protect your data, including:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Encryption in transit (TLS/SSL)</li>
              <li>Encryption at rest</li>
              <li>Secure password hashing</li>
              <li>Regular security audits</li>
              <li>Access controls and authentication</li>
            </ul>
            <p className="mt-4">
              However, no method of transmission over the Internet is 100%
              secure.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              8. Cookies and Tracking
            </h2>
            <p>
              We use cookies and similar technologies to enhance your
              experience. See our&nbsp;
              <Link
                href="/legal/cookies"
                className="text-primary hover:underline"
              >
                Cookie Policy
              </Link>
              &nbsp; for details.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              9. International Data Transfers
            </h2>
            <p>
              Your information may be transferred to and processed in countries
              other than your own. We ensure appropriate safeguards are in place
              for such transfers.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              10. Children's Privacy
            </h2>
            <p>
              Our Service is not intended for individuals under 18 years of age.
              We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              11. Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will
              notify you of material changes via email or through the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Contact Us</h2>
            <p>For privacy-related questions or requests, contact us at:</p>
            <p className="mt-2">
              Email:&nbsp;
              <a
                href="mailto:privacy@regula.com"
                className="text-primary hover:underline"
              >
                privacy@regula.com
              </a>
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
