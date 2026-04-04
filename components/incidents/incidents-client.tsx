"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreateIncidentDialog } from "./create-incident-dialog";
import { IncidentsTable } from "./incidents-table";

export type Incident = {
  id: string;
  organizationId: string;
  createdByUserId: string | null;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "mitigating" | "resolved";
  title: string;
  description: string | null;
  impact: string | null;
  startedAt: string | null;
  detectedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function IncidentsClient({
  organizationId,
}: {
  organizationId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Incident[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const [severity, setSeverity] = useState<Incident["severity"]>("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");

  const canCreate = useMemo(() => title.trim().length >= 3, [title]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/incidents?organizationId=${encodeURIComponent(organizationId)}`,
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to load incidents");
      }
      const data = (await res.json()) as { incidents: Incident[] };
      setItems(data.incidents ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createIncident = async () => {
    if (!canCreate) return;
    setLoading(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId,
          severity,
          title: title.trim(),
          description: description.trim() || undefined,
          impact: impact.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create incident");
      }
      toast.success("Incident created");
      setOpenCreate(false);
      setTitle("");
      setDescription("");
      setImpact("");
      setSeverity("medium");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create incident");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Incident["status"]) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/incidents/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, status }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update incident");
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update incident");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-start justify-start gap-5">
      <div className="w-full flex items-center justify-center">
        <div className="flex-1 flex flex-col items-start justify-start gap-2">
          <h1 className="w-full text-left text-3xl font-bold">
            Incident Management
          </h1>
          <p className="w-full text-left text-muted-foreground">
            Log, track, and resolve security or availability incidents.
          </p>
        </div>
        <CreateIncidentDialog
          open={openCreate}
          loading={loading}
          setOpen={setOpenCreate}
          severity={severity}
          setSeverity={setSeverity}
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          impact={impact}
          setImpact={setImpact}
          createIncident={createIncident}
          canCreate={canCreate}
        />
      </div>
      <IncidentsTable
        items={items}
        loading={loading}
        updateStatus={updateStatus}
      />
    </div>
  );
}
