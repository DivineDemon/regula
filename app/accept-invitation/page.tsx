"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "already-member" | "login-required"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const acceptInvitation = async () => {
      const token = searchParams.get("token");
      const email = searchParams.get("email");

      if (!token || !email) {
        setStatus("error");
        setMessage("Invalid invitation link");
        return;
      }

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
          if (data.error === "LOGIN_REQUIRED") {
            setStatus("login-required");
            setMessage("Please log in to accept the invitation");
          } else if (data.error === "ALREADY_MEMBER") {
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
      } catch (_error) {
        setStatus("error");
        setMessage("An error occurred while accepting the invitation");
      }
    };

    acceptInvitation();
  }, [searchParams]);

  return (
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
            <div className="space-y-4">
              {status === "loading" && (
                <div className="text-center">
                  <p className="text-muted-foreground">
                    Processing invitation...
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

              {status === "login-required" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4 text-center">
                    <p className="text-blue-700 dark:text-blue-400 font-medium">
                      {message}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      const currentUrl =
                        typeof window !== "undefined"
                          ? window.location.href
                          : "/accept-invitation";
                      router.push(
                        `/login?callbackUrl=${encodeURIComponent(currentUrl)}`,
                      );
                    }}
                    className="w-full"
                  >
                    Log In
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
