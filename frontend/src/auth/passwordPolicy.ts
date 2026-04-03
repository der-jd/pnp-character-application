/**
 * Validates the proposed password against the Cognito pool policy:
 * min 16 chars, uppercase, lowercase, digit, special character.
 *
 * This must stay in sync with the Cognito password_policy in terraform/app/cognito.tf.
 * Cognito enforces the policy server-side; this is for instant client-side feedback.
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
