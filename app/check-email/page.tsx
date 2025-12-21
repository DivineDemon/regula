"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function CheckEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResend = async () => {
    if (!email) return;

    setIsResending(true);
    setResendMessage(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setResendMessage("Verification email sent! Please check your inbox.");
      } else {
        setResendMessage(data.error || "Failed to resend email");
      }
    } catch (_error) {
      setResendMessage("An error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Check your email</h1>
          <p className="mt-2 text-muted-foreground">
            We've sent a verification link to
          </p>
          <p className="mt-1 font-medium">{email}</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">
              Click the link in the email to verify your account and complete
              registration. The link will expire in 24 hours.
            </p>
          </div>

          {resendMessage && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                resendMessage.includes("sent")
                  ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                  : "border-destructive/50 bg-destructive/10 text-destructive"
              }`}
            >
              {resendMessage}
            </div>
          )}

          <div className="space-y-2">
            <Button
              onClick={handleResend}
              disabled={isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? "Sending..." : "Resend verification email"}
            </Button>
            <Button
              onClick={() => {
                window.location.href = "/login";
              }}
              className="w-full"
            >
              Continue to Login
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or try resending.
          </p>
        </div>
      </div>
    </div>
  );
}
