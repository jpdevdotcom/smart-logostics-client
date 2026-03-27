export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export const endpoints = {
  warehouseById: '/api/v1/warehouses',
  itemById: '/api/v1/items',
  itemBySku: '/api/v1/items/sku',
  inventoryReport: '/api/v1/inventory/report',
  inventoryById: '/api/v1/inventory',
  inventoryAdd: '/api/v1/inventory/add',
  inventoryTransfer: '/api/v1/inventory/transfer',
}
