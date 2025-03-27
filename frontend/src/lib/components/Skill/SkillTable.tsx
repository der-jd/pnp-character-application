"use client";

import { useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@lib/components/ui/table";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, VisibilityState } from "@tanstack/react-table";
import { Button } from "@lib/components/ui/button";
import { Checkbox } from "@lib/components/ui/checkbox";
import { ISkillProps, render_skill_icon } from "./SkillDefinitions";
import { CharacterSheet, LearningMethod } from "@/src/lib/api/models/Character/character";
import { useCharacterStore } from "@/src/app/global/characterStore";

const getCostCategoryLabel = (category: LearningMethod): string => {
  switch (category) {
    case LearningMethod.FREE:
      return "Free";
    case LearningMethod.LOW_PRICED:
      return "Low";
    case LearningMethod.NORMAL:
      return "Normal";
    case LearningMethod.EXPENSIVE:
      return "Expensive";
    default:
      return "";
  }
};

interface Props {
  data: ISkillProps[];
  is_edit_mode: boolean;
}

export const SkillsTable: React.FC<Props> = ({ data: initialData, is_edit_mode }) => {
  const updateValue = useCharacterStore((state) => state.updateValue);
  const [data, setData] = useState(initialData);
  const [showActiveOnly, setShowActiveOnly] = useState(!is_edit_mode);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    is_active: is_edit_mode,
    cost_category: is_edit_mode,
    cost: is_edit_mode,
    skilling: is_edit_mode,
  });

  useEffect(() => {
    setShowActiveOnly(!is_edit_mode);
    setColumnVisibility((prev) => ({
      ...prev,
      is_active: is_edit_mode,
      cost_category: is_edit_mode,
      cost: is_edit_mode,
      skilling: is_edit_mode,
    }));
    setData(initialData.map((item) => ({ ...item, level: item.edited_level })));
  }, [is_edit_mode, initialData]);

  const try_increase_skill = async (skill: ISkillProps, points_to_skill: number) => {
    const path = ["skills", skill.category] as (keyof CharacterSheet)[];
    const name = skill.name as keyof CharacterSheet;
    updateValue(path, name, points_to_skill);
    setData((prevData) =>
      prevData.map((item) => (item.name === skill.name ? { ...item, edited_level: item.edited_level + points_to_skill } : item))
    );
  };

  const filteredData = useMemo(() => (showActiveOnly ? data.filter((skill) => skill.activated) : data), [data, showActiveOnly]);

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
        const value = is_edit_mode ? row.original.edited_level : row.original.current_level;
        return <div className="text-center">{value}</div>;
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
                  prevData.map((item) =>
                    item.name === skill.name ? { ...item, activated: checked === true } : item
                  )
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
      cell: ({ row }) => <div className="text-center">{getCostCategoryLabel(row.original.learning_method)}</div>,
    },
    {
      accessorKey: "skilling",
      header: () => <div className="text-center">Increase Skill</div>,
      cell: ({ row }) => (
        <div className="flex justify-evenly items-right w-full space-x-4">
          {[1, 5, 10].map((points) => (
            <Button
              key={points}
              className="flex-1 bg-black hover:bg-gray-300 hover:text-black text-white rounded-lg"
              onClick={() => try_increase_skill(row.original, points)}
            >
              {points}
            </Button>
          ))}
        </div>
      ),
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
