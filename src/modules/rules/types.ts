export type ValidationSeverity = 'ERROR' | 'WARN'

export interface ValidationMessage {
  severity: ValidationSeverity
  code: string
  message: string
}

export interface ValidationResult {
  errors: ValidationMessage[]
  warnings: ValidationMessage[]
  isValid: boolean
}

export interface ConfigurationContext {
  category: string | null
  baseModelId: string | null
  selectedSkuCodes: string[]
}
