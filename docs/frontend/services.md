# Services Layer

The Services Layer provides abstractions for external integrations and infrastructure concerns. This layer handles communication with external APIs, authentication, and other infrastructure services.

## Purpose

- Abstract external service integrations
- Provide clean interfaces for infrastructure concerns
- Handle API communication and data transformation
- Manage authentication and authorization
- Implement cross-cutting concerns (logging, caching, error handling)

## Key Components

### Core Services

#### ApiClient.ts
Low-level HTTP client for API communication.

```typescript
export class ApiClient {
  // HTTP client wrapper
  // Handles authentication headers
  // Manages base URL and common configurations
  // Provides typed HTTP methods
}
```

**Responsibilities:**
- HTTP request/response handling
- Authentication token management
- Request/response interceptors
- Error handling and retry logic
- Base URL and endpoint management

**Key Methods:**
```typescript
class ApiClient {
  async get<T>(url: string, config?: RequestConfig): Promise<Result<T>>
  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<Result<T>>
  async patch<T>(url: string, data?: any, config?: RequestConfig): Promise<Result<T>>
  async delete<T>(url: string, config?: RequestConfig): Promise<Result<T>>
}
```

#### CharacterService.ts
High-level service for character-related API operations.

```typescript
export class CharacterService {
  // Character CRUD operations
  // Maps between domain objects and API DTOs
  // Handles character-specific business logic
}
```

**Responsibilities:**
- Character CRUD operations
- Domain object ↔ API DTO mapping
- Character-specific API endpoints
- Business logic coordination for character operations

**Key Methods:**
```typescript
class CharacterService {
  // Character management
  async getCharacter(id: string): Promise<Result<Character>>
  async getCharacters(userId: string): Promise<Result<Character[]>>
  async createCharacter(data: CreateCharacterData): Promise<Result<Character>>
  async cloneCharacter(id: string, name: string): Promise<Result<Character>>
  async deleteCharacter(id: string): Promise<Result<void>>
  
  // Character modifications
  async updateSkill(characterId: string, skillId: string, value: number): Promise<Result<Character>>
  async updateAttribute(characterId: string, attributeId: string, value: number): Promise<Result<Character>>
  async updateBaseValue(characterId: string, baseValueId: string, value: number): Promise<Result<Character>>
  async updateCombatValue(characterId: string, combatValueId: string, value: number): Promise<Result<Character>>
  async levelUp(characterId: string, newLevel: number): Promise<Result<Character>>
  async addSpecialAbility(characterId: string, abilityId: string): Promise<Result<Character>>
  async updateCalculationPoints(characterId: string, points: CalculationPoints): Promise<Result<Character>>
}
```

#### HistoryService.ts
Service for character history operations.

```typescript
export class HistoryService {
  // Character history CRUD operations
  // History data transformation
  // History-specific API endpoints
}
```

**Responsibilities:**
- Load character development history
- Delete history entries
- Transform history data for presentation
- Handle history-specific business logic

**Key Methods:**
```typescript
class HistoryService {
  async getHistory(characterId: string): Promise<Result<HistoryEntry[]>>
  async deleteHistoryEntry(characterId: string, entryId: string): Promise<Result<void>>
  async addHistoryComment(entryId: string, comment: string): Promise<Result<HistoryEntry>>
}
```

#### AuthService.ts
Authentication and authorization service.

```typescript
export class AuthService {
  // User authentication
  // Token management
  // Authorization checks
}
```

**Responsibilities:**
- User login/logout
- JWT token management
- Authentication state management
- Protected route handling

**Key Methods:**
```typescript
class AuthService {
  async login(credentials: LoginCredentials): Promise<Result<AuthToken>>
  async logout(): Promise<void>
  async refreshToken(): Promise<Result<AuthToken>>
  getCurrentUser(): User | null
  isAuthenticated(): boolean
}
```

## Design Principles

### Repository Pattern
Services act as repositories for domain objects:
```typescript
interface CharacterRepository {
  findById(id: string): Promise<Result<Character>>
  findByUserId(userId: string): Promise<Result<Character[]>>
  save(character: Character): Promise<Result<Character>>
  delete(id: string): Promise<Result<void>>
}
```

### Result Pattern
All service operations return `Result<T>` for explicit error handling:
```typescript
// Success case
const result = await characterService.getCharacter(id);
if (result.success) {
  const character = result.value;
  // Handle success
} else {
  const error = result.error;
  // Handle error
}
```

### Domain Mapping
Services handle transformation between API DTOs and domain objects:
```typescript
class CharacterService {
  private mapApiCharacterToDomain(apiCharacter: ApiCharacter): Character {
    return Character.fromApiData(apiCharacter);
  }
  
  private mapDomainCharacterToApi(character: Character): ApiCharacter {
    return character.toApiFormat();
  }
}
```

## Usage Examples

### Basic CRUD Operations
```typescript
// Load a character
const characterResult = await characterService.getCharacter('char-123');
if (characterResult.success) {
  const character = characterResult.value;
  console.log('Loaded character:', character.name);
}

// Update a skill
const updateResult = await characterService.updateSkill('char-123', 'archery', 12);
if (updateResult.success) {
  console.log('Skill updated successfully');
}
```

### Error Handling
```typescript
const result = await characterService.createCharacter(characterData);

if (!result.success) {
  switch (result.error.type) {
    case 'ValidationError':
      // Handle validation errors
      showValidationErrors(result.error.details);
      break;
    case 'NetworkError':
      // Handle network issues
      showNetworkError();
      break;
    case 'AuthenticationError':
      // Handle auth issues
      redirectToLogin();
      break;
    default:
      // Handle unexpected errors
      showGenericError();
  }
}
```

### Service Composition
```typescript
class CharacterApplicationService {
  constructor(
    private characterService: CharacterService,
    private historyService: HistoryService,
    private authService: AuthService
  ) {}
  
  async levelUpCharacter(characterId: string, newLevel: number): Promise<Result<void>> {
    // Check authentication
    if (!this.authService.isAuthenticated()) {
      return ResultError('Not authenticated');
    }
    
    // Level up character
    const levelUpResult = await this.characterService.levelUp(characterId, newLevel);
    if (!levelUpResult.success) {
      return levelUpResult;
    }
    
    // Load updated history
    const historyResult = await this.historyService.getHistory(characterId);
    
    return ResultSuccess(undefined);
  }
}
```

## API Integration Patterns

### Request/Response Transformation
```typescript
class CharacterService {
  async updateSkill(characterId: string, skillId: string, value: number): Promise<Result<Character>> {
    // Prepare API request
    const request: PatchSkillRequest = {
      skillId,
      value,
      // Add any additional API-specific fields
    };
    
    // Make API call
    const response = await this.apiClient.patch<PatchSkillResponse>(
      `/characters/${characterId}/skills`,
      request
    );
    
    if (!response.success) {
      return response; // Forward error
    }
    
    // Transform API response to domain object
    const character = this.mapApiCharacterToDomain(response.value.character);
    return ResultSuccess(character);
  }
}
```

### Caching Strategy
```typescript
class CharacterService {
  private cache = new Map<string, { character: Character; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async getCharacter(id: string): Promise<Result<Character>> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return ResultSuccess(cached.character);
    }
    
    // Fetch from API
    const result = await this.fetchCharacterFromApi(id);
    if (result.success) {
      // Update cache
      this.cache.set(id, {
        character: result.value,
        timestamp: Date.now()
      });
    }
    
    return result;
  }
}
```

## Testing Strategy

### Service Unit Testing
```typescript
describe('CharacterService', () => {
  let characterService: CharacterService;
  let mockApiClient: jest.Mocked<ApiClient>;
  
  beforeEach(() => {
    mockApiClient = createMockApiClient();
    characterService = new CharacterService(mockApiClient);
  });
  
  it('should get character successfully', async () => {
    // Arrange
    const mockResponse = { character: mockApiCharacter };
    mockApiClient.get.mockResolvedValue(ResultSuccess(mockResponse));
    
    // Act
    const result = await characterService.getCharacter('char-123');
    
    // Assert
    expect(result.success).toBe(true);
    expect(mockApiClient.get).toHaveBeenCalledWith('/characters/char-123');
  });
  
  it('should handle API errors', async () => {
    // Arrange
    mockApiClient.get.mockResolvedValue(ResultError('Network error'));
    
    // Act
    const result = await characterService.getCharacter('char-123');
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});
```

### Integration Testing
```typescript
describe('CharacterService Integration', () => {
  it('should perform full character workflow', async () => {
    // Test with real API endpoints (using test environment)
    const service = new CharacterService(new ApiClient(TEST_BASE_URL));
    
    // Create character
    const createResult = await service.createCharacter(testCharacterData);
    expect(createResult.success).toBe(true);
    
    // Update skill
    const updateResult = await service.updateSkill(
      createResult.value.id,
      'archery',
      12
    );
    expect(updateResult.success).toBe(true);
    
    // Verify changes
    const getResult = await service.getCharacter(createResult.value.id);
    expect(getResult.value.getSkillValue('archery')).toBe(12);
  });
});
```

## Dependencies

- **api-spec**: For type definitions and API contracts
- **Domain Layer**: For domain entity definitions
- **HTTP Client**: For making API requests
- **Authentication**: For token management

## Integration Points

### Consumed By
- **Application Layer**: Use cases call services for data operations
- **Presentation Layer**: View models may call services directly
- **Custom Hooks**: React hooks wrap service calls

### Consumes
- **External APIs**: Backend REST API endpoints
- **Authentication Provider**: JWT token provider
- **Caching Layer**: Browser storage or in-memory cache
- **Network Layer**: HTTP client implementation

The Services Layer provides a clean abstraction over external systems, allowing the application to remain focused on business logic while handling all the complexities of external integrations.