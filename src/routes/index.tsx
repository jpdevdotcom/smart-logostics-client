import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Boxes,
  ClipboardList,
  RefreshCw,
  Snowflake,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import {
  createIntake,
  createTransfer,
  getInventoryReport,
  type InventoryItem,
  type Warehouse,
} from '#/lib/api'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { cn } from '#/lib/utils'
import { Combobox } from '#/components/ui/combobox'
import { pushLoading, pushNotification } from '#/lib/notifications'
import { extractMessage } from '#/lib/api/helpers'

export const Route = createFileRoute('/')({ component: App })

type TransferFormState = {
  itemId: string
  sku: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: string
}

type IntakeFormState = {
  itemId: string
  warehouseId: string
  quantity: string
}

type ActivityEntry = {
  id?: string
  type: 'intake' | 'transfer'
  title: string
  detail: string
  timestamp: string
}

const initialTransferState: TransferFormState = {
  itemId: '',
  sku: '',
  fromWarehouseId: '',
  toWarehouseId: '',
  quantity: '',
}

const initialIntakeState: IntakeFormState = {
  itemId: '',
  warehouseId: '',
  quantity: '',
}

function App() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([])
  const [activityPage, setActivityPage] = useState(1)
  const activityPageSize = 6

  const [transferForm, setTransferForm] = useState(initialTransferState)
  const [intakeForm, setIntakeForm] = useState(initialIntakeState)

  useEffect(() => {
    const raw = localStorage.getItem('smart-logistics-activity-log')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw) as ActivityEntry[]
      if (Array.isArray(parsed)) {
        setActivityLog(parsed)
      }
    } catch {
      // ignore invalid cache
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'smart-logistics-activity-log',
      JSON.stringify(activityLog),
    )
  }, [activityLog])

  useEffect(() => {
    const maxPage = Math.max(
      1,
      Math.ceil(activityLog.length / activityPageSize),
    )
    if (activityPage > maxPage) {
      setActivityPage(maxPage)
    }
  }, [activityLog, activityPage, activityPageSize])

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      }
      const [{ warehouses: warehouseData, items: inventoryData }] =
        await Promise.all([getInventoryReport(1, 50)])
      setWarehouses(warehouseData)
      setInventory(inventoryData)
      setLastUpdated(new Date().toLocaleString())
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const totals = useMemo(() => {
    const perishableCount = inventory.filter((item) => item.isPerishable).length
    const lowStockCount = inventory.filter((item) => {
      const qty = item.quantity ?? 0
      return qty > 0 && qty <= 10
    }).length
    const uniqueSkuCount = new Set(
      inventory
        .map((item) => item.itemId ?? item.sku)
        .filter((value): value is string | number => value !== undefined),
    ).size
    return {
      warehouses: warehouses.length,
      totalSku: uniqueSkuCount,
      perishable: perishableCount,
      lowStock: lowStockCount,
    }
  }, [inventory, warehouses.length])

  const itemMap = useMemo(() => {
    const map = new Map<number, InventoryItem>()
    inventory.forEach((item) => {
      if (item.itemId === undefined) return
      if (!map.has(item.itemId)) {
        map.set(item.itemId, item)
      }
    })
    return map
  }, [inventory])

  const itemOptions = useMemo(
    () =>
      Array.from(itemMap.values()).map((item) => ({
        value: String(item.itemId ?? ''),
        label: item.name ?? 'Item',
        keywords: `${item.sku ?? ''} ${item.name ?? ''} ${item.itemId ?? ''}`,
      })),
    [itemMap],
  )

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: warehouse.id ?? '',
        label: warehouse.name ?? 'Warehouse',
        keywords: `${warehouse.name ?? ''} ${warehouse.location ?? ''} ${warehouse.id ?? ''}`,
      })),
    [warehouses],
  )

  const selectedItemName = useMemo(() => {
    if (!intakeForm.itemId) return null
    const item = itemMap.get(Number(intakeForm.itemId))
    return item?.name ?? null
  }, [intakeForm.itemId, itemMap])

  const activityTotalPages = Math.max(
    1,
    Math.ceil(activityLog.length / activityPageSize),
  )
  const activitySlice = useMemo(() => {
    const start = (activityPage - 1) * activityPageSize
    return activityLog.slice(start, start + activityPageSize)
  }, [activityLog, activityPage, activityPageSize])

  const addActivity = (entry: ActivityEntry) => {
    setActivityLog((prev) => {
      const next = [entry, ...prev]
      return next.slice(0, 50)
    })
    setActivityPage(1)
  }

  const handleTransferSubmit = async () => {
    const quantity = Number(transferForm.quantity)
    const itemId = Number(transferForm.itemId)
    const fromWarehouseId = Number(transferForm.fromWarehouseId)
    const toWarehouseId = Number(transferForm.toWarehouseId)
    if (!transferForm.sku) {
      pushNotification({
        title: 'Transfer missing SKU',
        message: 'Select an item so the SKU is filled in.',
        tone: 'warning',
      })
      return
    }
    if (
      !isPositiveInt(itemId) ||
      !isPositiveInt(fromWarehouseId) ||
      !isPositiveInt(toWarehouseId)
    ) {
      pushNotification({
        title: 'Transfer details incomplete',
        message: 'Choose an item and both warehouses.',
        tone: 'warning',
      })
      return
    }
    if (!isPositiveInt(quantity)) {
      pushNotification({
        title: 'Invalid quantity',
        message: 'Quantity must be a positive whole number.',
        tone: 'warning',
      })
      return
    }
    if (!/^[A-Z]{3}-\d{5}-[A-Z]$/.test(transferForm.sku)) {
      pushNotification({
        title: 'Invalid SKU format',
        message: 'SKU must look like ABC-12345-Z.',
        tone: 'warning',
      })
      return
    }
    if (fromWarehouseId === toWarehouseId) {
      pushNotification({
        title: 'Invalid transfer',
        message: 'Source and destination warehouses must be different.',
        tone: 'warning',
      })
      return
    }

    const loadingToast = pushLoading(
      'Sending transfer',
      'Submitting transfer request.',
    )
    try {
      await createTransfer({
        itemId,
        fromWarehouseId,
        toWarehouseId,
        sku: transferForm.sku,
        quantity,
      })
      loadingToast.updateSuccess({
        title: 'Transfer submitted',
        message: 'Inventory transfer was recorded.',
        tone: 'success',
      })
      addActivity({
        id: crypto.randomUUID(),
        type: 'transfer',
        title: 'Transfer sent',
        detail: `Item ${transferForm.sku} • Qty ${quantity}`,
        timestamp: new Date().toLocaleString(),
      })
      setTransferForm(initialTransferState)
      void loadData(true)
    } catch (error) {
      const message =
        typeof error === 'object' && error && 'response' in error
          ? extractMessage(
              (error as { response?: { data?: unknown } }).response?.data,
            )
          : undefined
      loadingToast.updateError({
        title: 'Transfer failed',
        message: message ?? 'Please review the details and try again.',
        tone: 'error',
      })
    }
  }

  const handleIntakeSubmit = async () => {
    const quantity = Number(intakeForm.quantity)
    const itemId = Number(intakeForm.itemId)
    const warehouseId = Number(intakeForm.warehouseId)
    if (!isPositiveInt(itemId) || !isPositiveInt(warehouseId)) {
      pushNotification({
        title: 'Intake details incomplete',
        message: 'Choose an item and a warehouse.',
        tone: 'warning',
      })
      return
    }
    if (!isPositiveInt(quantity)) {
      pushNotification({
        title: 'Invalid quantity',
        message: 'Quantity must be a positive whole number.',
        tone: 'warning',
      })
      return
    }

    const loadingToast = pushLoading('Recording intake', 'Submitting intake.')
    try {
      await createIntake({
        itemId,
        warehouseId,
        quantity,
      })
      loadingToast.updateSuccess({
        title: 'Intake recorded',
        message: 'Inventory intake was recorded.',
        tone: 'success',
      })
      addActivity({
        id: crypto.randomUUID(),
        type: 'intake',
        title: 'Intake recorded',
        detail: `Item ${selectedItemName ?? 'Item'} • Qty ${quantity}`,
        timestamp: new Date().toLocaleString(),
      })
      setIntakeForm(initialIntakeState)
      void loadData(true)
    } catch (error) {
      const message =
        typeof error === 'object' && error && 'response' in error
          ? extractMessage(
              (error as { response?: { data?: unknown } }).response?.data,
            )
          : undefined
      loadingToast.updateError({
        title: 'Intake failed',
        message: message ?? 'Please review the details and try again.',
        tone: 'error',
      })
    }
  }

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      <section
        id="overview"
        className="grid gap-6 rounded-3xl border border-blue-200/60 bg-blue-50/50 p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-blue-500 sm:text-4xl">
              Smart Logistics Control Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track perishable and non-perishable goods across every warehouse,
              keep inventory healthy, and move stock where demand is strongest.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Warehouses"
            value={totals.warehouses}
            description="Active storage locations"
            icon={<WarehouseIcon className="h-5 w-5" />}
          />
          <StatCard
            title="Total SKUs"
            value={totals.totalSku}
            description="Unique products tracked"
            icon={<Boxes className="h-5 w-5" />}
          />
          <StatCard
            title="Perishable"
            value={totals.perishable}
            description="Require cold-chain handling"
            icon={<Snowflake className="h-5 w-5" />}
          />
          <StatCard
            title="Low stock"
            value={totals.lowStock}
            description="Below threshold"
            icon={<ClipboardList className="h-5 w-5" />}
          />
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Workflow Summary</CardTitle>
            <CardDescription>
              Activity captured during this session.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm text-slate-600">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Recent activity
              </p>
              {activityLog.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  No activity logged yet. Record an intake or send a transfer.
                </p>
              ) : (
                <div className="mt-3 grid gap-3">
                  {activitySlice.map((entry, index) => (
                    <div
                      key={entry.id ?? `${entry.type}-${index}`}
                      className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
                    >
                      <span className="mt-1 h-2 w-2 rounded-full bg-blue-600" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {entry.title}
                        </p>
                        <p className="text-xs text-slate-500">{entry.detail}</p>
                        <p className="text-[11px] text-slate-400">
                          {entry.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                  {activityTotalPages > 1 ? (
                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Page {activityPage} of {activityTotalPages}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="h-7 border-slate-200 px-2 text-xs text-slate-600"
                          onClick={() =>
                            setActivityPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={activityPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          className="h-7 border-slate-200 px-2 text-xs text-slate-600"
                          onClick={() =>
                            setActivityPage((prev) =>
                              Math.min(activityTotalPages, prev + 1),
                            )
                          }
                          disabled={activityPage === activityTotalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
              <p className="text-xs font-semibold uppercase text-slate-500">
                Last refresh
              </p>
              <p className="mt-2 text-base text-slate-900">
                {lastUpdated ?? 'No refresh data yet.'}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Use the refresh button above to sync the latest report.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Record incoming stock or move inventory between warehouses.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3">
              <p className="text-sm font-semibold text-slate-700">
                New Stock Intake
              </p>
              <div className="grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Item ID">
                    <Combobox
                      value={intakeForm.itemId}
                      options={itemOptions}
                      placeholder="Select item"
                      searchPlaceholder="Search items"
                      onChange={(value) =>
                        setIntakeForm((prev) => ({
                          ...prev,
                          itemId: value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="Warehouse ID">
                    <Combobox
                      value={intakeForm.warehouseId}
                      options={warehouseOptions}
                      placeholder="Select warehouse"
                      searchPlaceholder="Search warehouses"
                      onChange={(value) =>
                        setIntakeForm((prev) => ({
                          ...prev,
                          warehouseId: value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Field label="Quantity">
                  <Input
                    type="number"
                    value={intakeForm.quantity}
                    onChange={(event) =>
                      setIntakeForm((prev) => ({
                        ...prev,
                        quantity: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Button
                  className="bg-blue-600 text-white hover:bg-blue-500"
                  onClick={handleIntakeSubmit}
                >
                  Record intake
                </Button>
              </div>
            </div>
            <Separator />
            <div className="grid gap-3">
              <p className="text-sm font-semibold text-slate-700">
                Stock Transfer
              </p>
              <div className="grid gap-3">
                <Field label="Item ID">
                  <Combobox
                    value={transferForm.itemId}
                    options={itemOptions}
                    placeholder="Select item"
                    searchPlaceholder="Search items"
                    onChange={(value) => {
                      const sku = itemMap.get(Number(value))?.sku ?? ''
                      setTransferForm((prev) => ({
                        ...prev,
                        itemId: value,
                        sku,
                      }))
                    }}
                  />
                </Field>
                <Field label="SKU">
                  <Input value={transferForm.sku} readOnly />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="From warehouse">
                    <Combobox
                      value={transferForm.fromWarehouseId}
                      options={warehouseOptions}
                      placeholder="Select source"
                      searchPlaceholder="Search warehouses"
                      onChange={(value) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          fromWarehouseId: value,
                        }))
                      }
                    />
                  </Field>
                  <Field label="To warehouse">
                    <Combobox
                      value={transferForm.toWarehouseId}
                      options={warehouseOptions}
                      placeholder="Select destination"
                      searchPlaceholder="Search warehouses"
                      onChange={(value) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          toWarehouseId: value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Quantity">
                    <Input
                      type="number"
                      value={transferForm.quantity}
                      onChange={(event) =>
                        setTransferForm((prev) => ({
                          ...prev,
                          quantity: event.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
                <Button
                  variant="outline"
                  className="border-blue-200 text-blue-700"
                  onClick={handleTransferSubmit}
                >
                  Send transfer
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: number
  description: string
  icon: ReactNode
}) {
  return (
    <Card className="glass-panel">
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm text-slate-600">{title}</CardTitle>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
          {icon}
        </span>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-slate-500">
        {description}
      </CardContent>
    </Card>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function isPositiveInt(value: number) {
  return Number.isInteger(value) && value > 0
}
