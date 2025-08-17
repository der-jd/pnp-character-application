import { ColumnDef } from "@tanstack/react-table";
import { ICombatValue } from "./definitions";
import { Button } from "../button";

export const getCombatValueColumns = (): ColumnDef<ICombatValue>[] => [
  {
    accessorKey: "name",
    header: () => <div className="text-left font-bold">Name</div>,
    cell: ({ row }) => <div className="text-left font-medium">{row.getValue("name")}</div>,
  },
  {
    accessorKey: "attack",
    header: () => <div className="text-center">Attack</div>,
    cell: ({ row }) => <div>{row.getValue("attack")}</div>,
  },
  {
    accessorKey: "parry",
    header: () => <div className="text-center">Parry</div>,
    cell: ({ row }) => <div>{row.getValue("parry")}</div>,
  },
  {
    accessorKey: "handling",
    header: () => <div className="text-center">Handling</div>,
    cell: ({ row }) => <div>{row.getValue("handling")}</div>,
  },
  {
    accessorKey: "talent",
    header: () => <div className="text-center">Talent</div>,
    cell: ({ row }) => <div>{row.getValue("talent")}</div>,
  },
  {
    accessorKey: "freePoints",
    header: () => <div className="text-center font-bold">Free Points</div>,
    cell: ({ row }) => <div>{row.original.pointsAvailable}</div>,
  },
];

type CallbackFn = (name: string, key: string, amount: unknown) => void;

export const getEditColumns = (onIncrease: CallbackFn): ColumnDef<ICombatValue, unknown>[] => {
  return [
    {
      id: "edit_attack",
      header: () => "Edit Attack",
      cell: ({ row }) => {
        return (
          <div className="flex gap-1 justify-left">
            {[1, 5, 10].map((amount) => (
              <Button
                key={amount}
                className="bg-black text-white hover:bg-gray-300 hover:text-black px-2 py-1 text-sm"
                onClick={() => onIncrease(row.original.name, "attack", amount)}
              >
                +{amount}
              </Button>
            ))}
          </div>
        );
      },
    },
    {
      id: "edit_parry",
      header: () => "Edit Parry",
      cell: ({ row }) => {
        if (row.original.type !== "melee") return null;
        return (
          <div className="flex gap-1 justify-left">
            {[1, 5, 10].map((amount) => (
              <Button
                key={amount}
                className="bg-black text-white hover:bg-gray-300 hover:text-black px-2 py-1 text-sm"
                onClick={() => onIncrease(row.original.name, "parry", amount)}
              >
                +{amount}
              </Button>
            ))}
          </div>
        );
      },
    },
  ];
};
