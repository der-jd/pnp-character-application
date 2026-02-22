# Frontend Architecture Documentation

This documentation covers the frontend architecture of the PnP Character Application, following Clean Architecture principles with clear separation of concerns.

## Architecture Overview

The frontend is organized in layers following Clean Architecture patterns with clear dependency flow and separation of concerns.

### Clean Architecture Layers

```plantuml
@startuml Frontend_Clean_Architecture
!theme plain
skinparam componentStyle rectangle
skinparam backgroundColor white
skinparam component {
    BackgroundColor lightblue
    BorderColor black
}

package "Frontend Clean Architecture" {
    component [React Components\n(UI Layer)] as UI
    component [Presentation Layer\n(View Models)] as Presentation
    component [Application Layer\n(Use Cases)] as Application
    component [Domain Layer\n(Business Entities)] as Domain
    component [Services Layer\n(External APIs)] as Services
}

package "External Systems" {
    component [Backend API] as API
    component [Authentication] as Auth
    component [LocalStack] as LocalStack
}

UI --> Presentation : "Uses"
Presentation --> Application : "Calls"
Application --> Domain : "Operates on"
Application --> Services : "Calls"
Services --> API : "HTTP Requests"
Services --> Auth : "Token Management"
Services --> LocalStack : "Testing"

note right of Domain
  Core business logic
  No external dependencies
  Pure domain entities
end note

note right of Application
  Orchestrates business operations
  Coordinates domain and services
  Use cases and workflows
end note

note right of Services
  External integrations
  API communication
  Infrastructure concerns
end note

@enduml
```

### Layer Dependencies

```plantuml
@startuml Layer_Dependencies
!theme plain
skinparam backgroundColor white

package "Dependency Flow" {
    [UI Components] as UI
    [View Models] as VM
    [Use Cases] as UC
    [Domain Entities] as DE
    [Services] as SVC
}

UI ..> VM : depends on
VM ..> UC : depends on
UC ..> DE : depends on
UC ..> SVC : depends on

note top of DE
  No dependencies
  Pure business logic
end note

note bottom of SVC
  External dependencies only
  Infrastructure layer
end note

@enduml
```

## Detailed Architecture Diagrams

### Component Architecture

```plantuml
@startuml Component_Architecture
!theme plain
skinparam backgroundColor white
skinparam package {
    BackgroundColor lightgray
    BorderColor black
}

package "Domain Layer" {
    class Character {
        +updateSkill()
        +levelUp()
        +calculateCosts()
    }
    class Skills {
        +increaseSkill()
        +getSkillCost()
    }
    class Attributes {
        +updateAttribute()
        +getModifier()
    }
}

package "Application Layer" {
    class LevelUpUseCase {
        +execute(input)
    }
    class IncreaseSkillUseCase {
        +execute(input)
    }
    class LoadCharacterUseCase {
        +execute(input)
    }
}

package "Presentation Layer" {
    class SkillsPageViewModel {
        +formatSkillValue()
        +onSkillIncrease()
        +toggleEditMode()
    }
    class CharacterViewModel {
        +formatAttributes()
        +loadCharacter()
    }
}

package "Services Layer" {
    class CharacterService {
        +getCharacter()
        +updateSkill()
        +levelUp()
    }
    class ApiClient {
        +get()
        +post()
        +patch()
    }
}

SkillsPageViewModel --> IncreaseSkillUseCase
SkillsPageViewModel --> LoadCharacterUseCase
LevelUpUseCase --> Character
IncreaseSkillUseCase --> Character
IncreaseSkillUseCase --> CharacterService
CharacterService --> ApiClient

@enduml
```

### Data Flow Architecture

```plantuml
@startuml Data_Flow
!theme plain
skinparam backgroundColor white
skinparam actor {
    BackgroundColor lightblue
}
skinparam boundary {
    BackgroundColor lightgreen
}

actor User
boundary "React Component" as UI
entity "View Model" as VM
control "Use Case" as UC
entity "Domain Entity" as DE
boundary "Service" as SVC
database "Backend API" as API

User -> UI : User Action\n(e.g., Increase Skill)
UI -> VM : Call Method\n(onSkillIncrease)
VM -> UC : Execute Use Case\n(IncreaseSkillUseCase)
UC -> DE : Apply Business Logic\n(character.increaseSkill)
UC -> SVC : Persist Changes\n(characterService.updateSkill)
SVC -> API : HTTP Request\n(PATCH /characters/{id}/skills)
API -> SVC : Response\n(Updated Character)
SVC -> UC : Domain Object\n(Character)
UC -> VM : Result\n(Success/Error)
VM -> UI : Update State
UI -> User : Updated UI

note right of DE
  Business rules enforced
  Skill cost calculation
  Validation logic
end note

note right of UC
  Coordinates workflow
  Error handling
  Transaction boundaries
end note

@enduml
```

### Testing Architecture

```plantuml
@startuml Testing_Architecture
!theme plain
skinparam backgroundColor white
skinparam package {
    BackgroundColor lightyellow
    BorderColor orange
}

package "Testing Strategy" {
    component [API Schema Validation\nTests] as SchemaTests
    component [Unit Tests\n(Domain/Application/Services)] as UnitTests
    component [Integration Tests\n(Component Interactions)] as IntegrationTests
    component [E2E Tests\n(User Workflows)] as E2ETests
}

package "Test Infrastructure" {
    component [LocalStack\n(AWS Emulation)] as LocalStack
    component [Mock Factories\n(Test Data)] as Mocks
    component [Test Utilities\n(Helpers)] as Utils
}

package "Validation Targets" {
    component [API-Spec Schemas\n(Zod)] as Schemas
    component [Backend API\n(Real Integration)] as BackendAPI
    component [Domain Logic\n(Business Rules)] as DomainLogic
}

SchemaTests --> LocalStack
SchemaTests --> Schemas
SchemaTests --> BackendAPI
UnitTests --> Mocks
UnitTests --> DomainLogic
IntegrationTests --> Utils
E2ETests --> LocalStack

note top of SchemaTests
  Prevents breaking changes
  Validates API compatibility
  Tests against real infrastructure
end note

@enduml
```

## Layer Documentation

- [Domain Layer](./domain.md) - Core business entities and domain logic
- [Application Layer](./application.md) - Use cases and application services
- [Presentation Layer](./presentation.md) - View models and presentation logic
- [Services Layer](./services.md) - External service integrations
- [Testing Strategy](./testing.md) - Testing approaches and API schema validation

## Architecture Principles

1. **Dependency Inversion**: Inner layers don't depend on outer layers
2. **Single Responsibility**: Each layer has a clear, focused purpose
3. **Separation of Concerns**: Business logic is separated from presentation and infrastructure
4. **Testability**: Each layer can be tested independently

## Use Case Flow Examples

### Level Up Character Flow

```plantuml
@startuml LevelUp_Flow
!theme plain
skinparam backgroundColor white

participant "UI Component" as UI
participant "ViewModel" as VM
participant "LevelUpUseCase" as UC
participant "Character" as CHAR
participant "CharacterService" as SVC
participant "Backend API" as API

UI -> VM: onLevelUp(characterId, newLevel)
VM -> UC: execute({characterId, newLevel})
UC -> CHAR: validateLevelUp(newLevel)
CHAR -> UC: validation result
UC -> SVC: levelUp(characterId, newLevel)
SVC -> API: POST /characters/{id}/level
API -> SVC: UpdateLevelResponse
SVC -> UC: Character (updated)
UC -> VM: Result<Character>
VM -> UI: success/error state
UI -> UI: update display

note over CHAR
  Business Rules:
  - Check max level
  - Calculate attribute gains
  - Validate prerequisites
end note

note over API
  Step Functions Integration:
  - Lambda execution
  - History recording
  - Error handling
end note

@enduml
```

### API Schema Validation Flow

```plantuml
@startuml Schema_Validation_Flow
!theme plain
skinparam backgroundColor white

participant "Test Suite" as TEST
participant "API-Spec Schema" as SCHEMA
participant "LocalStack API" as LOCAL
participant "Real Request/Response" as REAL

TEST -> SCHEMA: validate request format
SCHEMA -> TEST: validation result
TEST -> LOCAL: send real HTTP request
LOCAL -> TEST: actual API response
TEST -> SCHEMA: validate response format
SCHEMA -> TEST: schema compliance check

note over SCHEMA
  Zod Schemas from api-spec:
  - PostLevelRequest
  - UpdateLevelResponse
  - Shared with backend
end note

note over LOCAL
  Infrastructure Testing:
  - AWS Lambda functions
  - API Gateway routing
  - Step Functions
end note

@enduml
```

## Project Structure

```plantuml
@startuml Project_Structure
!theme plain
skinparam backgroundColor white
skinparam folder {
    BackgroundColor lightcyan
    BorderColor navy
}

folder "frontend/src/" {
    folder "app/" {
        file "page.tsx"
        file "layout.tsx"
        folder "characters/"
    }

    folder "hooks/" {
        file "useCharacter.ts"
        file "useSkillIncrease.ts"
    }

    folder "lib/" {
        folder "application/" {
            folder "use-cases/" {
                file "LevelUpUseCase.ts"
                file "IncreaseSkillUseCase.ts"
                file "LoadCharacterUseCase.ts"
            }
            folder "services/" {
                file "CharacterApplicationService.ts"
            }
        }

        folder "domain/" {
            file "Character.ts"
            file "Skills.ts"
            file "Attributes.ts"
        }

        folder "presentation/" {
            folder "viewmodels/" {
                file "SkillsPageViewModel.ts"
            }
        }

        folder "services/" {
            file "characterService.ts"
            file "apiClient.ts"
            file "authService.ts"
        }

        folder "types/" {
            file "result.ts"
            file "index.ts"
        }
    }

    folder "test/" {
        folder "api-schema/" {
            file "level-up-api-schema-validation.test.ts"
        }
        file "LevelUpUseCase.test.ts"
        file "Character.test.ts"
    }
}

@enduml
```

## Getting Started

Each layer documentation provides:

- Purpose and responsibilities
- Key components and their roles
- Usage examples
- Testing approaches

Navigate to the specific layer documentation for detailed information.
