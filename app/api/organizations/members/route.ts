import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers, users } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 },
      );
    }

    // Verify user is member of organization
    const [member] = await db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, session.user.id),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (!member) {
      return NextResponse.json(
        { error: "Access denied to this organization" },
        { status: 403 },
      );
    }

    // Get all members
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        image: users.image,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(eq(organizationMembers.organizationId, organizationId));

    return NextResponse.json({ members }, { status: 200 });
  } catch (error) {
    console.error("Get members error:", error);
    return NextResponse.json(
      { error: "Failed to fetch members" },
      { status: 500 },
    );
  }
}
