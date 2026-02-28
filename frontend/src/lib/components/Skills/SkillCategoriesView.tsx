"use client";

import { useMemo } from "react";
import type { SkillViewModel } from "@/src/lib/domain/Skills";
import { SkillCategoryTable } from "./SkillCategoryTable";

interface SkillCategoriesViewProps {
  skills: SkillViewModel[];
  isEditMode: boolean;
  onSkillIncrease: (skill: SkillViewModel, points: number) => Promise<void>;
  onSkillActivate?: (skill: SkillViewModel, activated: boolean) => Promise<void>;
}

/**
 * Groups and displays skills by category
 * Pure presentational component - no business logic
 */
export function SkillCategoriesView({
  skills,
  isEditMode,
  onSkillIncrease,
  onSkillActivate,
}: SkillCategoriesViewProps) {
  // Group skills by category - MEMOIZE to prevent infinite loops
  const skillsByCategory = useMemo(() => {
    return skills.reduce(
      (acc, skill) => {
        const category = skill.category;
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(skill);
        return acc;
      },
      {} as Record<string, SkillViewModel[]>,
    );
  }, [skills]);

  // Sort categories by number of skills (descending) - MEMOIZE
  const sortedCategories = useMemo(() => {
    return Object.keys(skillsByCategory).sort((a, b) => {
      return skillsByCategory[b].length - skillsByCategory[a].length;
    });
  }, [skillsByCategory]);

  return (
    <div className="flex flex-wrap m-4 rounded-lg shadow-lg">
      {sortedCategories.map((category) => {
        const categorySkills = skillsByCategory[category];
        const displayName = category.charAt(0).toUpperCase() + category.slice(1);

        return (
          <div key={category} className="w-1/2 p-4 rounded-lg">
            <div>
              <h2 className="p-1 text-xl font-semibold rounded-t-lg bg-black text-white">{displayName}</h2>
              <SkillCategoryTable
                skills={categorySkills}
                categoryName={category}
                isEditMode={isEditMode}
                onSkillIncrease={onSkillIncrease}
                onSkillActivate={onSkillActivate}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
