export enum CostCategory {
  FREE,
  LOW_PRICED,
  NORMAL,
  EXPENSIVE,
}

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
