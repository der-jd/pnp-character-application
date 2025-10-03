# Application Layer

The Application Layer orchestrates business operations and coordinates between the domain layer and external services. This layer contains use cases that represent specific application scenarios.

## Purpose

- Orchestrate complex business operations
- Coordinate between domain entities and external services
- Implement application-specific business workflows
- Handle cross-cutting concerns (logging, validation, error handling)
- Maintain application state and business invariants

## Key Components

### Use Cases

Use cases represent specific user actions or business scenarios. Each use case encapsulates a complete business operation.

#### Character Management Use Cases

**CreateCharacterUseCase.ts**
```typescript
export class CreateCharacterUseCase implements UseCase<CreateCharacterInput, CreateCharacterOutput> {
  // Creates new character with validation
  // Handles business rules for character creation
}
```

**LoadCharacterUseCase.ts**
```typescript
export class LoadCharacterUseCase implements UseCase<LoadCharacterInput, LoadCharacterOutput> {
  // Loads character data
  // Transforms from API format to domain model
}
```

**LoadAllCharactersUseCase.ts**
```typescript
export class LoadAllCharactersUseCase implements UseCase<LoadAllCharactersInput, LoadAllCharactersOutput> {
  // Loads all characters for a user
  // Handles pagination and filtering
}
```

**CloneCharacterUseCase.ts**
```typescript
export class CloneCharacterUseCase implements UseCase<CloneCharacterInput, CloneCharacterOutput> {
  // Creates a copy of existing character
  // Handles cloning business rules
}
```

#### Character Development Use Cases

**LevelUpUseCase.ts**
```typescript
export class LevelUpUseCase implements UseCase<LevelUpInput, LevelUpOutput> {
  // Handles character level progression
  // Calculates point gains and applies level-up effects
  // Records level change in history
}
```

**IncreaseSkillUseCase.ts**
```typescript
export class IncreaseSkillUseCase implements UseCase<IncreaseSkillInput, IncreaseSkillOutput> {
  // Manages skill improvements
  // Calculates costs and validates constraints
  // Updates character and records in history
}
```

**UpdateAttributeUseCase.ts**
```typescript
export class UpdateAttributeUseCase implements UseCase<UpdateAttributeInput, UpdateAttributeOutput> {
  // Handles attribute modifications
  // Validates attribute constraints
  // Updates derived values
}
```

**UpdateBaseValueUseCase.ts**
```typescript
export class UpdateBaseValueUseCase implements UseCase<UpdateBaseValueInput, UpdateBaseValueOutput> {
  // Manages base value changes (Life Points, etc.)
  // Validates business rules
}
```

**UpdateCombatValueUseCase.ts**
```typescript
export class UpdateCombatValueUseCase implements UseCase<UpdateCombatValueInput, UpdateCombatValueOutput> {
  // Handles combat value modifications
  // Maintains combat value relationships
}
```

**UpdateCalculationPointsUseCase.ts**
```typescript
export class UpdateCalculationPointsUseCase implements UseCase<UpdateCalculationPointsInput, UpdateCalculationPointsOutput> {
  // Manages character point calculations
  // Handles point redistribution
}
```

**AddSpecialAbilityUseCase.ts**
```typescript
export class AddSpecialAbilityUseCase implements UseCase<AddSpecialAbilityInput, AddSpecialAbilityOutput> {
  // Adds special abilities to characters
  // Validates prerequisites and constraints
}
```

#### History Management Use Cases

**LoadHistoryUseCase.ts**
```typescript
export class LoadHistoryUseCase implements UseCase<LoadHistoryInput, LoadHistoryOutput> {
  // Loads character development history
  // Formats history for presentation
}
```

**DeleteHistoryEntryUseCase.ts**
```typescript
export class DeleteHistoryEntryUseCase implements UseCase<DeleteHistoryEntryInput, DeleteHistoryEntryOutput> {
  // Removes history entries
  // Handles cascading effects of history deletion
}
```

### Application Services

**CharacterApplicationService.ts**
Application service that coordinates multiple use cases and provides a higher-level API for character operations.

```typescript
export class CharacterApplicationService {
  // Coordinates multiple use cases
  // Provides transaction boundaries
  // Handles complex workflows
}
```

### Interfaces and Types

**interfaces.ts**
```typescript
export interface UseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput>>;
}

// Input/Output types for each use case
export interface LevelUpInput { /* ... */ }
export interface LevelUpOutput { /* ... */ }
```

## Design Principles

### Use Case Pattern
- Each use case represents a single business operation
- Use cases are independent and composable
- Clear input/output contracts

### Result Pattern
- All operations return `Result<T>` for explicit error handling
- Success and error states are type-safe
- No throwing exceptions for business logic errors

### Dependency Injection
- Use cases depend on abstractions (interfaces)
- Services are injected via constructor
- Easy to test and mock dependencies

## Usage Examples

### Executing a Use Case
```typescript
// Inject dependencies
const useCase = new LevelUpUseCase(characterService);

// Execute with proper error handling
const result = await useCase.execute({
  characterId: 'char-123',
  newLevel: 2
});

if (result.success) {
  // Handle success
  console.log('Character leveled up:', result.value);
} else {
  // Handle error
  console.error('Level up failed:', result.error);
}
```

### Composing Use Cases
```typescript
// Application service coordinates multiple use cases
class CharacterApplicationService {
  async levelUpAndAddAbility(characterId: string, newLevel: number, abilityId: string) {
    const levelUpResult = await this.levelUpUseCase.execute({ characterId, newLevel });
    if (!levelUpResult.success) return levelUpResult;
    
    const abilityResult = await this.addAbilityUseCase.execute({ characterId, abilityId });
    return abilityResult;
  }
}
```

## Testing Strategy

### Use Case Testing
```typescript
describe('LevelUpUseCase', () => {
  it('should level up character successfully', async () => {
    // Arrange
    const mockCharacterService = createMockCharacterService();
    const useCase = new LevelUpUseCase(mockCharacterService);
    
    // Act
    const result = await useCase.execute({ characterId: 'test', newLevel: 2 });
    
    // Assert
    expect(result.success).toBe(true);
  });
});
```

### Integration Testing
- Test use case interactions with real services
- Verify complete business workflows
- Test error handling and edge cases

## Dependencies

- **Domain Layer**: Uses domain entities and services
- **Services Layer**: Calls external services for data persistence
- **api-spec**: Uses types for consistency with backend
- **types/result**: For error handling patterns

## Integration Points

### Consumed By
- **Presentation Layer**: View models call use cases
- **React Components**: Direct use case invocation
- **API Handlers**: Server-side use case execution

### Consumes
- **Domain Entities**: Operates on domain objects
- **Services**: Calls infrastructure services
- **External APIs**: Via service layer abstraction

The Application Layer serves as the coordination point for all business operations, ensuring that complex workflows are handled correctly while maintaining separation between domain logic and infrastructure concerns.