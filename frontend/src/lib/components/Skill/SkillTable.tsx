"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@lib/components/ui/table";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, VisibilityState } from "@tanstack/react-table";
import { Button } from "@lib/components/ui/button";
import { Checkbox } from "@lib/components/ui/checkbox";
import { ISkillProps, render_skill_icon } from "./SkillDefinitions";
import { LearningMethod } from "api-spec";
import { useSkillUpdater } from "@/src/hooks/useSkillUpdate";
import { useLoadingOverlay } from "@/src/app/global/OverlayContext";
import { useCharacterStore } from "@/src/app/global/characterStore";

export const SkillsTable: React.FC<{ initialData: ISkillProps[] }> = ({ initialData }) => {
  const isEditMode = useCharacterStore((state) => state.editMode);
  const { show, hide } = useLoadingOverlay();
  const { tryIncrease } = useSkillUpdater();
  const [data, setData] = useState(initialData);

  // Debug: Log first skill to check data structure
  useEffect(() => {
    // Data structure validation moved to development logs only
  }, [initialData]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    is_active: isEditMode,
    cost_category: isEditMode,
    cost: isEditMode,
    skilling: isEditMode,
  });

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    setColumnVisibility((prev) => ({
      ...prev,
      is_active: isEditMode,
      cost_category: isEditMode,
      cost: isEditMode,
      skilling: isEditMode,
    }));
  }, [isEditMode]);

  const skillButtonPushed = async (skill: ISkillProps, points_to_skill: number) => {
    show();
    await tryIncrease(skill, points_to_skill);
    hide();
  };

  // In edit mode: show ALL skills
  // In view mode: show only ACTIVATED skills
  const filteredData = useMemo(() => (isEditMode ? data : data.filter((skill) => skill.activated)), [data, isEditMode]);

  const columns: ColumnDef<ISkillProps>[] = [
    {
      accessorKey: "icon",
      header: "",
      cell: ({ row }) => <div className="w-full p-0">{render_skill_icon(row.getValue("name"))}</div>,
    },
    {
      accessorKey: "name",
      header: () => <div className="text-left font-bold">Name</div>,
      cell: ({ row }) => <div className="font-medium">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "level",
      header: () => <div className="text-center">Level</div>,
      cell: ({ row }) => {
        const value = row.original.current_level;
        return <div className="text-center">{value}</div>;
      },
    },
    {
      accessorKey: "mod",
      header: () => <div className="text-center">Modifier</div>,
      cell: ({ row }) => {
        const value = row.original.mod;
        const sign = value >= 0 ? "+" : "";
        return (
          <div className="text-center">
            {sign}
            {value}
          </div>
        );
      },
    },
    {
      id: "is_active",
      header: () => <div className="text-center">Active</div>,
      cell: ({ row }) => {
        const skill = row.original;
        return (
          <div className="text-center">
            <Checkbox
              checked={skill.activated}
              onCheckedChange={(checked) => {
                setData((prevData) =>
                  prevData.map((item) => (item.name === skill.name ? { ...item, activated: Boolean(checked) } : item))
                );
              }}
              aria-label={`Set ${skill.name} as active`}
              disabled={skill.activated}
            />
          </div>
        );
      },
    },
    {
      accessorKey: "cost_category",
      header: () => <div className="text-center">Cost Category</div>,
      cell: ({ row }) => <div className="text-center">{LearningMethod[row.original.learning_method]}</div>,
    },
    {
      accessorKey: "cost",
      header: () => <div className="text-center">Total Cost</div>,
      cell: ({ row }) => {
        const value = row.original.cost;
        return <div className="text-center">{value}</div>;
      },
    },
    {
      accessorKey: "skilling",
      header: () => <div className="text-center">Increase</div>,
      cell: ({ row }) => {
        // Only show increase buttons for activated skills
        if (!row.original.activated) {
          return <div className="text-center text-gray-400 text-sm">Activate first</div>;
        }

        return (
          <div className="flex justify-evenly items-right w-full space-x-4">
            {[1, 5, 10].map((points) => (
              <Button
                key={points}
                className="flex-1 bg-black hover:bg-gray-300 hover:text-black text-white rounded-lg"
                onClick={() => skillButtonPushed(row.original, points)}
              >
                {points}
              </Button>
            ))}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: (updater) => {
      setColumnVisibility((prev) => (typeof updater === "function" ? updater(prev) : updater));
    },
    getRowCanExpand: () => true,
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
                  <TableHead key={header.id} className={header.column.id === "actions" ? "text-right" : ""}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="items-center justify-center">
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
