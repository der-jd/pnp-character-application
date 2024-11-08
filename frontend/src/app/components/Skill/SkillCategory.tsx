
'use client'

import React, { useState } from 'react'

import { ISkillProps } from './SkillDefinitions';
import { SkillsTable } from "./SkillTable";


interface SkillCategoryProps {
    data: ISkillProps[];
    isEditMode: boolean;
}
  
const SkillCategory = ({ data, isEditMode }: SkillCategoryProps) => {

    const groupedSkills = data.reduce((acc, skill) => {
        const category = skill.category;
        if (!acc[category]) {
            acc[category] = [];
        }

        acc[category].push(skill);
        return acc;

    }, {} as Record<string, ISkillProps[]>);

    return (
        <div>
            {Object.entries(groupedSkills).map(([category, skills]) => (
            <div key={category} className="py-2">
                <h2 className="text-xl font-semibold">{category}</h2>
                <SkillsTable data={skills} is_edit_mode={isEditMode}/>
            </div>
            ))}
        </div>
    );
};


export default SkillCategory;