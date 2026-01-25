"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import type { ConsentType } from "@/lib/db/schema";
import { Switch } from "../ui/switch";

interface Consent {
  id: string;
  consentType: ConsentType;
  granted: string | null;
  withdrawn: string | null;
  consentVersion: string | null;
}

const CONSENT_LABELS: Record<
  ConsentType,
  { title: string; description: string }
> = {
  marketing_emails: {
    title: "Marketing Emails",
    description: "Receive promotional emails and product updates",
  },
  analytics: {
    title: "Analytics",
    description: "Allow us to collect analytics data to improve our service",
  },
  cookies: {
    title: "Cookies",
    description: "Allow us to use cookies for enhanced functionality",
  },
  data_processing: {
    title: "Data Processing",
    description: "Allow us to process your data to provide the service",
  },
};

export function ConsentManagementClient({
  userId: _userId,
}: {
  userId: string;
}) {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/consent");
      if (response.ok) {
        const data = await response.json();
        setConsents(data.consents || []);
      }
    } catch (error) {
      console.error("Error fetching consents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const handleGrantConsent = async (consentType: ConsentType) => {
    setUpdating(consentType);
    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consentType }),
      });

      if (!response.ok) {
        throw new Error("Failed to grant consent");
      }

      toast.success("Consent granted successfully");
      await fetchConsents();
    } catch (_error) {
      toast.error("Failed to grant consent. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  const handleWithdrawConsent = async (consentType: ConsentType) => {
    setUpdating(consentType);
    try {
      const response = await fetch(`/api/consent?consentType=${consentType}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to withdraw consent");
      }

      toast.success("Consent withdrawn successfully");
      await fetchConsents();
    } catch (_error) {
      toast.error("Failed to withdraw consent. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  const hasConsent = (consentType: ConsentType): boolean => {
    const consent = consents.find((c) => c.consentType === consentType);
    return consent
      ? consent.granted !== null && consent.withdrawn === null
      : false;
  };

  const handleToggleConsent = async (
    consentType: ConsentType,
    checked: boolean,
  ) => {
    if (checked) {
      await handleGrantConsent(consentType);
    } else {
      await handleWithdrawConsent(consentType);
    }
  };

  if (loading) {
    const consentEntries = Object.entries(CONSENT_LABELS);
    return (
      <div className="w-full flex flex-col items-start justify-start border rounded-3xl shadow">
        {consentEntries.map(([type], index) => {
          const isLast = index === consentEntries.length - 1;
          return (
            <div
              key={type}
              className={`w-full flex items-center justify-center p-5 ${
                !isLast ? "border-b" : ""
              }`}
            >
              <div className="flex-1 flex flex-col items-start justify-start gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          );
        })}
      </div>
    );
  }

  const consentEntries = Object.entries(CONSENT_LABELS);

  return (
    <div className="w-full flex flex-col items-start justify-start border rounded-3xl shadow">
      {consentEntries.map(([type, label], index) => {
        const consentType = type as ConsentType;
        const isGranted = hasConsent(consentType);
        const isUpdating = updating === consentType;
        const isLast = index === consentEntries.length - 1;

        return (
          <div
            key={type}
            className={`w-full flex items-center justify-center p-5 ${
              !isLast ? "border-b" : ""
            }`}
          >
            <div className="flex-1 flex flex-col items-start justify-start">
              <span className="w-full text-left font-bold">{label.title}</span>
              <span className="w-full text-left text-sm text-muted-foreground">
                {label.description}
              </span>
            </div>
            <Switch
              checked={isGranted}
              onCheckedChange={(checked) =>
                handleToggleConsent(consentType, checked)
              }
              disabled={isUpdating}
            />
          </div>
        );
      })}
    </div>
  );
}
