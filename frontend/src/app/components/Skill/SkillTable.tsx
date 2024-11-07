'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

export enum CostCategory {
  FREE,
  LOW_PRICED,
  NORMAL,
  EXPENSIVE,
}

const getCostCategoryLabel = (category: CostCategory): string => {
  switch (category) {
    case CostCategory.FREE:
      return 'Free';
    case CostCategory.LOW_PRICED:
      return 'Low';
    case CostCategory.NORMAL:
      return 'Normal';
    case CostCategory.EXPENSIVE:
      return 'Expensive';
    default:
      return '';
  }
};

export interface ISkillProps {
  name: string;
  category: string;
  level: number;
  is_active: boolean;
  cost_category: CostCategory;
  cost: number;
  is_edited: boolean;
  edited_level: number;
}

export function SkillsTable({ data: initialData }: { data: ISkillProps[] }) {
  const [data, setData] = useState(initialData)
  const [isEditMode, setIsEditMode] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    is_active: false,
    cost_category: false,
    cost: false,
  })

  const columns: ColumnDef<ISkillProps>[] = [
    {
      accessorKey: "name",
      header: () => <div className="text-left">Name</div>,
      cell: ({ row }) => <div className="font-medium p-1">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "level",
      header: () => <div className="text-right">Level</div>,
      cell: ({ row }) => {
        const value = isEditMode ? row.original.edited_level : row.original.level
        return <div className="text-right">{value}</div>
      },
    },
    {
      id: "is_active",
      header: () => <div className="text-center">Active</div>,
      cell: ({ row }) => {
        const skill = row.original
        return (
          <div className="text-center">
            <Checkbox
              checked={skill.is_active}
              onCheckedChange={(checked) => {
                if (checked === true) {
                  const updatedData = data.map((item) =>
                    item.name === skill.name ? { ...item, is_active: true } : item
                  )
                  setData(updatedData)
                }
              }}
              aria-label={`Set ${skill.name} as active`}
              disabled={skill.is_active}
            />
          </div>
        )
      },
    },
    {
      accessorKey: "cost_category",
      header: "Cost Category",
      cell: ({ row }) => getCostCategoryLabel(row.original.cost_category),
    },
    {
      accessorKey: "cost",
      header: () => <div className="text-right">Cost</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("cost")}</div>,
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    getRowCanExpand: () => true,
    state: {
      columnVisibility,
    },
  })

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode)
    setColumnVisibility({
      ...columnVisibility,
      is_active: !isEditMode,
      cost_category: !isEditMode,
      cost: !isEditMode,
    })
  }

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Button variant="outline" size="sm" onClick={toggleEditMode}>
          {isEditMode ? "Save" : "Edit"}
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className={header.column.id === "actions" ? "text-right" : ""}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
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
                    <TableCell key={cell.id}>
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
  )
}