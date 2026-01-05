import { CheckEmailClient } from "../../components/check-email/check-email-client";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = params.email;

  return <CheckEmailClient email={email || null} />;
}
