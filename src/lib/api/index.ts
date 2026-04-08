import { apiClient } from './client'
import { endpoints } from './endpoints'
import {
  isRecord,
  mapApiList,
  mapInventoryItem,
  mapWarehouse,
  pickNumber,
  pickString,
} from './helpers'
import type {
  IntakeInput,
  InventoryItem,
  ItemInput,
  Movement,
  TransferInput,
  Warehouse,
  WarehouseInput,
} from './types'

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

type ListMeta = {
  page: number
  limit: number
  totalPages: number
  totalCount?: number
}

export async function getInventoryReport(
  page = 1,
  limit = 50,
): Promise<{
  warehouses: Warehouse[]
  items: InventoryItem[]
  meta?: InventoryReportApi['meta']
}> {
  const response = await apiClient.get(endpoints.inventoryReport, {
    params: { page, limit },
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
    })),
  )

  return { warehouses: mappedWarehouses, items, meta: report?.meta }
}

export async function getWarehouses(
  page = 1,
  limit = 10,
): Promise<{
  warehouses: Warehouse[]
  meta: ListMeta
}> {
  const response = await apiClient.get(endpoints.warehouseById, {
    params: { page, limit },
  })

  return {
    warehouses: mapApiList(response.data, mapWarehouse),
    meta: parseListMeta(response.data, page, limit),
  }
}

export async function getItems(
  page = 1,
  limit = 10,
): Promise<{
  items: InventoryItem[]
  meta: ListMeta
}> {
  const response = await apiClient.get(endpoints.itemById, {
    params: { page, limit },
  })

  return {
    items: mapApiList(response.data, mapInventoryItem),
    meta: parseListMeta(response.data, page, limit),
  }
}

export async function getMovements(): Promise<Movement[]> {
  return []
}

export async function createTransfer(payload: TransferInput): Promise<void> {
  await apiClient.post(endpoints.inventoryTransfer, payload, {
    suppressGlobalError: true,
  })
}

export async function createIntake(payload: IntakeInput): Promise<void> {
  await apiClient.post(endpoints.inventoryAdd, payload, {
    suppressGlobalError: true,
  })
}

export async function deleteWarehouse(id: number): Promise<void> {
  await apiClient.delete(`${endpoints.warehouseById}/${id}`, {
    suppressGlobalError: true,
  })
}

export async function createWarehouse(payload: WarehouseInput): Promise<void> {
  await apiClient.post(endpoints.warehouseById, payload, {
    suppressGlobalError: true,
  })
}

export async function createItem(payload: ItemInput): Promise<void> {
  await apiClient.post(endpoints.itemById, payload, {
    suppressGlobalError: true,
  })
}

function parseListMeta(
  payload: unknown,
  page: number,
  limit: number,
): ListMeta {
  if (!isRecord(payload)) {
    return { page, limit, totalPages: 1 }
  }

  const metaSource = isRecord(payload.meta)
    ? payload.meta
    : isRecord(payload.pagination)
      ? payload.pagination
      : payload

  const currentPage = pickNumber(metaSource, ['page', 'currentPage']) ?? page
  const currentLimit = pickNumber(metaSource, ['limit', 'pageSize']) ?? limit
  const totalPages = pickNumber(metaSource, ['totalPages', 'pages']) ?? 1
  const totalCount = pickNumber(metaSource, [
    'totalCount',
    'total',
    'totalItems',
    'totalWarehouses',
  ])

  return {
    page: currentPage,
    limit: currentLimit,
    totalPages,
    totalCount,
  }
}

function parseReport(payload: unknown): InventoryReportApi | null {
  if (!isRecord(payload)) return null
  const data = payload.data
  if (!Array.isArray(data)) return null
  return {
    data: data
      .map((entry) => (isRecord(entry) ? parseWarehouse(entry) : null))
      .filter((entry): entry is ReportWarehouse => Boolean(entry)),
    meta: isRecord(payload.meta)
      ? (payload.meta as InventoryReportApi['meta'])
      : undefined,
  }
}

function parseWarehouse(
  record: Record<string, unknown>,
): ReportWarehouse | null {
  const warehouseId = pickNumber(record, ['warehouseId'])
  const name = pickString(record, ['name'])
  const location = pickString(record, ['location'])
  const type = pickString(record, ['type'])
  const totalCapacity = pickNumber(record, ['totalCapacity']) ?? 0
  const currentOccupancy = pickNumber(record, ['currentOccupancy']) ?? 0
  const percentFull = pickNumber(record, ['percentFull']) ?? 0

  if (warehouseId === undefined || !name || !location || !type) {
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

export type {
  IntakeInput,
  InventoryItem,
  ItemInput,
  Movement,
  TransferInput,
  Warehouse,
  WarehouseInput,
}
