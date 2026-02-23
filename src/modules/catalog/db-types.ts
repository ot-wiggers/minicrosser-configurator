export interface CategoryRecord {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  imageBlob?: Blob
}

export interface BaseModelRecord {
  id: string
  categoryId: string
  skuCode: string
  articleNo: string
  name: string
  description?: string
  priceNet: number
  priceGross: number
  imageBlob?: Blob
  sortOrder: number
  isActive: boolean
}

export interface OptionGroupRecord {
  id: string
  name: string
  selectionType: 'SINGLE' | 'MULTI'
  appliesTo: string[] // category IDs, empty = all
  sortOrder: number
  isActive: boolean
}

export interface OptionRecord {
  id: string
  optionGroupId: string
  skuCode: string
  articleNo: string
  name: string
  description?: string
  priceNet: number
  priceGross: number
  imageBlob?: Blob
  sortOrder: number
  isActive: boolean
  isDefault: boolean
}

export interface UserRecord {
  id: string
  username: string
  passwordHash: string
  role: 'admin'
  mustChangePassword: boolean
  createdAt: string
}

export interface SettingRecord {
  key: string
  value: string | number | boolean
}
