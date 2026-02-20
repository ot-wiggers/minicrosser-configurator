'use client'

import { create } from 'zustand'
import type { VariantCategory } from '@/modules/catalog/types'
import type { DocumentType, SelectedOption } from '@/modules/storage/types'

interface ConfiguratorState {
  documentType: DocumentType
  selectedCategory: VariantCategory | null
  selectedBaseModelId: string | null
  selectedOptions: Record<string, SelectedOption> // keyed by optionItemId
  currentStep: number

  // Actions
  setDocumentType: (type: DocumentType) => void
  setCategory: (category: VariantCategory) => void
  setBaseModel: (id: string) => void
  toggleOption: (option: SelectedOption) => void
  setOptionQuantity: (optionItemId: string, quantity: number) => void
  removeOption: (optionItemId: string) => void
  setStep: (step: number) => void
  reset: () => void
}

const initialState = {
  documentType: 'QUOTE' as DocumentType,
  selectedCategory: null as VariantCategory | null,
  selectedBaseModelId: null as string | null,
  selectedOptions: {} as Record<string, SelectedOption>,
  currentStep: 0,
}

export const useConfiguratorStore = create<ConfiguratorState>((set) => ({
  ...initialState,

  setDocumentType: (type) => set({ documentType: type }),

  setCategory: (category) =>
    set({
      selectedCategory: category,
      selectedBaseModelId: null,
      selectedOptions: {},
      currentStep: 1,
    }),

  setBaseModel: (id) => set({ selectedBaseModelId: id, currentStep: 2 }),

  toggleOption: (option) =>
    set((state) => {
      const current = { ...state.selectedOptions }
      if (current[option.optionItemId]) {
        delete current[option.optionItemId]
      } else {
        current[option.optionItemId] = option
      }
      return { selectedOptions: current }
    }),

  setOptionQuantity: (optionItemId, quantity) =>
    set((state) => {
      const current = { ...state.selectedOptions }
      if (current[optionItemId]) {
        current[optionItemId] = { ...current[optionItemId], quantity }
      }
      return { selectedOptions: current }
    }),

  removeOption: (optionItemId) =>
    set((state) => {
      const current = { ...state.selectedOptions }
      delete current[optionItemId]
      return { selectedOptions: current }
    }),

  setStep: (step) => set({ currentStep: step }),

  reset: () => set(initialState),
}))
