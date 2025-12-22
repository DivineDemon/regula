import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Check if user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return NextResponse.json({
      exists: !!user,
      userId: user?.id,
    });
  } catch (error) {
    console.error("User check error:", error);
    return NextResponse.json(
      { error: "Failed to check user existence" },
      { status: 500 },
    );
  }
}
