import { transactionalMetadata } from "@/lib/seo-metadata";
import { CheckEmailClient } from "../../components/check-email/check-email-client";

export const metadata = transactionalMetadata("Check your email", {
  description: "Confirm your email address to continue with Regula.",
});

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = params.email;

  return <CheckEmailClient email={email || null} />;
}
