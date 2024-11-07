import  skillData  from '../../components/Skill/ExampleData'
import SkillCategory from '../../components/Skill/SkillCategory';


export default function SkillsPage() {
  const skills = skillData;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-5">Skills</h1>
      <SkillCategory data={skills} />
    </div>
  )
}