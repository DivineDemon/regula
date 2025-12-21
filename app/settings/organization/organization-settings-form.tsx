"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type ZodIssue, z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const organizationSchema = z.object({
  name: z
    .string()
    .min(1, "Organization name is required")
    .max(100, "Organization name is too long"),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

interface OrganizationSettingsFormProps {
  organizationId: string;
  initialName: string;
}

export function OrganizationSettingsForm({
  organizationId,
  initialName,
}: OrganizationSettingsFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [errors, setErrors] = useState<
    Partial<Record<keyof OrganizationFormData, string>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    setSuccess(false);

    // Validate with Zod
    const result = organizationSchema.safeParse({ name });

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof OrganizationFormData, string>> =
        {};
      result.error.issues.forEach((err: ZodIssue) => {
        const field = (
          typeof err.path[0] === "string" ? err.path[0] : String(err.path[0])
        ) as keyof OrganizationFormData;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/settings/organization", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          name: result.data.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update organization");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
      setIsLoading(false);
      router.refresh();
    } catch (_err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Information</CardTitle>
        <CardDescription>Update your organization name</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              Organization updated successfully!
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="My Company"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
