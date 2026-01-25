import { Building2, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { UserRole } from "@/lib/auth/roles";
import type { organizations } from "@/lib/db/schema";

type Organization = typeof organizations.$inferSelect;

interface OrganizationListProps {
  organizations: Array<{
    organization: Organization;
    role: string;
    joinedAt: Date;
  }>;
}

export function OrganizationList({ organizations }: OrganizationListProps) {
  if (organizations.length === 0) {
    return (
      <div className="w-full flex flex-col items-center justify-center h-[calc(100vh-200px)] border-2 border-dashed rounded-3xl">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Building2 />
            </EmptyMedia>
            <EmptyTitle>No organizations</EmptyTitle>
            <EmptyDescription>
              You are not a member of any organizations yet.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "default";
      case UserRole.ANALYST:
        return "secondary";
      case UserRole.VIEWER:
        return "outline";
      default:
        return "outline";
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case "enterprise":
        return "default";
      case "growth":
        return "secondary";
      case "starter":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="w-full max-h-[calc(100vh-200px)] flex flex-col items-start justify-start gap-5 border-2 border-dashed rounded-3xl overflow-y-auto p-5">
      {organizations.map(({ organization, role, joinedAt }) => (
        <Card key={organization.id} size="sm" className="w-full">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {organization.name}
                </CardTitle>
                <CardDescription className="mt-1">
                  /{organization.slug}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <Badge
                  variant={getRoleBadgeVariant(role)}
                  className="capitalize"
                >
                  {role}
                </Badge>
                <Badge
                  variant={getPlanBadgeVariant(organization.plan)}
                  className="capitalize"
                >
                  {organization.plan}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>
                Joined&nbsp;
                {new Date(joinedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
