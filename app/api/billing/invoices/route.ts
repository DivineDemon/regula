import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { UserRole } from "@/lib/auth/roles";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { stripeService } from "@/lib/services/stripe";
import { subscriptionService } from "@/lib/services/subscriptions";

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

    // Check if user has access and is admin
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

    if (!member || member.role !== UserRole.ADMIN) {
      return NextResponse.json(
        { error: "Access denied. Admin role required." },
        { status: 403 },
      );
    }

    // Get subscription to get customer ID
    const subscription =
      await subscriptionService.getSubscription(organizationId);

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json({ invoices: [] }, { status: 200 });
    }

    // Get invoices from Stripe
    const invoices = await stripeService.getInvoices(
      subscription.stripeCustomerId,
      50, // Limit to 50 invoices
    );

    // Format invoices for response
    const formattedInvoices = invoices.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      created: invoice.created * 1000, // Convert to milliseconds
      dueDate: invoice.due_date ? invoice.due_date * 1000 : null,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
    }));

    return NextResponse.json({ invoices: formattedInvoices }, { status: 200 });
  } catch (error) {
    console.error("Get invoices error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 },
    );
  }
}
