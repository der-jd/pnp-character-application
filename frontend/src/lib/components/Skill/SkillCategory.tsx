"use client";

import React from "react";

import { ISkillProps } from "./SkillDefinitions";
import { SkillsTable } from "./SkillTable";

interface SkillCategoryProps {
  data: ISkillProps[];
}

const SkillCategory = ({ data }: SkillCategoryProps) => {
  if (!data) {
    return <div />;
  }

  const groupedSkills = data.reduce(
    (acc, skill) => {
      const category = skill.category;
      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(skill);
      return acc;
    },
    {} as Record<string, ISkillProps[]>
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
    <div className="flex flex-wrap m-4 rounded-lg shadow-lg">
      {skillsInOrder.map(({ category, skills }) => (
        <div key={category} className="w-1/2 p-4 rounded-lg">
          <div className="">
            <h2 className="p-1 text-xl font-semibold rounded-t-lg bg-black text-white">
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </h2>
            <SkillsTable initialData={skills} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default SkillCategory;
