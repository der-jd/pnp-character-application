"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RecordEntry } from "@/src/lib/api/models/history/interface";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@components/ui/button";
import { format } from "date-fns";
import { RecordType } from "@/src/lib/api/utils/historyEventType";

// Helper function to extract a displayable value from any data type
function extractValue(data: unknown): string | number {
  if (data === null || data === undefined) return 0;
  if (typeof data === "number") return data;
  if (typeof data === "string") return data;
  // Handle nested objects with "current" property (skills, attributes, base values)
  if (typeof data === "object" && "current" in data) {
    return data.current ?? 0;
  }
  // Handle combat stats objects - return JSON representation
  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length > 0) {
      return keys.map((k) => `${k}: ${data[k]}`).join(", ");
    }
  }
  return "—";
}

export const columns: ColumnDef<RecordEntry>[] = [
  {
    accessorKey: "id",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Id <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "timestamp",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Date <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const raw = row.getValue("timestamp") as string;
      const formatted = format(new Date(raw), "dd.MM.yyyy HH:mm");
      return <div>{formatted}</div>;
    },
  },
  {
    id: "type",
    accessorFn: (row) => RecordType[row.type as unknown as number],
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Type <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "learningMethod",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Learning Method <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    id: "spent",
    accessorFn: (row) => {
      // Handle skill changes
      if (row.data?.new && row.data?.old && "skill" in row.data.new && "skill" in row.data.old) {
        return (row.data.new as Record<string, { skill: { totalCost: number } }>).skill.totalCost - (row.data.old as Record<string, { skill: { totalCost: number } }>).skill.totalCost;
      }
      // Handle other numeric changes (attributes, base values)
      if (typeof row.data?.new === "number" && typeof row.data?.old === "number") {
        return row.data.new - row.data.old;
      }
      return 0;
    },
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Points spent <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("spent");
      return <div>{value}</div>;
    },
    sortingFn: "basic",
  },
  {
    id: "old",
    accessorFn: (row) => extractValue(row.data?.old),
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Old Value <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("old");
      return <div className="text-sm">{value}</div>;
    },
    sortingFn: "basic",
  },
  {
    id: "new",
    accessorFn: (row) => extractValue(row.data?.new),
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        New Value <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("new");
      return <div className="text-sm">{value}</div>;
    },
    sortingFn: "basic",
  },
  {
    id: "spent total",
    accessorFn: (row) => {
      // Handle skill changes
      if (row.data?.new && "skill" in row.data.new) {
        return (row.data.new as Record<string, { skill?: { totalCost: number } }>).skill?.totalCost ?? 0;
      }
      // Handle other types - return 0 for non-skill data
      return 0;
    },
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Spent Total <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("spent total");
      return <div>{typeof value === "number" ? value : "—"}</div>;
    },
    sortingFn: "basic",
  },
];
