"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserRole } from "@/lib/auth/roles";

const inviteSchema = z.object({
  email: z.email("Invalid email address"),
  role: z.enum([UserRole.ADMIN, UserRole.ANALYST, UserRole.VIEWER]),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteMemberFormProps {
  organizationId: string;
}

export function InviteMemberForm({ organizationId }: InviteMemberFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: UserRole.VIEWER,
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/organizations/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          email: data.email,
          role: data.role,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        toast.error(responseData.error || "Failed to send invitation");
        setIsLoading(false);
        return;
      }

      toast.success("Invitation sent successfully!");
      form.reset();
      setIsLoading(false);
      router.refresh();
    } catch (_err) {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border bg-card flex flex-col items-start justify-start">
      <div className="w-full flex flex-col items-start justify-start p-5 border-b">
        <h2 className="w-full text-left text-lg font-bold">Invite Member</h2>
        <p className="w-full text-left text-muted-foreground">
          Send an invitation to join your organization
        </p>
      </div>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col items-start justify-start gap-5 p-5"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel className="text-sm font-medium">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="user@example.com"
                    disabled={isLoading}
                    autoComplete="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="w-full flex flex-col items-start justify-start">
                <FormLabel className="text-sm font-medium">Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoading}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={UserRole.VIEWER}>Viewer</SelectItem>
                    <SelectItem value={UserRole.ANALYST}>Analyst</SelectItem>
                    <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Viewers can view content. Analysts can create and manage
                  targets and alerts. Admins have full access including member
                  management.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Send Invitation"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}
