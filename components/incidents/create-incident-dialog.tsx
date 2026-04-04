import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import type { Incident } from "./incidents-client";

interface CreateIncidentDialogProps {
  open: boolean;
  loading: boolean;
  severity: Incident["severity"];
  setSeverity: (severity: Incident["severity"]) => void;
  title: string;
  setTitle: (title: string) => void;
  description: string;
  setDescription: (description: string) => void;
  impact: string;
  setImpact: (impact: string) => void;
  createIncident: () => void;
  setOpen: (open: boolean) => void;
  canCreate: boolean;
}

export function CreateIncidentDialog({
  open,
  loading,
  setOpen,
  severity,
  setSeverity,
  title,
  setTitle,
  description,
  setDescription,
  impact,
  setImpact,
  createIncident,
  canCreate,
}: CreateIncidentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={loading}>New incident</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Create incident</DialogTitle>
        </DialogHeader>

        <div className="w-full grid gap-4">
          <div className="w-full grid gap-2">
            <Label>Severity</Label>
            <Select
              value={severity}
              onValueChange={(v) => setSeverity(v as Incident["severity"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened?"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="impact">Impact</Label>
            <Textarea
              id="impact"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
              placeholder="Who/what was impacted?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={createIncident} disabled={loading || !canCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
