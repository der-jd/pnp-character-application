"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RecordEntry } from "@/src/lib/api/models/history/interface";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@components/ui/button";
import { format } from "date-fns";
import { RecordType } from "@/src/lib/api/utils/historyEventType";

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
      if ("skill" in row.data?.new && "skill" in row.data?.old) {
        return row.data.new.skill.totalCost - row.data.old.skill.totalCost;
      }
      return 0;
    },
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Points spent <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: "basic",
  },
  {
    id: "old",
    accessorFn: (row) => {
      if ("skill" in row.data?.new && "skill" in row.data?.old) {
        return row.data?.old.skill.current ?? 0;
      }
      return 0;
    },
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Old Value <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: "basic",
  },
  {
    id: "new",
    accessorFn: (row) => {
      if ("skill" in row.data?.new && "skill" in row.data?.old) {
        return row.data?.new.skill.current ?? 0;
      }
      return 0;
    },
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        New Value <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: "basic",
  },
  {
    id: "spent total",
    accessorFn: (row) => {
      if ("skill" in row.data?.new && "skill" in row.data?.old) {
        return row.data?.new.skill.totalCost ?? 0;
      }
      return 0;
    },
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Spent Total <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: "basic",
  },
];
