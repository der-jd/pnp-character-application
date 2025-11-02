/**
 * Presentation Layer ViewModels
 *
 * Export all ViewModels and the base ViewModel class
 */

export { BaseViewModel, type BaseViewModelState } from "./BaseViewModel";
export {
  SignInViewModel,
  type SignInViewModelState,
  type SignInFormData,
  type SignInSuccessData,
} from "./SignInViewModel";
export {
  HistoryPageViewModel,
  type HistoryPageViewModelState,
  type HistoryPageViewModelActions,
} from "./HistoryPageViewModel";
export { DashboardViewModel, type DashboardViewModelState, type CharacterSummary } from "./DashboardViewModel";
export { AuthViewModel, type AuthViewModelState } from "./AuthViewModel";
export {
  CharacterSelectionViewModel,
  type CharacterSelectionViewModelState,
  type CharacterOption,
} from "./CharacterSelectionViewModel";
export { SkillsPageViewModel, type SkillsPageViewModelState, type SkillViewModel } from "./SkillsPageViewModel";
