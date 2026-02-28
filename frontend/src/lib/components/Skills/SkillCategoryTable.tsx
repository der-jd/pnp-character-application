"use client";

import { ColumnDef, flexRender, getCoreRowModel, useReactTable, VisibilityState } from "@tanstack/react-table";
import { useState, useEffect, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@lib/components/ui/table";
import { Button } from "@lib/components/ui/button";
import { Checkbox } from "@lib/components/ui/checkbox";
import type { SkillViewModel } from "@/src/lib/domain/Skills";
import { CostCategory } from "api-spec";
import { getSkillIcon } from "./skillIcons";

interface SkillCategoryTableProps {
  skills: SkillViewModel[];
  categoryName: string;
  isEditMode: boolean;
  onSkillIncrease: (skill: SkillViewModel, points: number) => Promise<void>;
  onSkillActivate?: (skill: SkillViewModel, activated: boolean) => Promise<void>;
}

/**
 * Pure presentational component for rendering a skill table
 * Follows backend-first architecture - delegates all mutations via callbacks
 */
export function SkillCategoryTable({
  skills,
  categoryName,
  isEditMode,
  onSkillIncrease,
  onSkillActivate,
}: SkillCategoryTableProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    isActivated: isEditMode,
    costCategory: isEditMode,
    totalCost: isEditMode,
    actions: isEditMode,
  });

  // Update column visibility when edit mode changes
  useEffect(() => {
    setColumnVisibility({
      isActivated: isEditMode,
      costCategory: isEditMode,
      totalCost: isEditMode,
      actions: isEditMode,
    });
  }, [isEditMode, categoryName]);

  // Filter skills based on edit mode - MEMOIZE to prevent new array on every render
  const displaySkills = useMemo(() => {
    return isEditMode ? skills : skills.filter((skill) => skill.isActivated);
  }, [isEditMode, skills]);

  const columns: ColumnDef<SkillViewModel>[] = useMemo(
    () => [
      {
        id: "icon",
        header: "",
        cell: ({ row }) => <div className="w-full p-0">{getSkillIcon(row.original.category, row.original.name)}</div>,
      },
      {
        accessorKey: "displayName",
        header: () => <div className="text-left font-bold">Name</div>,
        cell: ({ row }) => <div className="font-medium">{row.original.displayName}</div>,
      },
      {
        accessorKey: "currentLevel",
        header: () => <div className="text-center">Level</div>,
        cell: ({ row }) => <div className="text-center">{row.original.currentLevel}</div>,
      },
      {
        accessorKey: "modifier",
        header: () => <div className="text-center">Modifier</div>,
        cell: ({ row }) => {
          const mod = row.original.modifier;
          const sign = mod >= 0 ? "+" : "";
          return (
            <div className="text-center">
              {sign}
              {mod}
            </div>
          );
        },
      },
      {
        id: "isActivated",
        accessorKey: "isActivated",
        header: () => <div className="text-center">Active</div>,
        cell: ({ row }) => {
          const skill = row.original;
          return (
            <div className="text-center">
              <Checkbox
                checked={skill.isActivated}
                onCheckedChange={(checked) => onSkillActivate?.(skill, Boolean(checked))}
                aria-label={`Set ${skill.displayName} as active`}
                disabled={skill.isActivated} // Can't deactivate once activated
              />
            </div>
          );
        },
      },
      {
        id: "costCategory",
        accessorKey: "defaultCostCategory",
        header: () => <div className="text-center">Cost Category</div>,
        cell: ({ row }) => {
          const category = row.original.defaultCostCategory;
          return <div className="text-center">{CostCategory[category]}</div>;
        },
      },
      {
        id: "totalCost",
        accessorKey: "totalCost",
        header: () => <div className="text-center">Total Cost</div>,
        cell: ({ row }) => <div className="text-center">{row.original.totalCost}</div>,
      },
      {
        id: "actions",
        header: () => <div className="text-center">Increase</div>,
        cell: ({ row }) => {
          const skill = row.original;

          // Only show increase buttons for activated skills
          if (!skill.isActivated) {
            return <div className="text-center text-gray-400 text-sm">Activate first</div>;
          }

          return (
            <div className="flex justify-evenly items-center w-full space-x-2">
              {[1, 5, 10].map((points) => (
                <Button
                  key={points}
                  className="flex-1 bg-black hover:bg-gray-300 hover:text-black text-white rounded-lg"
                  onClick={() => onSkillIncrease(skill, points)}
                  size="sm"
                >
                  {points}
                </Button>
              ))}
            </div>
          );
        },
      },
    ],
    [onSkillIncrease, onSkillActivate],
  );

  const table = useReactTable({
    data: displaySkills,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: { columnVisibility },
  });

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-200 h-10">
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="p-0.5">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-10 text-center">
                  {isEditMode ? "No skills in this category" : "No activated skills"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
