"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@lib/components/ui/table";
import { Button } from "@lib/components/ui/button";
import type { HistoryEntryViewModel } from "@/src/lib/domain/History";
import { ArrowUpDown, RotateCcw } from "lucide-react";

interface HistoryTableProps {
  entries: HistoryEntryViewModel[];
  onRevert?: (entryId: string) => Promise<void>;
}

/**
 * Pure presentational component for rendering a history table
 */
export function HistoryTable({ entries, onRevert }: HistoryTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns: ColumnDef<HistoryEntryViewModel>[] = [
    {
      accessorKey: "number",
      header: "#",
      cell: ({ row }) => <div className="w-12">{row.original.number}</div>,
    },
    {
      accessorKey: "typeName",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="font-medium">{row.original.typeName}</div>,
    },
    {
      accessorKey: "displayName",
      header: "Name",
      cell: ({ row }) => <div>{row.original.displayName}</div>,
    },
    {
      accessorKey: "oldValue",
      header: "Old Value",
      cell: ({ row }) => <div className="text-center">{row.original.oldValue}</div>,
    },
    {
      accessorKey: "newValue",
      header: "New Value",
      cell: ({ row }) => <div className="text-center font-semibold">{row.original.newValue}</div>,
    },
    {
      accessorKey: "learningMethod",
      header: "Learning Method",
      cell: ({ row }) => <div className="text-center">{row.original.learningMethod || "—"}</div>,
    },
    {
      accessorKey: "adventurePointsChange",
      header: "AP Change",
      cell: ({ row }) => {
        const change = row.original.adventurePointsChange;
        if (change === null) return <div className="text-center">—</div>;
        return (
          <div className={`text-center font-medium ${change < 0 ? "text-red-600" : "text-green-600"}`}>
            {change > 0 ? "+" : ""}
            {change}
          </div>
        );
      },
    },
    {
      accessorKey: "formattedTimestamp",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Time
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div className="text-sm text-gray-600">{row.original.formattedTimestamp}</div>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const entry = row.original;
        if (!entry.canRevert || !onRevert) return <div className="text-center">—</div>;

        return (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => onRevert(entry.id)} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Revert
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: entries,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-gray-100">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-gray-50">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No history entries.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
