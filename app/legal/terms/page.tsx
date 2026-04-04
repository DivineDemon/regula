import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Terms of Service | Regula",
  description:
    "Terms of Service for Regula - Real-Time Regulatory Intelligence Platform",
};

export default function TermsOfServicePage() {
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
          <CardTitle className="text-3xl">Terms of Service</CardTitle>
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
              1. Agreement to Terms
            </h2>
            <p>
              By accessing or using Regula ("Service"), you agree to be bound by
              these Terms of Service ("Terms"). If you disagree with any part of
              these terms, you may not access the Service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              2. Description of Service
            </h2>
            <p>
              Regula is a regulatory monitoring and compliance intelligence
              platform that monitors regulatory websites and provides alerts
              when changes are detected. The Service includes web crawling,
              content analysis, AI-powered summarization, and alert management
              features.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
            <p>
              To use certain features of the Service, you must register for an
              account. You agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and update your account information</li>
              <li>Maintain the security of your account credentials</li>
              <li>
                Accept responsibility for all activities under your account
              </li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Use the Service for any illegal purpose</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe upon intellectual property rights</li>
              <li>Transmit malicious code or malware</li>
              <li>Attempt to gain unauthorized access to the Service</li>
              <li>Interfere with or disrupt the Service</li>
              <li>
                Use automated systems to access the Service without permission
              </li>
              <li>Monitor websites without proper authorization</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              5. Subscription Plans and Billing
            </h2>
            <p>
              The Service is offered under various subscription plans. By
              subscribing, you agree to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Pay all fees associated with your selected plan</li>
              <li>Automatic renewal unless cancelled</li>
              <li>Price changes with 30 days notice</li>
              <li>No refunds for partial billing periods</li>
            </ul>
            <p className="mt-4">
              Subscription fees are processed through Stripe. You are
              responsible for maintaining valid payment information.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Data and Content</h2>
            <p>
              You retain ownership of data you submit to the Service. By using
              the Service, you grant us a license to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Store and process your data to provide the Service</li>
              <li>Use aggregated, anonymized data for service improvement</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-4">
              We are not responsible for the accuracy of regulatory content
              monitored by the Service. The Service provides alerts based on
              detected changes but does not guarantee completeness or accuracy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              7. Intellectual Property
            </h2>
            <p>
              The Service, including its original content, features, and
              functionality, is owned by Regula and protected by international
              copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              8. Service Availability
            </h2>
            <p>
              We strive to maintain high availability but do not guarantee
              uninterrupted access. The Service may be unavailable due to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Maintenance and updates</li>
              <li>Technical issues</li>
              <li>Third-party service dependencies</li>
              <li>Force majeure events</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              9. Limitation of Liability
            </h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, REGULA SHALL NOT BE LIABLE
              FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
              DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR USE, ARISING FROM
              YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
            <p>
              We may terminate or suspend your account and access to the Service
              immediately, without prior notice, for conduct that we believe
              violates these Terms or is harmful to other users, us, or third
              parties.
            </p>
            <p className="mt-4">
              You may cancel your subscription at any time. Upon termination,
              your right to use the Service will immediately cease.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              11. Changes to Terms
            </h2>
            <p>
              We reserve the right to modify these Terms at any time. We will
              notify users of material changes via email or through the Service.
              Continued use of the Service after changes constitutes acceptance
              of the modified Terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">12. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the jurisdiction in which Regula operates, without
              regard to its conflict of law provisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">
              13. Contact Information
            </h2>
            <p>
              If you have any questions about these Terms, please contact us
              at&nbsp;
              <a
                href="mailto:legal@regula.mushoodhanif.com"
                className="text-primary hover:underline"
              >
                legal@regula.mushoodhanif.com
              </a>
              .
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
