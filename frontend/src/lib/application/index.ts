// Application Layer - Clean Architecture Implementation
// 
// This layer contains:
// - Use Cases: Business logic implementation
// - Application Services: Coordination and cross-cutting concerns
// - Interfaces: Contracts for presentation layer
//
// Following coding guidelines:
// - All types from api-spec
// - Proper Result<T,E> error handling
// - Clear separation of concerns
// - Domain-first architecture

// Use Cases
export * from './use-cases';

// Application Services
export * from './services';