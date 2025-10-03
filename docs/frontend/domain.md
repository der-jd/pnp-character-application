# Domain Layer

The Domain Layer contains the core business entities and domain logic for the PnP Character Application. This layer is the heart of the application and contains the most important business rules.

## Purpose

- Define core business entities (Character, Skills, Attributes, etc.)
- Encapsulate business logic and invariants
- Provide a rich domain model with behavior, not just data
- Remain independent of external concerns (UI, databases, APIs)

## Key Components

### Character.ts
The main domain entity representing a player character.

```typescript
export class Character {
  // Encapsulates character data and behavior
  // Provides methods for character operations
  // Maintains business invariants
}
```

**Responsibilities:**
- Encapsulate character data and state
- Provide methods for character operations (level up, attribute changes, etc.)
- Validate business rules and constraints
- Calculate derived values (combat stats, skill totals, etc.)

### Skills.ts
Domain model for character skills and skill management.

```typescript
export class SkillCollection {
  // Manages character skills
  // Handles skill increases and validations
}
```

**Responsibilities:**
- Manage character skill collections
- Handle skill increase calculations
- Validate skill constraints and prerequisites
- Calculate skill-related derived values

### Attributes.ts
Domain model for character attributes (Courage, Cleverness, etc.).

```typescript
export class AttributeCollection {
  // Manages character attributes
  // Handles attribute modifications
}
```

**Responsibilities:**
- Manage character attributes
- Handle attribute modifications and validations
- Calculate attribute-based derived values
- Enforce attribute constraints

### BaseValues.ts
Domain model for character base values (Life Points, Astral Points, etc.).

```typescript
export class BaseValueCollection {
  // Manages character base values
  // Handles base value calculations
}
```

**Responsibilities:**
- Manage character base values
- Calculate base values from attributes
- Handle base value modifications
- Maintain base value relationships

### CombatValues.ts
Domain model for combat-related values (Attack, Parade, Initiative).

```typescript
export class CombatValueCollection {
  // Manages combat values
  // Handles combat calculations
}
```

**Responsibilities:**
- Manage combat-related values
- Calculate combat values from attributes and skills
- Handle combat value modifications
- Validate combat constraints

## Design Principles

### Rich Domain Model
- Entities contain behavior, not just data
- Business logic is encapsulated within domain objects
- Objects maintain their own invariants

### Domain-Driven Design
- Models reflect the ubiquitous language of the PnP game system
- Complex business rules are expressed clearly in code
- Domain concepts are explicit and well-defined

### Immutability Where Appropriate
- Value objects are immutable
- State changes go through controlled methods
- Prevents accidental state corruption

## Usage Examples

### Creating a Character
```typescript
// Character creation with validation
const character = Character.create(userId, characterData);
```

### Skill Operations
```typescript
// Increase a skill with business rule validation
character.increaseSkill(skillId, targetValue);

// Get skill increase cost
const cost = character.getSkillIncreaseCost(skillId, targetValue);
```

### Attribute Management
```typescript
// Modify attributes with constraints
character.updateAttribute(attributeId, newValue);

// Get calculated values
const derivedStats = character.getCalculatedStats();
```

## Testing Strategy

Domain entities are tested with:
- Unit tests for business logic
- Property-based testing for invariants
- Test scenarios covering edge cases
- Validation of business rules

## Dependencies

- **api-spec**: For type definitions and schema validation
- **No external dependencies**: Domain layer remains pure

## Integration

The domain layer is consumed by:
- **Application Layer**: Use cases orchestrate domain operations
- **Presentation Layer**: View models transform domain data for UI
- **Services Layer**: Maps between domain objects and external APIs

This layer forms the foundation of the application and should remain stable and well-tested as it contains the core business value.