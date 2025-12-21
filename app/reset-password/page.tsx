"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { type ZodIssue, z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .max(100, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<"password" | "confirmPassword", string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const validateToken = async () => {
      const token = searchParams.get("token");
      const email = searchParams.get("email");

      if (!token || !email) {
        setTokenValid(false);
        setIsValidatingToken(false);
        setError("Invalid reset link");
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/validate-reset-token?token=${token}&email=${encodeURIComponent(email)}`,
        );
        const data = await response.json();

        if (!response.ok) {
          setTokenValid(false);
          setError(data.error || "Invalid or expired reset link");
        } else {
          setTokenValid(true);
        }
      } catch (_err) {
        setTokenValid(false);
        setError("An error occurred while validating the reset link");
      } finally {
        setIsValidatingToken(false);
      }
    };

    validateToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});

    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      setError("Invalid reset link");
      return;
    }

    // Validate with Zod
    const result = resetPasswordSchema.safeParse({
      password,
      confirmPassword,
    });

    if (!result.success) {
      const fieldErrors: Partial<
        Record<"password" | "confirmPassword", string>
      > = {};
      result.error.issues.forEach((err: ZodIssue) => {
        const field = (
          typeof err.path[0] === "string" ? err.path[0] : String(err.path[0])
        ) as "password" | "confirmPassword";
        if (field) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          password: result.data.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
    } catch (_err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (isValidatingToken) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Reset Password</h1>
            <p className="mt-2 text-muted-foreground">
              Validating reset link...
            </p>
          </div>
        </div>
      </div>
    );
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
                {error || "Invalid or expired reset link"}
              </p>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => router.push("/forgot-password")}
                className="w-full"
                variant="outline"
              >
                Request New Reset Link
              </Button>
              <Button
                onClick={() => router.push("/login")}
                className="w-full"
                variant="outline"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Password Reset</h1>
          </div>
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
              <p className="text-green-700 dark:text-green-400 font-medium">
                Password reset successfully! You can now sign in with your new
                password.
              </p>
            </div>
            <Button onClick={() => router.push("/login")} className="w-full">
              Continue to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reset Password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={8}
                aria-invalid={errors.password ? "true" : "false"}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters long
              </p>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                minLength={8}
                aria-invalid={errors.confirmPassword ? "true" : "false"}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword}
                </p>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Resetting..." : "Reset Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Reset Password</h1>
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
