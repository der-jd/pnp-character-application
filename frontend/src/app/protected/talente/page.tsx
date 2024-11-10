'use client'

import { Button } from '@/components/ui/button';
import  skillData  from '../../components/Skill/ExampleData'
import { exampleBaseValues, exampleProperties}  from '../../components/Properties/ExampleData'
import SkillCategory from '../../components/Skill/SkillCategory';
import { PropertiesTable } from "../../components/Properties/ProtpertiesTable"
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
      <div className="space-x-2 py-2">
        <Button variant="outline" className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg" onClick={toggle_edit_mode}>{isEditMode ? "Save" : "Edit"}</Button>
        { isEditMode ? <Button variant="outline" className="bg-black font-bold text-white hover:bg-gray-300 rounded-lg" onClick={discard_values}>Discard</Button> : null}
      </div>
      <div className="flex flex-wrap -m-4">
        <div className="rounded-lg w-1/2 p-4">
          <h2 className="p-1 text-xl font-semibold rounded-t-lg bg-black text-white">Eigenschaften</h2>
          <PropertiesTable data={exampleProperties} is_edit_mode={isEditMode}/>
        </div>  
        <div className="rounded-lg w-1/2 p-4">
          <h2 className="p-1 text-xl font-semibold rounded-t-lg bg-black text-white">Basiswerte</h2>
          <PropertiesTable data={exampleBaseValues} is_edit_mode={isEditMode}/>
        </div>     
      </div>
        <SkillCategory data={skills} isEditMode={isEditMode} />
      </div>
  )
}