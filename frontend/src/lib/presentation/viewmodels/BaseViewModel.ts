/**
 * Base ViewModel - Abstract class implementing the Observable pattern
 *
 * Common responsibilities:
 * - Manage loading and error states
 * - Observable pattern for state changes (subscribe/notify)
 * - State immutability (getState returns copy)
 * - Framework-agnostic (no React dependencies)
 *
 * Following clean architecture:
 * - Presentation layer sits between UI and Application layer
 * - Testable without mounting components
 * - Consistent state management pattern
 *
 * @template TState - The shape of the ViewModel's state
 */
export abstract class BaseViewModel<TState extends BaseViewModelState> {
  protected state: TState;
  private listeners: Set<(state: TState) => void> = new Set();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  /**
   * Subscribe to state changes
   * Returns unsubscribe function
   */
  public subscribe(listener: (state: TState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current state (returns the actual state reference)
   * For use with useSyncExternalStore which handles immutability
   */
  public getState(): TState {
    return this.state;
  }

  /**
   * Get state snapshot (returns a copy for external use)
   * Use this when you need a snapshot that won't change
   */
  public getStateSnapshot(): TState {
    return { ...this.state };
  }

  /**
   * Clear error state
   */
  public clearError(): void {
    this.updateState({ error: null } as Partial<TState>);
  }

  /**
   * Update state and notify all listeners
   * Protected so only derived classes can update state
   */
  protected updateState(updates: Partial<TState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  /**
   * Notify all subscribers of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  /**
   * Helper to set loading state
   */
  protected setLoading(isLoading: boolean, error: string | null = null): void {
    this.updateState({ isLoading, error } as Partial<TState>);
  }

  /**
   * Helper to set error state
   */
  protected setError(error: string): void {
    this.updateState({ isLoading: false, error } as Partial<TState>);
  }

  /**
   * Helper to clear loading and error
   */
  protected setSuccess(): void {
    this.updateState({ isLoading: false, error: null } as Partial<TState>);
  }
}

/**
 * Base state that all ViewModels must have
 */
export interface BaseViewModelState {
  isLoading: boolean;
  error: string | null;
}
