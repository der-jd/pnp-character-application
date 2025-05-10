"use client";

import { ColumnDef } from "@tanstack/react-table";
import { RecordEntry } from "../../../api/models/history/interface";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@components/ui/button"; // update path if needed
import { format } from "date-fns";

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
    accessorKey: "type",
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
    accessorFn: (row) => row.calculationPointsChange?.adjustment ?? 0,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Points spent <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: "basic",
  },
  {
    id: "old",
    accessorFn: (row) => row.calculationPointsChange?.old ?? 0,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Old Value <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: "basic",
  },
  {
    id: "new",
    accessorFn: (row) => row.calculationPointsChange?.new ?? 0,
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        New Value <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    sortingFn: "basic",
  },
];
