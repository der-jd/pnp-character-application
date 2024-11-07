import React from 'react';
import Skill from './Skill';
import skillData from './ExampleData'; 

const SkillList: React.FC = () => {
  return (
    <div className="container mx-auto max-w-4xl">
      {skillData.map((skill, index) => (
        <Skill key={index} {...skill} />
      ))}
    </div>
  );
};

export default SkillList;
