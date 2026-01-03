"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ConsentType } from "@/lib/db/schema";

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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Loading consent preferences...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(CONSENT_LABELS).map(([type, label]) => {
        const consentType = type as ConsentType;
        const isGranted = hasConsent(consentType);
        const isUpdating = updating === consentType;

        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{label.title}</CardTitle>
              <CardDescription>{label.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Status: {isGranted ? "Granted" : "Not Granted"}
                  </p>
                  {isGranted &&
                    (() => {
                      const consent = consents.find(
                        (c) => c.consentType === consentType,
                      );
                      return consent?.granted ? (
                        <p className="text-xs text-muted-foreground mt-1">
                          Granted on:&nbsp;
                          {new Date(consent.granted).toLocaleDateString()}
                        </p>
                      ) : null;
                    })()}
                </div>
                {isGranted ? (
                  <Button
                    onClick={() => handleWithdrawConsent(consentType)}
                    disabled={isUpdating}
                    variant="outline"
                  >
                    {isUpdating ? "Updating..." : "Withdraw Consent"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleGrantConsent(consentType)}
                    disabled={isUpdating}
                  >
                    {isUpdating ? "Updating..." : "Grant Consent"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
