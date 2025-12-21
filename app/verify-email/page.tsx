"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "already-verified"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      const email = searchParams.get("email");

      if (!token || !email) {
        setStatus("error");
        setMessage("Invalid verification link");
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          setStatus("error");
          setMessage(data.error || "Verification failed");
          return;
        }

        if (data.alreadyVerified) {
          setStatus("already-verified");
          setMessage("Your email has already been verified");
        } else {
          setStatus("success");
          setMessage("Email verified successfully!");
        }
      } catch (_error) {
        setStatus("error");
        setMessage("An error occurred during verification");
      }
    };

    verifyEmail();
  }, [searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Email Verification</h1>
        </div>

        <div className="space-y-4">
          {status === "loading" && (
            <div className="text-center">
              <p className="text-muted-foreground">Verifying your email...</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
                <p className="text-green-700 dark:text-green-400 font-medium">
                  {message}
                </p>
              </div>
              <Button onClick={() => router.push("/login")} className="w-full">
                Continue to Login
              </Button>
            </div>
          )}

          {status === "already-verified" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4 text-center">
                <p className="text-blue-700 dark:text-blue-400 font-medium">
                  {message}
                </p>
              </div>
              <Button onClick={() => router.push("/login")} className="w-full">
                Continue to Login
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                <p className="text-destructive font-medium">{message}</p>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => router.push("/login")}
                  className="w-full"
                  variant="outline"
                >
                  Go to Login
                </Button>
                <Button
                  onClick={() => router.push("/register")}
                  className="w-full"
                  variant="outline"
                >
                  Register Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Email Verification</h1>
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
