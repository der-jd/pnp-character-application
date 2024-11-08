'use client'

import { useEffect, useMemo, useState } from 'react'
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

import { CostCategory, ISkillProps } from './SkillDefinitions';

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

export function SkillsTable({ data: initialData, is_edit_mode }: { data: ISkillProps[], is_edit_mode: boolean}) {
  
  const [data, setData] = useState(initialData);
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    is_active: false,
    cost_category: false,
    cost: false,
    skilling: false,
  });

  const try_increase_skill = async(skill: ISkillProps, points_to_skill: number) => {
    // todo async call to api should happen here

    const new_level = skill.edited_level + points_to_skill
    const updatedData = data.map((item) => item.name === skill.name ? {...item, edited_level: new_level} : item);
    setData(updatedData);
  }

  // Memoize filteredData to prevent re-computation on every render
  const filteredData = useMemo(() => (
    showActiveOnly ? data.filter(skill => skill.is_active) : data
  ), [data, showActiveOnly]);

  const columns: ColumnDef<ISkillProps>[] = [
    {
      accessorKey: "name",
      header: () => <div className="text-left text-bold">Name</div>,
      cell: ({ row }) => <div className="font-medium p-1">{row.getValue("name")}</div>,
    },
    {
      accessorKey: "level",
      header: () => <div className="text-center">Level</div>,
      cell: ({ row }) => {
        const value = is_edit_mode ? row.original.edited_level : row.original.level
        return <div className="text-center">{value}</div>
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
      header: () => <div className="text-center">Cost Category</div>,
      cell: ({ row }) => <div className="text-center">{getCostCategoryLabel(row.original.cost_category)}</div>,
    },
    {
      accessorKey: "cost",
      header: () => <div className="text-right">Cost</div>,
      cell: ({ row }) => <div className="text-right">{row.getValue("cost")}</div>,
    },
    {
      accessorKey: "skilling",
      header: () => <div className="text-center">Increase Skill</div>,
      cell: ({ row }) => <div className="flex justify-evenly items-right w-full space-x-4">
          {[1, 5, 10].map((points) => (<Button key={points} className="flex-1 bg-black hover:bg-gray-300 hover:text-black text-white rounded-lg" onClick={() => try_increase_skill(row.original, points)}>{points}</Button>))}
      </div>
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    getRowCanExpand: () => true,
    state: {
      columnVisibility,
    },
  })

  useEffect(() => {
    setShowActiveOnly(!is_edit_mode);
    setColumnVisibility({
      ...columnVisibility,
      is_active: is_edit_mode,
      cost_category: is_edit_mode,
      cost: is_edit_mode,
      skilling: is_edit_mode,
    })

    if(!is_edit_mode) {
      // this is the changing of edit to not edit so edited level should be saved
      const updatedData = data.map((item) => ({...item, level : item.edited_level}));
      setData(updatedData);
    }
  }, [is_edit_mode]);

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-gray-300">
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