import type { ConfigurationContext, ValidationResult } from './types'

export function validateConfiguration(context: ConfigurationContext): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const warnings: ValidationResult['warnings'] = []

  // MVP: basic structural validation only
  if (!context.category) {
    errors.push({ severity: 'ERROR', code: 'NO_CATEGORY', message: 'Bitte Kategorie wählen' })
  }
  if (!context.baseModelId) {
    errors.push({ severity: 'ERROR', code: 'NO_BASE', message: 'Bitte Basisfahrzeug wählen' })
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0,
  }
}
