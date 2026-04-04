import { transactionalMetadata } from "@/lib/seo-metadata";
import { LoginClient } from "../../components/auth/login-client";

export const metadata = transactionalMetadata("Sign in", {
  description: "Sign in to your Regula account.",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";

  return <LoginClient callbackUrl={callbackUrl} />;
}
