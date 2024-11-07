import { SkillsTable } from '../../components/Skill/SkillTable'
import  skillData  from '../../components/Skill/ExampleData'


export default function SkillsPage() {
  const skills = skillData;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Skills</h1>
      <SkillsTable data={skills} />
    </div>
  )
}