# Coding Guidelines

## Overview

This document defines the coding standards and best practices for the PnP Character Application project.

## Naming Conventions

### Variables, Functions, and Properties

- **Use camelCase** for all variables, functions, and object properties
- **No underscores** as prefixes or suffixes
- Use descriptive names that clearly indicate purpose

```typescript
// ✅ Good
const characterLevel = 5;
const calculateSkillCost = (skill: Skill) => { ... };
const isSkillActivated = skill.activated;

// ❌ Avoid
const character_level = 5;
const _calculateSkillCost = (skill: Skill) => { ... };
const isSkillActivated_ = skill.activated;
```

### Classes and Interfaces

- **Use PascalCase** for class names and interface names
- Interfaces should be descriptive without "I" prefix
- Use meaningful names that describe the entity

```typescript
// ✅ Good
class Character { ... }
interface SkillViewModel { ... }
interface CharacterRepository { ... }

// ❌ Avoid
class character { ... }
interface ISkillViewModel { ... }
interface Skill_View_Model { ... }
```

### Constants

- **Use SCREAMING_SNAKE_CASE** for module-level constants
- **Use camelCase** for local constants

```typescript
// ✅ Good
const MAX_SKILL_LEVEL = 20;
const API_BASE_URL = "https://api.example.com";

function calculateCost() {
  const baseCost = 10;
  // ...
}
```

## Type Safety

### Strict Typing

- **Always use explicit types** where TypeScript cannot infer them
- **Avoid `any` type** - use `unknown` if necessary and narrow with type guards
- **Use union types** instead of loose types
- **Enable strict mode** in tsconfig.json (already configured)

#### The `any` Type Rule

**NEVER use the `any` type** in production code. This rule is enforced by ESLint with `@typescript-eslint/no-explicit-any`.

```typescript
// ❌ Forbidden - Using any type
function processData(data: any): any {
  return data.someProperty;
}

const result: any = apiResponse;

// ✅ Correct - Use proper types from api-spec
import { Character, GetCharacterResponse } from "api-spec";

function processCharacter(character: Character): string {
  return character.generalInformation.name;
}

const result: GetCharacterResponse = await apiClient.get("/characters/123");

// ✅ Correct - Use unknown for truly unknown data, then narrow
function processUnknownData(data: unknown): string {
  if (typeof data === "object" && data !== null && "name" in data) {
    return (data as { name: string }).name;
  }
  throw new Error("Invalid data structure");
}

// ✅ Correct - Use type assertions only when absolutely necessary
const input = formData as CreateCharacterInput; // Only when you're certain of the type
```

**Exceptions:** The `any` type may only be used in:

1. **Test files** for mocking complex objects that don't need full type compliance
2. **Type assertion contexts** where you need to cast between incompatible types temporarily
3. **Legacy code migration** with a clear plan and timeline to remove it

**Alternatives to `any`:**

- Use `unknown` for truly unknown data and narrow with type guards
- Use proper types from the `api-spec` package for API data
- Use union types (`string | number`) for known possibilities
- Use generic types (`<T>`) for reusable components
- Use `object` or `Record<string, unknown>` for generic objects

```typescript
// ✅ Good
interface SkillUpdateRequest {
  skillName: string;
  points: number;
  learningMethod: LearningMethod;
}

function updateSkill(request: SkillUpdateRequest): Promise<SkillUpdateResult> {
  // ...
}

// ❌ Avoid
function updateSkill(request: any): any {
  // ...
}
```

### Null Safety

- **Use strict null checks** (enabled in tsconfig)
- **Prefer optional properties** over null/undefined unions where appropriate
- **Use nullish coalescing** (`??`) and optional chaining (`?.`)

```typescript
// ✅ Good
interface Character {
  name: string;
  level?: number; // Optional property
}

const displayLevel = character.level ?? 1;
const skillName = character.skills?.combat?.swordFighting?.name;

// ❌ Avoid
interface Character {
  name: string;
  level: number | null | undefined;
}
```

### Generic Types

- **Use meaningful generic type names** beyond just `T`
- **Constrain generics** when possible

```typescript
// ✅ Good
interface Repository<TEntity, TKey extends string | number> {
  findById(id: TKey): Promise<TEntity | null>;
}

class CharacterService<TCharacter extends Character> {
  // ...
}

// ❌ Avoid
interface Repository<T, U> {
  findById(id: U): Promise<T | null>;
}
```

## Code Formatting

### Prettier Configuration

- **Use the project's .prettierrc** configuration
- **Line width**: 120 characters
- **Run prettier** before committing code

```bash
# Format all files
npm run format

# Check formatting
npm run format:check
```

### Import Organization

- **Group imports** in this order:
  1. External libraries (React, etc.)
  2. Internal modules (api-spec, domain classes)
  3. Relative imports
- **Use absolute imports** where configured in tsconfig paths

```typescript
// ✅ Good
import React from "react";
import { Button } from "@radix-ui/react-button";

import { Character, Skill } from "api-spec";
import { CharacterService } from "@lib/services/CharacterService";

import { SkillRow } from "./SkillRow";
import "./styles.css";
```

## Architecture Patterns

### Backend-First Architecture

- **Frontend is presentation layer only** - no business logic calculations
- **All skill calculations, character updates, and game logic** happen via backend API
- **Frontend displays data and collects user input** but delegates all processing to backend
- **Use API calls for any character state changes** (skill increases, attribute updates, etc.)

```typescript
// ❌ Avoid - Business logic in frontend
const newSkillValue = character.skills.swordFighting + increaseAmount;
const cost = calculateSkillIncreaseCost(character, increaseAmount);

// ✅ Good - Delegate to backend API
const result = await characterService.increaseSkill(characterId, "swordFighting", increaseAmount);
if (result.success) {
  // Update UI with response from backend
  setCharacter(result.data.character);
}
```

### Domain-Driven Design

- **Encapsulate business logic** in domain classes
- **Keep components pure** - no business logic in React components
- **Use services** for external interactions (API calls)

```typescript
// ✅ Good - Domain class with business logic
export class Character {
  canIncreaseSkill(skillName: string): boolean {
    return this.availablePoints >= this.getSkillIncreaseCost(skillName);
  }
}

// ✅ Good - Pure component
export function SkillRow({ skill, onIncrease }: SkillRowProps) {
  return <div>{skill.name} <Button onClick={() => onIncrease(1)}>+</Button></div>;
}
```

### Error Handling

- **Use Result types** or proper error boundaries
- **Handle errors at appropriate levels**
- **Provide meaningful error messages**

```typescript
// ✅ Good
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

async function loadCharacter(id: string): Promise<Result<Character>> {
  try {
    const character = await characterService.getById(id);
    return { success: true, data: character };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
```

## File Organization

### Folder Structure

```
src/
├── lib/
│   ├── domain/           # Business logic classes
│   ├── services/         # External service interactions
│   ├── stores/          # State management
│   ├── components/      # UI components
│   └── utils/          # Pure utility functions
├── hooks/               # Custom React hooks
└── app/                # Next.js app router
```

### File Naming

- **Use camelCase** for file names
- **Use descriptive names** that match the main export
- **Group related files** in folders

```
characterService.ts     // Main service class
skillViewModel.ts       // ViewModel class
useSkillUpdater.ts     // Custom hook
```

## Testing Guidelines

### Test File Naming

- **Use .test.ts or .spec.ts** suffix
- **Mirror the source file structure**

```
src/lib/domain/Character.ts
src/lib/domain/Character.test.ts
```

### Test Structure

- **Use descriptive test names**
- **Follow Arrange-Act-Assert pattern**
- **Test business logic in domain classes thoroughly**

```typescript
describe("Character", () => {
  describe("canIncreaseSkill", () => {
    it("should return true when character has sufficient points", () => {
      // Arrange
      const character = new Character(mockCharacterData);

      // Act
      const result = character.canIncreaseSkill("swordFighting");

      // Assert
      expect(result).toBe(true);
    });
  });
});
```

## Performance Guidelines

### React Components

- **Use React.memo** for expensive components
- **Memoize callbacks** with useCallback
- **Memoize computed values** with useMemo

### State Management

- **Use computed properties** in stores
- **Avoid unnecessary re-renders**
- **Keep state normalized**

## Documentation

### JSDoc Comments

- **Document public APIs** and complex business logic
- **Include parameter and return types**
- **Provide usage examples** for complex functions

````typescript
/**
 * Calculates the cost to increase a skill by the specified number of points.
 *
 * @param skillName - The name of the skill to increase
 * @param points - The number of points to increase (must be positive)
 * @param learningMethod - The learning method affecting cost
 * @returns The total cost in adventure points
 *
 * @example
 * ```typescript
 * const cost = character.calculateSkillIncreaseCost('swordFighting', 2, LearningMethod.NORMAL);
 * console.log(`Cost: ${cost} AP`);
 * ```
 */
calculateSkillIncreaseCost(skillName: string, points: number, learningMethod: LearningMethod): number {
  // Implementation
}
````

---

## Enforcement

These guidelines are enforced through:

- **TypeScript compiler** (strict mode enabled)
- **Prettier** for code formatting
- **ESLint** for code quality
- **Code reviews** for architectural compliance

## References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn)
- [Clean Code Principles](https://blog.cleancoder.com/)

# Creation of files and resources

- check first if there is something existing and use that if possible
- try the simpler solutions first
- dont use any icons inside of the files
- if you want to use icons use oldschool hacker style ascii characters insteaad
- if we decide on another approach or if i correct you on something clean up after you dont just leave unused files
