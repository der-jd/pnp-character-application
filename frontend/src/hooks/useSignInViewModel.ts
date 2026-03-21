/**
 * React Hook for Sign In ViewModel
 *
 * This hook bridges the ViewModel (presentation layer) with React components (UI layer)
 * Following clean architecture principles
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  SignInViewModel,
  SignInViewModelState,
  SignInFormData,
  SignInSuccessData,
} from "../lib/presentation/viewmodels/SignInViewModel";
import { SignInUseCase } from "../lib/application/use-cases/SignInUseCase";
import { AuthService } from "../lib/services/authService";
import { featureLogger } from "../lib/utils/featureLogger";

/**
 * Hook for managing sign-in page state and actions
 */
export function useSignInViewModel() {
  // Create ViewModel instance (memoized to prevent recreation on every render)
  const viewModel = useMemo(() => {
    featureLogger.debug("ui", "useSignInViewModel", "Creating ViewModel instance");
    const authService = new AuthService();
    const signInUseCase = new SignInUseCase(authService);
    const vm = new SignInViewModel(signInUseCase);
    return vm;
  }, []);

  // Local React state synced with ViewModel
  const [state, setState] = useState<SignInViewModelState>(viewModel.getState());

  // Subscribe to ViewModel state changes
  useEffect(() => {
    const unsubscribe = viewModel.subscribe((newState: SignInViewModelState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [viewModel]);

  // Wrap ViewModel actions with useCallback for stable references
  const signIn = useCallback(
    async (formData: SignInFormData) => {
      await viewModel.signIn(formData);
    },
    [viewModel],
  );

  const clearError = useCallback(() => {
    viewModel.clearError();
  }, [viewModel]);

  const onSuccess = useCallback(
    (callback: (data: SignInSuccessData) => void) => {
      viewModel.onSuccess(callback);
    },
    [viewModel],
  );

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    isAuthenticated: state.isAuthenticated,

    // Actions
    signIn,
    clearError,
    onSuccess,
  };
}
