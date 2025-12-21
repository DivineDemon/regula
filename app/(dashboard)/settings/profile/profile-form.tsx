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

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.string().email("Invalid email address"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  userId: string;
  initialName: string;
  initialEmail: string;
}

export function ProfileForm({
  userId: _userId,
  initialName,
  initialEmail,
}: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [errors, setErrors] = useState<
    Partial<Record<keyof ProfileFormData, string>>
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
    const result = profileSchema.safeParse({ name, email });

    if (!result.success) {
      const fieldErrors: Partial<Record<keyof ProfileFormData, string>> = {};
      result.error.issues.forEach((err: ZodIssue) => {
        const field = (
          typeof err.path[0] === "string" ? err.path[0] : String(err.path[0])
        ) as keyof ProfileFormData;
        if (field) {
          fieldErrors[field] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: result.data.name,
          email: result.data.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update profile");
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
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your name and email address</CardDescription>
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
              Profile updated successfully!
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="name"
                aria-invalid={errors.name ? "true" : "false"}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
                aria-invalid={errors.email ? "true" : "false"}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Changing your email will require verification
              </p>
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
