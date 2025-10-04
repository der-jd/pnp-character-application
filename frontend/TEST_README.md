# Testing Setup for PnP Character Application Frontend

## 🧪 **Testing Framework: Vitest**

We've set up **Vitest** with React Testing Library for comprehensive frontend testing.

### **Why Vitest?**

- ✅ **Consistency**: Backend already uses Vitest
- ✅ **Performance**: Extremely fast test execution
- ✅ **TypeScript**: Zero-config TypeScript support
- ✅ **Modern**: Native ESM support, Vite-powered

## 📁 **Test Structure**

```
frontend/src/test/
├── setup.ts              # Global test configuration
├── test-utils.ts          # Test utilities and mocks
├── result.test.ts         # Result type tests ✅
├── LoadCharacterUseCase.test.ts  # Use Case tests ✅
└── *.test.ts             # Additional test files
```

## 🚀 **Available Commands**

```bash
npm run test           # Run tests in watch mode
npm run test:run       # Run tests once
npm run test:ui        # Open Vitest UI
npm run test:coverage  # Run with coverage report
npm run test:watch     # Explicit watch mode
```

## 📊 **Current Test Status**

### ✅ **Working Tests**

- **Result Types** (6/6 tests passing)
- **LoadCharacterUseCase** (5/5 tests passing)

### 🔧 **In Progress**

- **IncreaseSkillUseCase** (5/7 tests passing) - mocking issues

## 🧪 **Testing Use Cases**

Our Application Layer Use Cases are perfect for unit testing because they:

1. **Pure Business Logic** - No UI dependencies
2. **Clear Inputs/Outputs** - Easy to test
3. **Error Handling** - Comprehensive error scenarios
4. **Mocked Dependencies** - Services are injected

### **Example Test Structure**

```typescript
describe("LoadCharacterUseCase", () => {
  describe("Input Validation", () => {
    it("should reject empty character ID");
    it("should reject empty ID token");
  });

  describe("Business Logic", () => {
    it("should successfully load character");
    it("should handle service errors");
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors");
  });
});
```

## 🎯 **Testing Strategy**

### **1. Unit Tests** (Current Focus)

- **Use Cases**: Business logic validation
- **Result Types**: Type system correctness
- **Utilities**: Helper functions

### **2. Integration Tests** (Next Phase)

- **Application Services**: Use Case coordination
- **API Integration**: With MSW mocking

### **3. Component Tests** (Future)

- **React Components**: Using Use Cases
- **Hooks**: Thin wrappers over Use Cases

## 🔧 **Configuration**

### **Coverage Thresholds**

- Branches: 80%
- Functions: 80%
- Lines: 80%
- Statements: 80%

### **Test Environment**

- **Environment**: jsdom (React components)
- **Setup**: Global mocks for Next.js
- **TypeScript**: Full support

## 📝 **Next Steps**

1. **Fix IncreaseSkillUseCase mocking** - Service injection issues
2. **Add more Use Case tests** - Cover all 13 Use Cases
3. **Add Application Service tests** - Coordination logic
4. **Add integration tests** - End-to-end workflows

## 🚨 **Known Issues**

1. **Character Type Complexity** - api-spec Character type is very complex for test data
2. **Service Mocking** - Need better mock factory for CharacterService
3. **Vitest Config Warning** - CommonJS/ESM module loading (non-critical)

The testing foundation is solid and ready for comprehensive Use Case testing!
