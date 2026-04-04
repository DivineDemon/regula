import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import type { Incident } from "./incidents-client";

interface IncidentsTableProps {
  items: Incident[];
  loading: boolean;
  updateStatus: (id: string, status: Incident["status"]) => void;
}

export function IncidentsTable({
  items,
  loading,
  updateStatus,
}: IncidentsTableProps) {
  return (
    <div className="w-full h-full rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Created</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Title</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && items.length === 0 ? (
            [1, 2, 3, 4, 5, 6].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20 rounded-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-[150px] ml-auto" />
                </TableCell>
              </TableRow>
            ))
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">
                No incidents yet.
              </TableCell>
            </TableRow>
          ) : (
            items.map((it) => (
              <TableRow key={it.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(it.createdAt).toLocaleString()}
                </TableCell>
                <TableCell className="capitalize">{it.severity}</TableCell>
                <TableCell className="capitalize">{it.status}</TableCell>
                <TableCell className="font-medium">{it.title}</TableCell>
                <TableCell className="text-right">
                  <Select
                    value={it.status}
                    onValueChange={(v) =>
                      void updateStatus(it.id, v as Incident["status"])
                    }
                    disabled={loading}
                  >
                    <SelectTrigger className="h-8 w-[150px] ml-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="mitigating">Mitigating</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
