/**
 * Validates the proposed password against the Cognito pool policy:
 * min 16 chars, uppercase, lowercase, digit, special character.
 */
export function isValidPassword(password: string): boolean {
  return (
    password.length >= 16 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}
