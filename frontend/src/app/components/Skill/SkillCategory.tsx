
import React, { useState, useEffect } from 'react'

import { CostCategory, ISkillProps } from './SkillDefinitions';
import { SkillsTable } from "./SkillTable";


interface SkillCategoryProps {
    data: ISkillProps[]; // This ensures 'data' is passed as a prop of the correct type
  }
  
  const SkillCategory = ({ data }: SkillCategoryProps) => {
    return (
      <div>
        <SkillsTable data={data}/>
      </div>
    );
  };
  
  export default SkillCategory;