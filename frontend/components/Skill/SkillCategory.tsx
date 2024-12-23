"use client";

import React from "react";

import { ISkillProps } from "./SkillDefinitions";
import { SkillsTable } from "./SkillTable";

interface SkillCategoryProps {
  data: ISkillProps[];
  isEditMode: boolean;
}

const SkillCategory = ({ data, isEditMode }: SkillCategoryProps) => {
  const groupedSkills = data.reduce(
    (acc, skill) => {
      const category = skill.category;
      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(skill);
      return acc;
    },
    {} as Record<string, ISkillProps[]>,
  );

  const categories = Object.keys(groupedSkills).sort((a, b) => {
    const aSkillsCount = groupedSkills[a].length;
    const bSkillsCount = groupedSkills[b].length;
    return bSkillsCount - aSkillsCount;
  });

  const skillsInOrder = categories.map((category) => {
    const skills = groupedSkills[category];
    return { category, skills };
  });

  return (
    <div className="flex flex-wrap -m-4">
      {skillsInOrder.map(({ category, skills }) => (
        <div key={category} className="w-1/2 p-4">
          <div className="border border-gray-300 rounded-lg">
            <h2 className="p-1 text-xl font-semibold rounded-t-lg bg-black text-white">{category}</h2>
            <SkillsTable data={skills} is_edit_mode={isEditMode} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkillCategory;
