'use client'

import { create } from 'zustand'
import type { DocumentType, SelectedOption } from '@/modules/storage/types'

interface ConfiguratorState {
  documentType: DocumentType
  selectedCategory: string | null // Convex category _id
  selectedBaseModelId: string | null
  selectedOptions: Record<string, SelectedOption> // keyed by optionItemId
  currentStep: number
  editingDocumentId: string | null // Set when editing an existing document

  // Actions
  setDocumentType: (type: DocumentType) => void
  setCategory: (categoryId: string) => void
  setBaseModel: (id: string) => void
  toggleOption: (option: SelectedOption) => void
  setOptionQuantity: (optionItemId: string, quantity: number) => void
  removeOption: (optionItemId: string) => void
  setStep: (step: number) => void
  reset: () => void
  loadFromDocument: (doc: {
    _id: string
    documentType: DocumentType
    selectedCategory: string
    selectedBaseModelId: string
    selectedOptions: SelectedOption[]
  }) => void
}

const initialState = {
  documentType: 'QUOTE' as DocumentType,
  selectedCategory: null as string | null,
  selectedBaseModelId: null as string | null,
  selectedOptions: {} as Record<string, SelectedOption>,
  currentStep: 0,
  editingDocumentId: null as string | null,
}

export const useConfiguratorStore = create<ConfiguratorState>((set) => ({
  ...initialState,

  setDocumentType: (type) => set({ documentType: type }),

  setCategory: (categoryId) =>
    set({
      selectedCategory: categoryId,
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

  loadFromDocument: (doc) => {
    const optionsMap: Record<string, SelectedOption> = {}
    for (const opt of doc.selectedOptions) {
      optionsMap[opt.optionItemId] = opt
    }
    set({
      documentType: doc.documentType,
      selectedCategory: doc.selectedCategory,
      selectedBaseModelId: doc.selectedBaseModelId,
      selectedOptions: optionsMap,
      currentStep: 2, // Go to accessory step for editing
      editingDocumentId: doc._id,
    })
  },
}))
