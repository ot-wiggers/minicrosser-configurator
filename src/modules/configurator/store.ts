'use client'

import { create } from 'zustand'
import type { DocumentType, SelectedOption, CustomLineItem } from '@/modules/storage/types'

interface ConfiguratorState {
  documentType: DocumentType
  selectedCategory: string | null // Convex category _id
  selectedBaseModelId: string | null
  selectedOptions: Record<string, SelectedOption> // keyed by optionItemId
  customLineItems: CustomLineItem[]
  currentStep: number
  editingDocumentId: string | null // Set when editing an existing document

  // Actions
  setDocumentType: (type: DocumentType) => void
  setCategory: (categoryId: string) => void
  setCategoryWithDefaultModel: (categoryId: string, defaultModelId: string | null) => void
  setBaseModel: (id: string) => void
  toggleOption: (option: SelectedOption) => void
  setOptionQuantity: (optionItemId: string, quantity: number) => void
  removeOption: (optionItemId: string) => void
  setOptionInputValue: (optionItemId: string, value: string) => void
  addCustomLineItem: (item: Omit<CustomLineItem, 'id'>) => void
  updateCustomLineItem: (id: string, updates: Partial<Omit<CustomLineItem, 'id'>>) => void
  removeCustomLineItem: (id: string) => void
  setStep: (step: number) => void
  reset: () => void
  loadFromDocument: (doc: {
    _id: string
    documentType: DocumentType
    selectedCategory: string
    selectedBaseModelId: string
    selectedOptions: SelectedOption[]
    customLineItems?: CustomLineItem[]
  }) => void
}

const initialState = {
  documentType: 'QUOTE' as DocumentType,
  selectedCategory: null as string | null,
  selectedBaseModelId: null as string | null,
  selectedOptions: {} as Record<string, SelectedOption>,
  customLineItems: [] as CustomLineItem[],
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
      customLineItems: [],
      currentStep: 1,
    }),

  setCategoryWithDefaultModel: (categoryId, defaultModelId) =>
    set({
      selectedCategory: categoryId,
      selectedBaseModelId: defaultModelId,
      selectedOptions: {},
      customLineItems: [],
      currentStep: 1,
    }),

  setBaseModel: (id) => set({ selectedBaseModelId: id }),

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

  setOptionInputValue: (optionItemId, value) =>
    set((state) => {
      const current = { ...state.selectedOptions }
      if (current[optionItemId]) {
        current[optionItemId] = { ...current[optionItemId], inputValue: value }
      }
      return { selectedOptions: current }
    }),

  addCustomLineItem: (item) =>
    set((state) => ({
      customLineItems: [
        ...state.customLineItems,
        { ...item, id: crypto.randomUUID() },
      ],
    })),

  updateCustomLineItem: (id, updates) =>
    set((state) => ({
      customLineItems: state.customLineItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      ),
    })),

  removeCustomLineItem: (id) =>
    set((state) => ({
      customLineItems: state.customLineItems.filter((item) => item.id !== id),
    })),

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
      customLineItems: doc.customLineItems ?? [],
      currentStep: 2,
      editingDocumentId: doc._id,
    })
  },
}))
