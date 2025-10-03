# Presentation Layer

The Presentation Layer handles UI-specific concerns, transforming domain data for display and managing presentation state. This layer bridges the gap between the UI components and the application logic.

## Purpose

- Transform domain data for UI consumption
- Manage presentation-specific state (UI modes, form states, etc.)
- Handle UI event coordination
- Format data for display (dates, numbers, text)
- Encapsulate presentation logic and keep components clean

## Key Components

### View Models

View models contain presentation logic and state management for specific UI screens or components.

#### SkillsPageViewModel.ts
```typescript
export class SkillsPageViewModel {
  // Manages Skills page presentation state
  // Handles skill-related UI operations
  // Formats skill data for display
}
```

**Responsibilities:**
- Manage edit mode state for skills
- Handle skill increase operations
- Format skill values for display
- Coordinate skill-related UI events
- Transform skill domain data for React components

**Key Methods:**
```typescript
class SkillsPageViewModel {
  // State management
  toggleEditMode(): void
  setEditMode(enabled: boolean): void
  
  // Data formatting
  formatSkillValue(value: number): string
  getSkillDisplayData(): SkillDisplayData[]
  
  // Event handling
  onSkillIncrease(skillId: string, newValue: number): Promise<void>
  onSkillReset(skillId: string): Promise<void>
}
```

### Presentation Interfaces

**Common Presentation Types:**
```typescript
// UI state interfaces
interface EditModeState {
  isEditing: boolean;
  editingItem?: string;
}

interface FormState<T> {
  values: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
}

// Display data interfaces
interface DisplayData {
  id: string;
  label: string;
  value: string;
  isEditable: boolean;
}
```

## Design Principles

### Separation of Concerns
- Presentation logic is separate from business logic
- UI state is managed independently of domain state
- View models don't contain business rules

### Single Responsibility
- Each view model serves a specific UI context
- Clear boundaries between different presentation concerns
- Focused responsibilities for each component

### Reactive Architecture
- View models expose observable state
- UI components react to state changes
- Unidirectional data flow

## Usage Examples

### Using a View Model in React
```typescript
const SkillsPage: React.FC = () => {
  const [viewModel] = useState(() => new SkillsPageViewModel());
  const [isEditMode, setIsEditMode] = useState(false);
  
  const handleSkillIncrease = useCallback(async (skillId: string, newValue: number) => {
    await viewModel.onSkillIncrease(skillId, newValue);
  }, [viewModel]);
  
  const skillDisplayData = useMemo(() => 
    viewModel.getSkillDisplayData(), 
    [viewModel, /* dependencies */]
  );
  
  return (
    <div>
      <button onClick={() => viewModel.toggleEditMode()}>
        {isEditMode ? 'Save' : 'Edit'}
      </button>
      
      {skillDisplayData.map(skill => (
        <SkillComponent
          key={skill.id}
          skill={skill}
          onIncrease={handleSkillIncrease}
          readOnly={!isEditMode}
        />
      ))}
    </div>
  );
};
```

### Data Formatting
```typescript
class CharacterViewModel {
  formatAttribute(value: number): string {
    return `${value} (${this.getAttributeModifier(value)})`;
  }
  
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }
  
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }
}
```

### Form State Management
```typescript
class CharacterFormViewModel {
  private formState: FormState<CharacterFormData> = {
    values: this.getInitialValues(),
    errors: {},
    isSubmitting: false,
    isDirty: false
  };
  
  updateField(field: keyof CharacterFormData, value: any): void {
    this.formState.values[field] = value;
    this.formState.isDirty = true;
    this.validateField(field);
  }
  
  async submit(): Promise<void> {
    if (!this.isValid()) return;
    
    this.formState.isSubmitting = true;
    try {
      await this.characterService.updateCharacter(this.formState.values);
      this.formState.isDirty = false;
    } catch (error) {
      this.handleSubmitError(error);
    } finally {
      this.formState.isSubmitting = false;
    }
  }
}
```

## State Management Patterns

### Local State
For component-specific UI state:
```typescript
const [isLoading, setIsLoading] = useState(false);
const [selectedTab, setSelectedTab] = useState('skills');
```

### View Model State
For complex presentation logic:
```typescript
class PageViewModel {
  private state = {
    editMode: false,
    selectedItems: new Set<string>(),
    filters: new Map<string, any>()
  };
  
  // State management methods
  toggleEditMode(): void { /* ... */ }
  selectItem(id: string): void { /* ... */ }
  applyFilter(key: string, value: any): void { /* ... */ }
}
```

### Global State Integration
```typescript
class CharacterViewModel {
  constructor(private characterStore: CharacterStore) {}
  
  get currentCharacter() {
    return this.characterStore.getCurrentCharacter();
  }
  
  async loadCharacter(id: string): Promise<void> {
    const result = await this.loadCharacterUseCase.execute({ id });
    if (result.success) {
      this.characterStore.setCurrentCharacter(result.value);
    }
  }
}
```

## Testing Strategy

### View Model Testing
```typescript
describe('SkillsPageViewModel', () => {
  let viewModel: SkillsPageViewModel;
  let mockCharacterService: jest.Mocked<CharacterService>;
  
  beforeEach(() => {
    mockCharacterService = createMockCharacterService();
    viewModel = new SkillsPageViewModel(mockCharacterService);
  });
  
  it('should toggle edit mode', () => {
    expect(viewModel.isEditMode).toBe(false);
    viewModel.toggleEditMode();
    expect(viewModel.isEditMode).toBe(true);
  });
  
  it('should format skill values correctly', () => {
    const formatted = viewModel.formatSkillValue(15);
    expect(formatted).toBe('15 (TaW)');
  });
});
```

### Integration with Components
```typescript
describe('SkillsPage Integration', () => {
  it('should update UI when skill is increased', async () => {
    const { getByTestId, findByText } = render(<SkillsPage />);
    
    const increaseButton = getByTestId('increase-skill-archery');
    fireEvent.click(increaseButton);
    
    await findByText('Skill increased successfully');
    expect(mockCharacterService.updateSkill).toHaveBeenCalled();
  });
});
```

## Dependencies

- **Application Layer**: Calls use cases for business operations
- **Domain Layer**: Transforms domain entities for display
- **React**: Integrates with React components and hooks
- **Global State**: Connects to application state management

## Integration Points

### Consumed By
- **React Components**: Use view models for presentation logic
- **Custom Hooks**: Encapsulate view model interactions
- **Page Components**: Coordinate multiple view models

### Consumes
- **Use Cases**: Execute business operations
- **Domain Entities**: Transform domain data
- **Services**: Access application services
- **Global State**: React to and update global application state

The Presentation Layer ensures clean separation between UI concerns and business logic, making components simpler and more testable while providing rich presentation capabilities.