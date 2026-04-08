import type { InventoryItem, Movement, Warehouse } from './types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function getString(value: unknown) {
  return typeof value === 'string' ? value : undefined
}

export function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function getBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

export function pickString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = getString(record[key])
    if (value) return value
  }
  return undefined
}

export function pickNumber(
  record: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = getNumber(record[key])
    if (value !== undefined) return value
  }
  return undefined
}

export function pickBoolean(
  record: Record<string, unknown>,
  keys: string[],
): boolean | undefined {
  for (const key of keys) {
    const value = getBoolean(record[key])
    if (value !== undefined) return value
  }
  return undefined
}

export function extractMessage(payload: unknown): string | undefined {
  if (!payload) return undefined
  if (typeof payload === 'string') return payload
  if (!isRecord(payload)) return undefined

  const direct = pickString(payload, ['message', 'msg', 'detail', 'error'])
  if (direct) return direct

  const nested = payload.data
  if (isRecord(nested)) {
    return pickString(nested, ['message', 'msg', 'detail', 'error'])
  }

  return undefined
}

type Mapper<T> = (record: Record<string, unknown>) => T

export function mapApiList<T>(payload: unknown, mapper: Mapper<T>): T[] {
  if (Array.isArray(payload)) {
    return payload
      .map((item) => (isRecord(item) ? mapper(item) : mapper({})))
      .filter(Boolean)
  }

  if (isRecord(payload)) {
    const candidates = [
      payload.data,
      payload.results,
      payload.items,
      payload.warehouses,
      payload.inventory,
      payload.movements,
    ]

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate
          .map((item) => (isRecord(item) ? mapper(item) : mapper({})))
          .filter(Boolean)
      }
    }
  }

  return []
}

export function mapWarehouse(record: Record<string, unknown>): Warehouse {
  return {
    id:
      pickString(record, ['id', '_id', 'warehouseId']) ??
      (pickNumber(record, ['id', 'warehouseId']) !== undefined
        ? String(pickNumber(record, ['id', 'warehouseId']))
        : undefined),
    name: pickString(record, ['name', 'warehouseName']),
    location: pickString(record, ['location', 'address', 'city']),
    capacity: pickNumber(record, ['capacity', 'maxCapacity']),
    occupancy: pickNumber(record, [
      'occupancy',
      'currentStock',
      'utilization',
      'currentOccupancy',
    ]),
    temperatureZone: pickString(record, ['temperatureZone', 'zone', 'type']),
    status: pickString(record, ['status', 'state']),
    manager: pickString(record, ['manager', 'managerName']),
    contact: pickString(record, ['contact', 'phone', 'contactNumber']),
  }
}

export function mapInventoryItem(
  record: Record<string, unknown>,
): InventoryItem {
  const storageRequirement = pickString(record, [
    'storageRequirement',
    'storage_requirement',
    'requirement',
  ])

  return {
    id:
      pickString(record, ['id', '_id', 'itemId', 'inventoryId']) ??
      (pickNumber(record, ['id', 'itemId', 'inventoryId']) !== undefined
        ? String(pickNumber(record, ['id', 'itemId', 'inventoryId']))
        : undefined),
    itemId: pickNumber(record, ['itemId', 'id']),
    name: pickString(record, ['name', 'itemName', 'productName']),
    sku: pickString(record, ['sku', 'code', 'itemCode']),
    category: pickString(record, ['category', 'type']),
    isPerishable:
      pickBoolean(record, ['isPerishable', 'perishable']) ??
      storageRequirement === 'COLD',
    storageRequirement,
    quantity: pickNumber(record, ['quantity', 'qty', 'stock']),
    unit: pickString(record, ['unit', 'uom']),
    warehouseId: pickString(record, ['warehouseId', 'warehouse_id']),
    warehouseName: pickString(record, ['warehouseName', 'warehouse']),
    expiryDate: pickString(record, ['expiryDate', 'expiresAt', 'expiry']),
    status: pickString(record, ['status', 'state']),
  }
}

export function mapMovement(record: Record<string, unknown>): Movement {
  return {
    id: pickString(record, ['id', '_id', 'movementId', 'transferId']),
    itemName: pickString(record, ['itemName', 'productName', 'item']),
    fromWarehouse: pickString(record, ['fromWarehouse', 'source', 'from']),
    toWarehouse: pickString(record, ['toWarehouse', 'destination', 'to']),
    quantity: pickNumber(record, ['quantity', 'qty']),
    status: pickString(record, ['status', 'state']),
    eta: pickString(record, ['eta', 'estimatedArrival']),
    createdAt: pickString(record, ['createdAt', 'created_at', 'date']),
  }
}
