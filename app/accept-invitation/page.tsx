import { eq } from "drizzle-orm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { AcceptInvitationClient } from "../../components/invitation/accept-invitation-client";

async function checkUserExists(email: string) {
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return !!user;
}

// Note: Invitation acceptance will be handled by the client component
// since it requires authentication and API calls

export default async function AcceptInvitationPage({
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
                <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
                  <p className="text-destructive font-medium">
                    Invalid invitation link
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const session = await auth();
  const userExists = await checkUserExists(email);

  // Determine initial status
  let initialStatus:
    | "register"
    | "login-required"
    | "accepting"
    | "success"
    | "error"
    | "already-member" = "register";
  let initialMessage = "";

  if (userExists) {
    // User exists - check if logged in
    if (session?.user?.email === email) {
      // User is logged in with matching email - client will auto-accept
      initialStatus = "accepting";
      initialMessage = "";
    } else {
      // User exists but not logged in or wrong account
      initialStatus = "login-required";
      initialMessage = "Please log in to accept the invitation";
    }
  } else {
    // User doesn't exist - show registration form
    initialStatus = "register";
  }

  return (
    <AcceptInvitationClient
      token={token}
      email={email}
      initialStatus={initialStatus}
      initialMessage={initialMessage}
    />
  );
}
