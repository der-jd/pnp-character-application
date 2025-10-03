import type { Skill, CostCategory, CharacterSheet } from "api-spec";

export interface SkillViewModel {
  readonly name: string;
  readonly category: string;
  readonly displayName: string;
  readonly currentLevel: number;
  readonly startLevel: number;
  readonly modifier: number;
  readonly isActivated: boolean;
  readonly totalCost: number;
  readonly defaultCostCategory: CostCategory;
  readonly icon?: React.ComponentType;
}

/**
 * Collection class for managing character skills with business logic
 */
export class SkillCollection {
  constructor(private skills: CharacterSheet['skills']) {}

  /**
   * Gets all skills flattened into a single array with view models
   */
  getAllSkills(): SkillViewModel[] {
    const skillViewModels: SkillViewModel[] = [];
    
    // Helper function to process a skill category
    const processCategory = (categoryName: string, categorySkills: Record<string, Skill>) => {
      Object.entries(categorySkills).forEach(([skillName, skill]) => {
        skillViewModels.push(this.createSkillViewModel(skillName, categoryName, skill));
      });
    };

    // Process all skill categories
    processCategory('combat', this.skills.combat);
    processCategory('body', this.skills.body);
    processCategory('social', this.skills.social);
    processCategory('nature', this.skills.nature);
    processCategory('knowledge', this.skills.knowledge);
    processCategory('handcraft', this.skills.handcraft);

    return skillViewModels;
  }

  /**
   * Gets skills for a specific category
   */
  getByCategory(category: keyof CharacterSheet['skills']): SkillViewModel[] {
    const categorySkills = this.skills[category];
    return Object.entries(categorySkills).map(([skillName, skill]) => 
      this.createSkillViewModel(skillName, category, skill)
    );
  }

  /**
   * Gets a specific skill
   */
  getSkill(category: string, skillName: string): SkillViewModel | null {
    const categorySkills = this.skills[category as keyof CharacterSheet['skills']];
    if (!categorySkills || !categorySkills[skillName as keyof typeof categorySkills]) {
      return null;
    }
    return this.createSkillViewModel(skillName, category, categorySkills[skillName as keyof typeof categorySkills]);
  }



  /**
   * Gets only activated skills
   */
  getActivatedSkills(): SkillViewModel[] {
    return this.getAllSkills().filter(skill => skill.isActivated);
  }



  private createSkillViewModel(name: string, category: string, skill: Skill): SkillViewModel {
    return {
      name,
      category,
      displayName: this.formatSkillName(name),
      currentLevel: skill.current,
      startLevel: skill.start,
      modifier: skill.mod,
      isActivated: skill.activated,
      totalCost: skill.totalCost,
      defaultCostCategory: skill.defaultCostCategory,
      // icon: getSkillIcon(category, name) // You can implement this later
    };
  }

  private getSkillData(category: string, skillName: string): Skill | null {
    const categorySkills = this.skills[category as keyof CharacterSheet['skills']];
    return categorySkills?.[skillName as keyof typeof categorySkills] || null;
  }

  private formatSkillName(name: string): string {
    // Convert camelCase to readable format
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
}

