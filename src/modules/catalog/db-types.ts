export interface CategoryRecord {
  id: string
  name: string
  sortOrder: number
  isActive: boolean
  imageStorageId?: string | null
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
  specs?: Array<{ label: string; value: string }>
  imageStorageId?: string | null
  imageBlob?: Blob
  sortOrder: number
  isActive: boolean
  priceOnRequest?: boolean
  isDefault?: boolean
  upgradeLabel?: string
}

export interface OptionGroupRecord {
  id: string
  name: string
  selectionType: 'SINGLE' | 'MULTI'
  appliesTo: string[] // category IDs, empty = all
  sortOrder: number
  isActive: boolean
  phase?: 'VEHICLE_CONFIG' | 'ACCESSORY'
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
  imageStorageId?: string | null
  imageBlob?: Blob
  sortOrder: number
  isActive: boolean
  isDefault: boolean
  priceOnRequest?: boolean
  requiresInput?: { enabled: boolean; label: string }
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
