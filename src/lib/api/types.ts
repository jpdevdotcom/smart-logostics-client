export type Warehouse = {
  id?: string
  name?: string
  location?: string
  capacity?: number
  occupancy?: number
  temperatureZone?: string
  status?: string
  manager?: string
  contact?: string
}

export type InventoryItem = {
  id?: string
  itemId?: number
  name?: string
  sku?: string
  category?: string
  isPerishable?: boolean
  storageRequirement?: string
  quantity?: number
  unit?: string
  warehouseId?: string
  warehouseName?: string
  expiryDate?: string
  status?: string
}

export type Movement = {
  id?: string
  itemName?: string
  fromWarehouse?: string
  toWarehouse?: string
  quantity?: number
  status?: string
  eta?: string
  createdAt?: string
}

export type TransferInput = {
  itemId: number
  fromWarehouseId: number
  toWarehouseId: number
  sku: string
  quantity: number
}

export type IntakeInput = {
  warehouseId: number
  itemId: number
  quantity: number
}
