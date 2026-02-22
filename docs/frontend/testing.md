# Testing Documentation

This document covers the testing strategy and implementation for the PnP Character Application frontend, focusing on ensuring code quality, reliability, and API compatibility.

## Testing Philosophy

Our testing approach follows these principles:

- **Test the behavior, not the implementation**
- **Focus on user-facing functionality**
- **Ensure API compatibility between frontend and backend**
- **Maintain high confidence in deployments**
- **Keep tests maintainable and fast**

## Testing Strategy Overview

```
Testing Pyramid:
    ┌─────────────────┐
    │   E2E Tests     │  (Few - High confidence, slow)
    │   (Planned)     │
    ├─────────────────┤
    │ Integration     │  (Some - Component interactions)
    │ Tests           │
    ├─────────────────┤
    │   Unit Tests    │  (Many - Fast, isolated)
    └─────────────────┘

API Schema Validation:
    ┌─────────────────┐
    │ Breaking Change │  (Prevent deployment issues)
    │ Detection       │
    └─────────────────┘
```

## API Schema Validation Testing

Our primary testing focus is **API Schema Validation** to ensure frontend-backend compatibility.

### What is API Schema Validation?

Instead of traditional contract testing (like Pact), we validate that:

- Frontend requests match the expected API schema
- Backend responses conform to the expected schema
- Schema changes are detected before they break the application

### Key Test File: level-up-api-schema-validation.test.ts

```typescript
describe("Level-Up Endpoint: API-Spec Schema Validation", () => {
  describe("Request Schema Validation", () => {
    it("should validate valid level-up requests pass schema validation", () => {
      const validRequest: PostLevelRequest = {
        initialLevel: 2, // Correct field name from api-spec
      };

      const result = postLevelRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });
});
```

### Test Categories

#### 1. Request Schema Validation

Ensures frontend sends correctly formatted requests:

```typescript
it("should validate valid level-up requests pass schema validation", () => {
  const validRequest: PostLevelRequest = {
    initialLevel: 2,
  };

  const result = postLevelRequestSchema.safeParse(validRequest);
  expect(result.success).toBe(true);
});
```

#### 2. Breaking Change Detection

Catches when API schema changes break existing code:

```typescript
it("should detect breaking changes: required field removal", () => {
  const invalidRequest = {
    // Missing required field - this should fail
  };

  const result = postLevelRequestSchema.safeParse(invalidRequest);
  expect(result.success).toBe(false);
});
```

#### 3. Response Schema Validation

Validates backend responses match expected format:

```typescript
it("should validate expected backend responses", () => {
  const expectedResponse: UpdateLevelResponse = {
    characterId: "char-123",
    userId: "user-001-perfect-length-for-api-spec-val",
    level: {
      old: { value: 1 },
      new: { value: 2 },
    },
  };

  const result = updateLevelResponseSchema.safeParse(expectedResponse);
  expect(result.success).toBe(true);
});
```

#### 4. Real API Integration Testing

Tests against actual LocalStack infrastructure:

```typescript
it("should test schema validation against real AWS Lambda + API Gateway", async () => {
  const validRequest: PostLevelRequest = { initialLevel: 2 };

  const response = await fetch(API_ENDPOINT, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(validRequest),
  });

  // Test actual API responses against schema
  const responseData = await response.json();
  const schemaResult = updateLevelResponseSchema.safeParse(responseData);

  expect(schemaResult.success).toBe(true);
});
```

## Unit Testing Strategy

### Domain Layer Testing

```typescript
describe("Character Domain Entity", () => {
  it("should calculate skill increase cost correctly", () => {
    const character = Character.create(mockCharacterData);
    const cost = character.getSkillIncreaseCost("archery", 12);

    expect(cost).toBe(expectedCost);
  });

  it("should validate attribute constraints", () => {
    const character = Character.create(mockCharacterData);

    expect(() => character.updateAttribute("courage", -1)).toThrow("Attribute value must be positive");
  });
});
```

### Application Layer Testing

```typescript
describe("LevelUpUseCase", () => {
  let useCase: LevelUpUseCase;
  let mockCharacterService: jest.Mocked<CharacterService>;

  beforeEach(() => {
    mockCharacterService = createMockCharacterService();
    useCase = new LevelUpUseCase(mockCharacterService);
  });

  it("should level up character successfully", async () => {
    // Arrange
    mockCharacterService.levelUp.mockResolvedValue(ResultSuccess(mockUpdatedCharacter));

    // Act
    const result = await useCase.execute({
      characterId: "char-123",
      newLevel: 2,
    });

    // Assert
    expect(result.success).toBe(true);
    expect(mockCharacterService.levelUp).toHaveBeenCalledWith("char-123", 2);
  });

  it("should handle level up failures", async () => {
    // Arrange
    mockCharacterService.levelUp.mockResolvedValue(ResultError("Character not found"));

    // Act
    const result = await useCase.execute({
      characterId: "invalid-id",
      newLevel: 2,
    });

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe("Character not found");
  });
});
```

### Services Layer Testing

```typescript
describe("CharacterService", () => {
  let characterService: CharacterService;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = createMockApiClient();
    characterService = new CharacterService(mockApiClient);
  });

  it("should get character successfully", async () => {
    // Arrange
    const mockApiResponse = { character: mockApiCharacter };
    mockApiClient.get.mockResolvedValue(ResultSuccess(mockApiResponse));

    // Act
    const result = await characterService.getCharacter("char-123");

    // Assert
    expect(result.success).toBe(true);
    expect(result.value).toBeInstanceOf(Character);
    expect(mockApiClient.get).toHaveBeenCalledWith("/characters/char-123");
  });

  it("should handle API errors gracefully", async () => {
    // Arrange
    mockApiClient.get.mockResolvedValue(ResultError({ type: "NetworkError", message: "Connection failed" }));

    // Act
    const result = await characterService.getCharacter("char-123");

    // Assert
    expect(result.success).toBe(false);
    expect(result.error.type).toBe("NetworkError");
  });
});
```

### Presentation Layer Testing

```typescript
describe("SkillsPageViewModel", () => {
  let viewModel: SkillsPageViewModel;
  let mockCharacterService: jest.Mocked<CharacterService>;

  beforeEach(() => {
    mockCharacterService = createMockCharacterService();
    viewModel = new SkillsPageViewModel(mockCharacterService);
  });

  it("should toggle edit mode", () => {
    expect(viewModel.isEditMode).toBe(false);

    viewModel.toggleEditMode();

    expect(viewModel.isEditMode).toBe(true);
  });

  it("should format skill values correctly", () => {
    const formattedValue = viewModel.formatSkillValue(15);

    expect(formattedValue).toBe("15 (TaW)");
  });

  it("should handle skill increase", async () => {
    // Arrange
    mockCharacterService.updateSkill.mockResolvedValue(ResultSuccess(mockUpdatedCharacter));

    // Act
    await viewModel.onSkillIncrease("archery", 12);

    // Assert
    expect(mockCharacterService.updateSkill).toHaveBeenCalledWith(mockCharacter.id, "archery", 12);
  });
});
```

## Testing Utilities and Helpers

### Mock Factories

```typescript
// Mock character data
export const createMockCharacter = (overrides?: Partial<CharacterData>): Character => {
  const defaultData = {
    id: "char-123",
    name: "Test Character",
    level: 1,
    attributes: { courage: 10, cleverness: 12 },
    skills: { archery: 8, swords: 10 },
  };

  return Character.fromApiData({ ...defaultData, ...overrides });
};

// Mock services
export const createMockCharacterService = (): jest.Mocked<CharacterService> => {
  return {
    getCharacter: jest.fn(),
    updateSkill: jest.fn(),
    levelUp: jest.fn(),
    // ... other methods
  } as jest.Mocked<CharacterService>;
};
```

### Test Data Builders

```typescript
export class CharacterBuilder {
  private data: Partial<CharacterData> = {};

  withName(name: string): CharacterBuilder {
    this.data.name = name;
    return this;
  }

  withLevel(level: number): CharacterBuilder {
    this.data.level = level;
    return this;
  }

  withSkill(skillId: string, value: number): CharacterBuilder {
    this.data.skills = { ...this.data.skills, [skillId]: value };
    return this;
  }

  build(): Character {
    return Character.fromApiData(this.data as CharacterData);
  }
}

// Usage
const character = new CharacterBuilder().withName("Test Hero").withLevel(3).withSkill("archery", 12).build();
```

## Running Tests

### API Schema Validation Tests

```bash
# Run API schema validation tests
npm run api-schema-tests:run

# Run only the schema validation (no LocalStack)
npx vitest run src/test/api-schema/level-up-api-schema-validation.test.ts
```

### Unit Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Configuration

The tests use Vitest configuration:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "src/test/"],
    },
  },
});
```

## Continuous Integration

### Pre-commit Hooks

```bash
# Run before each commit
npm run check-format  # Prettier formatting
npm run lint          # ESLint validation
npm test              # Unit tests
```

### CI Pipeline

```yaml
# Example GitHub Actions workflow
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run check-format
      - run: npm run lint
      - run: npm test
      - run: npm run api-schema-tests
```

## Benefits of This Testing Approach

1. **Early Detection**: Schema validation catches breaking changes before deployment
2. **Fast Feedback**: Unit tests provide immediate feedback during development
3. **Confidence**: High test coverage ensures reliability
4. **Maintainability**: Clear testing patterns make tests easy to understand and maintain
5. **API Compatibility**: Ensures frontend and backend stay synchronized

## Future Testing Enhancements

- **Component Testing**: React Testing Library for component interactions
- **E2E Testing**: Playwright for full user workflows
- **Visual Regression**: Screenshot testing for UI consistency
- **Performance Testing**: Load testing for critical user paths
- **Accessibility Testing**: Automated a11y validation

This testing strategy ensures high code quality while maintaining development velocity and deployment confidence.
