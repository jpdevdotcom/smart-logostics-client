import { apiClient } from './client'
import { endpoints } from './endpoints'
import { isRecord, pickNumber, pickString } from './helpers'
import type { IntakeInput, InventoryItem, Movement, TransferInput, Warehouse } from './types'

type ReportItem = {
  itemId: number
  name: string
  sku: string
  storageRequirement: string
  quantity: number
  lowStock: boolean
}

type ReportWarehouse = {
  warehouseId: number
  name: string
  location: string
  type: string
  totalCapacity: number
  currentOccupancy: number
  percentFull: number
  items: ReportItem[]
}

type InventoryReportApi = {
  data: ReportWarehouse[]
  meta?: {
    page: number
    limit: number
    totalWarehouses: number
    totalPages: number
  }
}

export async function getInventoryReport(): Promise<{
  warehouses: Warehouse[]
  items: InventoryItem[]
}> {
  const response = await apiClient.get(endpoints.inventoryReport, {
    params: { page: 1, limit: 50 },
  })

  const report = parseReport(response.data)
  const warehouses = report?.data ?? []

  const mappedWarehouses: Warehouse[] = warehouses.map((warehouse) => ({
    id: String(warehouse.warehouseId),
    name: warehouse.name,
    location: warehouse.location,
    capacity: warehouse.totalCapacity,
    occupancy: warehouse.currentOccupancy,
    temperatureZone: warehouse.type,
    status: 'Active',
  }))

  const items: InventoryItem[] = warehouses.flatMap((warehouse) =>
    warehouse.items.map((item) => ({
      id: `${warehouse.warehouseId}-${item.itemId}`,
      itemId: item.itemId,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      warehouseId: String(warehouse.warehouseId),
      warehouseName: warehouse.name,
      storageRequirement: item.storageRequirement,
      isPerishable: item.storageRequirement === 'COLD',
      status: item.lowStock ? 'Low stock' : 'In stock',
    }))
  )

  return { warehouses: mappedWarehouses, items }
}

export async function getMovements(): Promise<Movement[]> {
  return []
}

export async function createTransfer(payload: TransferInput): Promise<void> {
  await apiClient.post(endpoints.inventoryTransfer, payload)
}

export async function createIntake(payload: IntakeInput): Promise<void> {
  await apiClient.post(endpoints.inventoryAdd, payload)
}

function parseReport(payload: unknown): InventoryReportApi | null {
  if (!isRecord(payload)) return null
  const data = payload.data
  if (!Array.isArray(data)) return null
  return {
    data: data
      .map((entry) => (isRecord(entry) ? parseWarehouse(entry) : null))
      .filter((entry): entry is ReportWarehouse => Boolean(entry)),
    meta: isRecord(payload.meta) ? (payload.meta as InventoryReportApi['meta']) : undefined,
  }
}

function parseWarehouse(record: Record<string, unknown>): ReportWarehouse | null {
  const warehouseId = pickNumber(record, ['warehouseId'])
  const name = pickString(record, ['name'])
  const location = pickString(record, ['location'])
  const type = pickString(record, ['type'])
  const totalCapacity = pickNumber(record, ['totalCapacity']) ?? 0
  const currentOccupancy = pickNumber(record, ['currentOccupancy']) ?? 0
  const percentFull = pickNumber(record, ['percentFull']) ?? 0

  if (
    warehouseId === undefined ||
    !name ||
    !location ||
    !type
  ) {
    return null
  }

  const itemsRaw = record.items
  const items = Array.isArray(itemsRaw)
    ? itemsRaw
        .map((item) => (isRecord(item) ? parseItem(item) : null))
        .filter((item): item is ReportItem => Boolean(item))
    : []

  return {
    warehouseId,
    name,
    location,
    type,
    totalCapacity,
    currentOccupancy,
    percentFull,
    items,
  }
}

function parseItem(record: Record<string, unknown>): ReportItem | null {
  const itemId = pickNumber(record, ['itemId'])
  const name = pickString(record, ['name'])
  const sku = pickString(record, ['sku'])
  const storageRequirement = pickString(record, ['storageRequirement'])
  const quantity = pickNumber(record, ['quantity'])
  const lowStockValue = record.lowStock

  if (
    itemId === undefined ||
    !name ||
    !sku ||
    !storageRequirement ||
    quantity === undefined
  ) {
    return null
  }

  return {
    itemId,
    name,
    sku,
    storageRequirement,
    quantity,
    lowStock: Boolean(lowStockValue),
  }
}

export type { IntakeInput, InventoryItem, Movement, TransferInput, Warehouse }
