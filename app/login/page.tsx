"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "EMAIL_NOT_VERIFIED") {
          setError("EMAIL_NOT_VERIFIED");
        } else {
          setError("Invalid email or password");
        }
        setIsLoading(false);
      } else if (result?.ok) {
        // Check if callbackUrl is an invitation acceptance URL
        try {
          const callbackUrlObj = new URL(callbackUrl, window.location.origin);
          if (callbackUrlObj.pathname === "/accept-invitation") {
            const token = callbackUrlObj.searchParams.get("token");
            const email = callbackUrlObj.searchParams.get("email");

            if (token && email && email === data.email) {
              // Auto-accept invitation
              try {
                const acceptResponse = await fetch(
                  "/api/organizations/invitations/accept",
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ token, email }),
                  },
                );

                if (acceptResponse.ok) {
                  // Invitation accepted - redirect to dashboard
                  router.push("/dashboard");
                  router.refresh();
                  return;
                }
                // If acceptance fails, still redirect to callbackUrl
              } catch (acceptError) {
                console.error("Error accepting invitation:", acceptError);
                // Continue to callbackUrl even if acceptance fails
              }
            }
          }
        } catch (_urlError) {
          // Invalid URL, just proceed with callbackUrl
        }

        router.push(callbackUrl);
        router.refresh();
      }
    } catch (_err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={64} />
          </div>
          <h1 className="text-3xl font-bold">Welcome to Regula</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to your account to continue
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-8 space-y-6"
          >
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive space-y-2">
                <p>
                  {error === "EMAIL_NOT_VERIFIED"
                    ? "Please verify your email before signing in. Check your inbox for the verification link."
                    : error}
                </p>
                {error === "EMAIL_NOT_VERIFIED" && (
                  <a
                    href={`/check-email?email=${encodeURIComponent(form.getValues("email"))}`}
                    className="text-primary hover:underline block"
                  >
                    Resend verification email
                  </a>
                )}
              </div>
            )}

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        disabled={isLoading}
                        autoComplete="email"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        disabled={isLoading}
                        autoComplete="current-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        <div className="space-y-2">
          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <a href="/register" className="text-primary hover:underline">
              Sign up
            </a>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            <a href="/forgot-password" className="text-primary hover:underline">
              Forgot your password?
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Login</h1>
              <p className="mt-2 text-muted-foreground">Loading...</p>
            </div>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
