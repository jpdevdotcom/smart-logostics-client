import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  Boxes,
  ClipboardList,
  RefreshCw,
  Snowflake,
  Truck,
  Warehouse as WarehouseIcon,
} from 'lucide-react'
import {
  createIntake,
  createTransfer,
  getInventoryReport,
  type InventoryItem,
  type Movement,
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
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { Skeleton } from '#/components/ui/skeleton'
import { cn } from '#/lib/utils'
import { Combobox } from '#/components/ui/combobox'

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
  const [movements, setMovements] = useState<Movement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const [transferForm, setTransferForm] = useState(initialTransferState)
  const [intakeForm, setIntakeForm] = useState(initialIntakeState)
  const [activeTab, setActiveTab] = useState<'warehouses' | 'inventory' | 'movements'>(
    'warehouses'
  )

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const [{ warehouses: warehouseData, items: inventoryData }] =
        await Promise.all([getInventoryReport()])
      setWarehouses(warehouseData)
      setInventory(inventoryData)
      setMovements([])
      setLastUpdated(new Date().toLocaleString())
    } finally {
      setLoading(false)
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
    return {
      warehouses: warehouses.length,
      totalSku: inventory.length,
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
        label: `${item.name ?? 'Item'} · ${item.sku ?? 'No SKU'} (#${item.itemId ?? '—'})`,
        keywords: `${item.sku ?? ''} ${item.name ?? ''} ${item.itemId ?? ''}`,
      })),
    [itemMap]
  )

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: warehouse.id ?? '',
        label: `${warehouse.name ?? 'Warehouse'} · ${warehouse.location ?? 'Unknown'} (#${warehouse.id ?? '—'})`,
        keywords: `${warehouse.name ?? ''} ${warehouse.location ?? ''} ${warehouse.id ?? ''}`,
      })),
    [warehouses]
  )

  const handleTransferSubmit = async () => {
    const quantity = Number(transferForm.quantity)
    const itemId = Number(transferForm.itemId)
    const fromWarehouseId = Number(transferForm.fromWarehouseId)
    const toWarehouseId = Number(transferForm.toWarehouseId)
    if (!transferForm.sku) return
    if (!Number.isFinite(itemId) || !Number.isFinite(fromWarehouseId) || !Number.isFinite(toWarehouseId)) {
      return
    }
    if (!Number.isFinite(quantity) || quantity <= 0) return

    await createTransfer({
      itemId,
      fromWarehouseId,
      toWarehouseId,
      sku: transferForm.sku,
      quantity,
    })
    setTransferForm(initialTransferState)
    void loadData(true)
  }

  const handleIntakeSubmit = async () => {
    const quantity = Number(intakeForm.quantity)
    const itemId = Number(intakeForm.itemId)
    const warehouseId = Number(intakeForm.warehouseId)
    if (!Number.isFinite(itemId) || !Number.isFinite(warehouseId)) return
    if (!Number.isFinite(quantity) || quantity <= 0) return

    await createIntake({
      itemId,
      warehouseId,
      quantity,
    })
    setIntakeForm(initialIntakeState)
    void loadData(true)
  }

  const perishableBadge = (item: InventoryItem) => {
    if (item.storageRequirement === 'COLD') {
      return <Badge variant="warning">Cold storage</Badge>
    }
    return <Badge>Standard</Badge>
  }

  return (
    <main className="page-wrap px-4 pb-12 pt-10">
      <section
        id="overview"
        className="grid gap-6 rounded-3xl border border-slate-200/60 bg-white/80 p-8 shadow-lg shadow-blue-100/50"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="section-kicker">Operations Dashboard</p>
            <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
              Smart Logistics Control Center
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Track perishable and non-perishable goods across every warehouse,
              keep inventory healthy, and move stock where demand is strongest.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-blue-200 text-blue-700"
              onClick={() => loadData(true)}
              disabled={refreshing}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
            <Button className="bg-blue-600 text-white hover:bg-blue-500">
              View alerts
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
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
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
            Live API integration
          </span>
          {lastUpdated ? <span>Last updated: {lastUpdated}</span> : null}
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card id="warehouses" className="glass-panel">
          <CardHeader>
            <CardTitle>Warehouse Snapshot</CardTitle>
            <CardDescription>
              Capacity, utilization, and temperature zones for each location.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <TableSkeleton rows={4} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-slate-500">
                        No warehouses returned by the API yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouses.map((warehouse, index) => (
                      <TableRow key={warehouse.id ?? warehouse.name ?? index}>
                        <TableCell>
                          <p className="font-semibold text-slate-900">
                            {warehouse.name ?? 'Unnamed warehouse'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {warehouse.temperatureZone ?? 'Ambient'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {warehouse.location ?? 'No location data'}
                        </TableCell>
                        <TableCell>
                          {warehouse.occupancy ?? 0} / {warehouse.capacity ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="success">{warehouse.status ?? 'Active'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
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
              <p className="text-sm font-semibold text-slate-700">New Stock Intake</p>
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
              <p className="text-sm font-semibold text-slate-700">Stock Transfer</p>
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
                  <Input
                    value={transferForm.sku}
                    readOnly
                  />
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

      <section id="inventory" className="mt-10">
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>Inventory by SKU</CardTitle>
                <CardDescription>
                  Perishable status, quantities, and warehouse assignments.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {['warehouses', 'inventory', 'movements'].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeTab === tab ? 'default' : 'outline'}
                    className={cn(
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'border-slate-200 text-slate-600'
                    )}
                    onClick={() =>
                      setActiveTab(tab as 'warehouses' | 'inventory' | 'movements')
                    }
                  >
                    {tab}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeTab === 'warehouses' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Zone</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.map((warehouse, index) => (
                    <TableRow key={`tab-${warehouse.id ?? index}`}>
                      <TableCell>{warehouse.name ?? 'Warehouse'}</TableCell>
                      <TableCell>{warehouse.manager ?? '—'}</TableCell>
                      <TableCell>{warehouse.contact ?? '—'}</TableCell>
                      <TableCell>{warehouse.temperatureZone ?? 'Ambient'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {activeTab === 'inventory' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Perishable</TableHead>
                    <TableHead>Storage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">
                        No inventory records returned yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inventory.map((item, index) => (
                      <TableRow key={item.id ?? item.sku ?? index}>
                        <TableCell>
                          <p className="font-semibold text-slate-900">
                            {item.name ?? 'Item'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.sku ?? 'No SKU'}
                          </p>
                        </TableCell>
                        <TableCell>{item.warehouseName ?? item.warehouseId ?? '—'}</TableCell>
                        <TableCell>
                          {item.quantity ?? 0} {item.unit ?? ''}
                        </TableCell>
                        <TableCell>{perishableBadge(item)}</TableCell>
                        <TableCell>{item.storageRequirement ?? 'STANDARD'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}

            {activeTab === 'movements' && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>ETA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500">
                        No movement records returned yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    movements.map((movement, index) => (
                      <TableRow key={movement.id ?? index}>
                        <TableCell>
                          <p className="font-semibold text-slate-900">
                            {movement.itemName ?? 'Item'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {movement.createdAt ?? '—'}
                          </p>
                        </TableCell>
                        <TableCell>
                          {movement.fromWarehouse ?? '—'} → {movement.toWarehouse ?? '—'}
                        </TableCell>
                        <TableCell>{movement.quantity ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant="primary">{movement.status ?? 'In transit'}</Badge>
                        </TableCell>
                        <TableCell>{movement.eta ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section id="movements" className="mt-10 grid gap-6 md:grid-cols-3">
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Cold Chain</CardTitle>
            <CardDescription>
              Maintain temperature-sensitive integrity for perishables.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Route perishable items through refrigerated zones and monitor
              expiry windows to reduce waste.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <Snowflake className="h-4 w-4" />
              Perishable control enabled
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Dispatch Priority</CardTitle>
            <CardDescription>
              Assign transfers by urgency and available capacity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Coordinate outgoing shipments by warehouse availability and regional
              demand signals.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <Truck className="h-4 w-4" />
              24-hour delivery window
            </div>
          </CardContent>
        </Card>
        <Card className="glass-panel">
          <CardHeader>
            <CardTitle>Stock Health</CardTitle>
            <CardDescription>
              Balance inventory between perishable and shelf-stable products.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Keep safety stock levels aligned with forecasts across every
              warehouse.
            </p>
            <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
              <ClipboardList className="h-4 w-4" />
              Automated variance checks
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
          <p className="mt-2 text-3xl font-semibold text-slate-900">
            {value}
          </p>
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

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  )
}
