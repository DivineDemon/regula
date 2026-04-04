import { and, eq, gt } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { users, verificationTokens } from "@/lib/db/schema";
import { transactionalMetadata } from "@/lib/seo-metadata";

export const metadata = transactionalMetadata("Verify email", {
  description: "Confirm your email address for your Regula account.",
});

async function verifyEmail(token: string, email: string) {
  // Find verification token
  const [verificationToken] = await db
    .select()
    .from(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, token),
        gt(verificationTokens.expires, new Date()),
      ),
    )
    .limit(1);

  if (!verificationToken) {
    return {
      status: "error" as const,
      message: "Invalid or expired verification token",
    };
  }

  // Find user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return {
      status: "error" as const,
      message: "User not found",
    };
  }

  // Check if already verified
  if (user.emailVerified) {
    return {
      status: "already-verified" as const,
      message: "Your email has already been verified",
    };
  }

  // Update user emailVerified timestamp
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, user.id));

  // Delete verification token
  await db
    .delete(verificationTokens)
    .where(
      and(
        eq(verificationTokens.identifier, email),
        eq(verificationTokens.token, token),
      ),
    );

  return {
    status: "success" as const,
    message: "Email verified successfully!",
  };
}

export default async function VerifyEmailPage({
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
            <h1 className="text-3xl font-bold">Email Verification</h1>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
              <p className="text-destructive font-medium">
                Invalid verification link
              </p>
            </div>
            <div className="space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href="/login">Go to Login</Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/register">Register Again</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let result: {
    status: "success" | "error" | "already-verified";
    message: string;
  };
  try {
    result = await verifyEmail(token, email);
  } catch (error) {
    console.error("Email verification error:", error);
    result = {
      status: "error" as const,
      message: "An error occurred during verification",
    };
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Email Verification</h1>
        </div>

        <div className="space-y-4">
          {result.status === "success" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
                <p className="text-green-700 dark:text-green-400 font-medium">
                  {result.message}
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Continue to Login</Link>
              </Button>
            </div>
          )}

          {result.status === "already-verified" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4 text-center">
                <p className="text-blue-700 dark:text-blue-400 font-medium">
                  {result.message}
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/login">Continue to Login</Link>
              </Button>
            </div>
          )}

          {result.status === "error" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                <p className="text-destructive font-medium">{result.message}</p>
              </div>
              <div className="space-y-2">
                <Button asChild className="w-full" variant="outline">
                  <Link href="/login">Go to Login</Link>
                </Button>
                <Button asChild className="w-full" variant="outline">
                  <Link href="/register">Register Again</Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
