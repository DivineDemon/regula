import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import type { AlertRelationshipType } from "@/lib/db/schema/alert-relationships";
import {
  createAlertRelationship,
  deleteAlertRelationship,
  getAlertRelationships,
} from "@/lib/services/alert-relationships";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const organizationId = searchParams.get("organizationId");

    if (!organizationId) {
      return NextResponse.json(
        { error: "organizationId is required" },
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const relationships = await getAlertRelationships(id, organizationId);
    return NextResponse.json({ relationships });
  } catch (error) {
    console.error("Error fetching alert relationships:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      organizationId: string;
      targetAlertId: string;
      relationshipType: AlertRelationshipType;
      notes?: string;
    };

    if (!body.organizationId || !body.targetAlertId || !body.relationshipType) {
      return NextResponse.json(
        {
          error:
            "organizationId, targetAlertId, and relationshipType are required",
        },
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
          eq(organizationMembers.organizationId, body.organizationId),
        ),
      )
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const relationship = await createAlertRelationship(body.organizationId, {
      sourceAlertId: id,
      targetAlertId: body.targetAlertId,
      relationshipType: body.relationshipType,
      notes: body.notes,
      createdBy: session.user.id,
    });

    return NextResponse.json({ relationship }, { status: 201 });
  } catch (error) {
    console.error("Error creating alert relationship:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as {
      organizationId: string;
      targetAlertId: string;
      relationshipType: AlertRelationshipType;
    };

    if (!body.organizationId || !body.targetAlertId || !body.relationshipType) {
      return NextResponse.json(
        {
          error:
            "organizationId, targetAlertId, and relationshipType are required",
        },
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
          eq(organizationMembers.organizationId, body.organizationId),
        ),
      )
      .limit(1);

    if (!member) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await deleteAlertRelationship(
      id,
      body.targetAlertId,
      body.relationshipType,
      body.organizationId,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting alert relationship:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
