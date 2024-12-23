"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ColumnDef, flexRender, getCoreRowModel, useReactTable, VisibilityState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { IBaseValue, IProperty, render_attribute_icon } from "./PropertiesDefinition";

export function PropertiesTable({
  data: initialData,
  is_edit_mode,
}: {
  data: IBaseValue[] | IProperty[];
  is_edit_mode: boolean;
}) {
  const [data, setData] = useState(initialData);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    skilling: false,
  });

  const try_increase_skill = async (skill: IBaseValue | IProperty, points_to_skill: number) => {
    // todo async call to api should happen here

    const new_level = skill.edited_level + points_to_skill;
    const updated_data = data.map((item) => (item.name === skill.name ? { ...item, edited_level: new_level } : item));

    setData(updated_data);
  };

  const columns: ColumnDef<IBaseValue | IProperty>[] = [
    {
      accessorKey: "icon",
      header: "",
      cell: ({ row }) => <div className="h-4 w-4 ">{render_attribute_icon(row.getValue("name"))}</div>,
    },
    {
      accessorKey: "name",
      header: () => <div className="text-left text-bold">Name</div>,
      cell: ({ row }) => <div className="font-medium p-1">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "level",
      header: () => <div className="text-center">Level</div>,
      cell: ({ row }) => {
        const value = is_edit_mode ? row.original.edited_level : row.original.level;
        return <div className="text-center">{value}</div>;
      },
    },
    {
      accessorKey: "skilling",
      header: () => <div className="text-center">Increase Skill</div>,
      cell: ({ row }) => (
        <div className="flex content-center space-x-4 w-full">
          {[1].map((points) => (
            <Button
              key={points}
              className="w-1/4 flex-1 bg-black hover:bg-gray-300 hover:text-black text-white rounded-lg"
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
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowCanExpand: () => true,
    state: {
      columnVisibility,
    },
  });

  useEffect(() => {
    setColumnVisibility((prevVisibility) => ({
      ...prevVisibility,
      skilling: is_edit_mode,
    }));
  }, [is_edit_mode]);

  useEffect(() => {
    setData((prevData) =>
      prevData.map((item) => ({
        ...item,
        level: item.edited_level,
      })),
    );
  }, [is_edit_mode]);

  return (
    <div className="">
      <div className="rounded-md border border-gray-300 border-2">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-300">
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
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="space-x-6">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
