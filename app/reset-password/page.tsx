import { and, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { verificationTokens } from "@/lib/db/schema";
import { ResetPasswordClient } from "../../components/auth/reset-password-client";

async function validateResetToken(token: string, email: string) {
  const identifier = `password-reset:${email}`;

  const [resetToken] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, identifier),
        eq(verificationTokens.token, token),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);

  return !!resetToken;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; email?: string }>;
}) {
  const params = await searchParams;
  const token = params.token;
  const email = params.email;

  if (!token || !email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Reset Password</h1>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-destructive font-medium">Invalid reset link</p>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href="/forgot-password">Request New Reset Link</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let tokenValid = false;
  try {
    tokenValid = await validateResetToken(token, email);
  } catch (error) {
    console.error("Token validation error:", error);
  }

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Reset Password</h1>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-destructive font-medium">
                Invalid or expired reset link
              </p>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href="/forgot-password">Request New Reset Link</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/login">Back to Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ResetPasswordClient token={token} email={email} />;
}
