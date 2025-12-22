"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const invitationRegisterSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    email: z.string().email("Invalid email address"),
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

type InvitationRegisterFormData = z.infer<typeof invitationRegisterSchema>;

function AcceptInvitationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [checkingUser, setCheckingUser] = useState(true);
  const [_userExists, setUserExists] = useState<boolean | null>(null);
  const [status, setStatus] = useState<
    | "checking"
    | "register"
    | "login-required"
    | "accepting"
    | "success"
    | "error"
    | "already-member"
  >("checking");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const form = useForm<InvitationRegisterFormData>({
    resolver: zodResolver(invitationRegisterSchema),
    defaultValues: {
      name: "",
      email: email || "",
      password: "",
      confirmPassword: "",
    },
  });

  const acceptInvitation = useCallback(async () => {
    if (!token || !email) return;

    try {
      const response = await fetch("/api/organizations/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, email }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === "ALREADY_MEMBER") {
          setStatus("already-member");
          setMessage("You are already a member of this organization");
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to accept invitation");
        }
        return;
      }

      setStatus("success");
      setMessage("Invitation accepted successfully!");
    } catch (error) {
      console.error("Error accepting invitation:", error);
      setStatus("error");
      setMessage("An error occurred while accepting the invitation");
    }
  }, [token, email]);

  // Check if user exists and determine flow
  useEffect(() => {
    const checkUserAndFlow = async () => {
      if (!token || !email) {
        setStatus("error");
        setMessage("Invalid invitation link");
        setCheckingUser(false);
        return;
      }

      try {
        // Check if user exists
        const userCheckResponse = await fetch(
          `/api/users/check?email=${encodeURIComponent(email)}`,
        );
        const userCheckData = await userCheckResponse.json();

        if (userCheckData.exists) {
          setUserExists(true);
          // User exists - check if logged in
          if (
            sessionStatus === "authenticated" &&
            session?.user?.email === email
          ) {
            // User is logged in with matching email - auto-accept
            setStatus("accepting");
            await acceptInvitation();
          } else {
            // User exists but not logged in or wrong account
            setStatus("login-required");
            setMessage("Please log in to accept the invitation");
          }
        } else {
          // User doesn't exist - show registration form
          setUserExists(false);
          setStatus("register");
        }
      } catch (error) {
        console.error("Error checking user:", error);
        setStatus("error");
        setMessage("An error occurred while processing the invitation");
      } finally {
        setCheckingUser(false);
      }
    };

    // Wait for session to load before checking
    if (sessionStatus !== "loading") {
      checkUserAndFlow();
    }
  }, [token, email, sessionStatus, session, acceptInvitation]);

  const handleRegister = async (data: InvitationRegisterFormData) => {
    if (!token || !email) {
      setError("Invalid invitation link");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register-invitation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          invitationToken: token,
          invitationEmail: email,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        setError(responseData.error || "Registration failed");
        setIsLoading(false);
        return;
      }

      // Registration successful - auto-login the user
      const signInResult = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (signInResult?.ok) {
        // Redirect to onboarding for new users
        router.push("/onboarding");
        router.refresh();
      } else {
        setError(
          "Account created but failed to log in. Please try logging in manually.",
        );
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    const currentUrl =
      typeof window !== "undefined"
        ? window.location.href
        : "/accept-invitation";
    router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Accept Invitation</CardTitle>
            <CardDescription>
              {status === "register"
                ? "Create an account to join the organization"
                : "Join the organization you've been invited to"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(status === "checking" || checkingUser) && (
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Processing invitation...
                  </p>
                </div>
              )}

              {status === "register" && (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleRegister)}
                    className="space-y-4"
                  >
                    {error && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {error}
                      </div>
                    )}

                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="John Doe"
                              disabled={isLoading}
                              autoComplete="name"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              disabled={true}
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
                              autoComplete="new-password"
                              minLength={8}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Must be at least 8 characters long
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="••••••••"
                              disabled={isLoading}
                              autoComplete="new-password"
                              minLength={8}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading
                        ? "Creating account..."
                        : "Create account and join"}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      By creating an account, you agree to our{" "}
                      <Link
                        href="/legal/terms"
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/legal/privacy"
                        className="text-primary hover:underline"
                        target="_blank"
                      >
                        Privacy Policy
                      </Link>
                      .
                    </p>
                  </form>
                </Form>
              )}

              {status === "login-required" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4 text-center">
                    <p className="text-blue-700 dark:text-blue-400 font-medium">
                      {message}
                    </p>
                  </div>
                  <Button onClick={handleLogin} className="w-full">
                    Log In
                  </Button>
                </div>
              )}

              {status === "accepting" && (
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Accepting invitation...
                  </p>
                </div>
              )}

              {status === "success" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-center">
                    <p className="text-green-700 dark:text-green-400 font-medium">
                      {message}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}

              {status === "already-member" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4 text-center">
                    <p className="text-blue-700 dark:text-blue-400 font-medium">
                      {message}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full"
                    variant="outline"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}

              {status === "error" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                    <p className="text-destructive font-medium">{message}</p>
                  </div>
                  <Button
                    onClick={() => router.push("/dashboard")}
                    className="w-full"
                    variant="outline"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background p-4">
          <div className="w-full max-w-md">
            <Card>
              <CardHeader>
                <CardTitle>Accept Invitation</CardTitle>
                <CardDescription>
                  Join the organization you've been invited to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <AcceptInvitationContent />
    </Suspense>
  );
}
