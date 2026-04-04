import { DrizzleAdapter } from "@auth/drizzle-adapter";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import type { DefaultSession } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import {
  accounts,
  organizationMembers,
  sessions,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { createAuditLog } from "@/lib/services/audit";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user?.password) {
          return null;
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password as string,
          user.password,
        );

        if (!isValidPassword) {
          return null;
        }

        // Check if email is verified
        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }

        // Get user's first organization for audit logging
        const [userOrg] = await db
          .select()
          .from(organizationMembers)
          .where(eq(organizationMembers.userId, user.id))
          .limit(1);

        // Audit log for login (fire and forget)
        if (userOrg) {
          createAuditLog({
            organizationId: userOrg.organizationId,
            userId: user.id,
            action: "user.login",
            metadata: {
              email: user.email,
            },
          }).catch((error) => {
            // Don't fail login if audit logging fails
            console.error("Failed to create audit log for login:", error);
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // NextAuth v5 supports both AUTH_SECRET and NEXTAUTH_SECRET for backward compatibility
  // AUTH_SECRET is the preferred name in v5
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
});
