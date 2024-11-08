'use client'

import { Button } from '@/components/ui/button';
import  skillData  from '../../components/Skill/ExampleData'
import SkillCategory from '../../components/Skill/SkillCategory';
import { useState } from 'react';


export default function SkillsPage() {
  const skills = skillData;
  const [isEditMode, setEditMode] = useState(false);
  const toggle_edit_mode = () => setEditMode(!isEditMode);

  const discard_values = () => {
    setEditMode(false);
    const skills = skillData;
  }
  
  return (
    <div className="container mx-auto py-5">
      <div>
        <h1 className="text-2xl underline underline-offset-8 font-bold mb-5">Eigenschaften - Basiswerte</h1>
      <div>
        <h1 className="text-2xl underline underline-offset-8 font-bold mb-5">Skills</h1>
        <div className="space-x-2 py-2">
          <Button variant="outline" className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg" onClick={toggle_edit_mode}>{isEditMode ? "Save" : "Edit"}</Button>
          { isEditMode ? <Button variant="outline" className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg" onClick={discard_values}>Discard</Button> : null}
        </div>
        <SkillCategory data={skills} isEditMode={isEditMode} />
      </div>
      </div>
        
    </div>
  )
}