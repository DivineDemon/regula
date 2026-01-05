import { LoginClient } from "../../components/auth/login-client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = params.callbackUrl || "/dashboard";

  return <LoginClient callbackUrl={callbackUrl} />;
}
