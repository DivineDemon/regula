import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { VersionComparisonViewer } from "@/components/alerts/version-comparison-viewer";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth/config";
import { getCurrentOrganization } from "@/lib/utils/organization";

interface ComparePageProps {
  searchParams: Promise<{
    organizationId?: string;
    currentVersionId?: string;
    previousVersionId?: string;
  }>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const params = await searchParams;
  const organizationId =
    params.organizationId ??
    (await cookies()).get("currentOrganizationId")?.value;
  const currentVersionId = params.currentVersionId;
  const previousVersionId = params.previousVersionId;

  if (!organizationId) redirect("/dashboard");
  const currentOrg = await getCurrentOrganization(
    session.user.id,
    organizationId,
  );
  if (!currentOrg) redirect("/dashboard");

  if (!currentVersionId || !previousVersionId) {
    redirect("/alerts");
  }

  return (
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link
            href={`/alerts?organizationId=${encodeURIComponent(organizationId)}`}
          >
            ←
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Compare versions</h1>
      </div>
      <VersionComparisonViewer
        currentVersionId={currentVersionId}
        previousVersionId={previousVersionId}
        organizationId={organizationId}
      />
    </div>
  );
}
