import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { isPlatformAdmin } from "@/lib/auth/platform-admin";
import { getPlatformKpis } from "@/lib/services/kpi";

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email ?? undefined;
    if (!isPlatformAdmin(email)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const kpis = await getPlatformKpis();
    return NextResponse.json(kpis);
  } catch (error) {
    console.error("Error fetching admin KPIs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
