'use client'

import { Button } from '@/components/ui/button';
import  skillData  from '../../components/Skill/ExampleData'
import SkillCategory from '../../components/Skill/SkillCategory';
import { useState } from 'react';


export default function SkillsPage() {
  const skills = skillData;
  const [isEditMode, setEditMode] = useState(false);
  const toggle_edit_mode = () => setEditMode(!isEditMode);
  
  return (
    <div className="container mx-auto py-10">
        <div className="space-x-2">
          <Button variant="outline" className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg" onClick={toggle_edit_mode}>{isEditMode ? "Save" : "Edit"}</Button>
          { isEditMode ? <Button variant="outline" className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg">Discard</Button> : null}
      </div>
      <h1 className="text-2xl font-bold mb-5">Skills</h1>
      <SkillCategory data={skills} isEditMode={isEditMode} />
    </div>
  )
}