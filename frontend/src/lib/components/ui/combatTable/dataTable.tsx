"use client";

import React, { useMemo } from "react";
import { ColumnDef, useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import { ICombatValue } from "./definitions";
import { getCombatValueColumns, getEditColumns } from "./columns";
import { useCharacterStore } from "@/src/app/global/characterStore";

interface CombatValueTableProps {
  data: ICombatValue[];
  callback: (item: ICombatValue, subtype: "attack" | "parry", amount: number) => void;
}

export const CombatValueTable = ({ data, callback }: CombatValueTableProps) => {
  const isEditMode = useCharacterStore((state) => state.editMode);

  const columns: ColumnDef<ICombatValue, unknown>[] = useMemo(() => {
    const baseColumns = getCombatValueColumns();
    const editColumns = isEditMode
      ? getEditColumns((name: string, key: string, amount: unknown) => {
          const parsedAmount = typeof amount === "number" ? amount : Number(amount);
          if (isNaN(parsedAmount)) return;
          const item = data.find((d) => d.name === name);

          if (item) callback(item, key as "attack" | "parry", parsedAmount);
        })
      : [];
    return [...baseColumns, ...editColumns];
  }, [isEditMode, data, callback]);

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-200 h-10">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={
                      header.column.id === "name"
                        ? "text-left px-2 w-80" // or w-[160px] if you prefer pixels
                        : "text-left px-2"
                    }
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={
                        cell.column.id === "name"
                          ? "text-left px-2 w-80" // or w-[160px] if you prefer pixels
                          : "text-left px-2"
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-10 text-center">
                  No combat values found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
