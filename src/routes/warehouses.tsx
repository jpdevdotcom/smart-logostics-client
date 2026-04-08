import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import {
  createWarehouse,
  deleteWarehouse,
  getInventoryReport,
  getWarehouses,
  type Warehouse,
  type WarehouseInput,
} from '#/lib/api'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Skeleton } from '#/components/ui/skeleton'
import { pushLoading } from '#/lib/notifications'
import { extractMessage } from '#/lib/api/helpers'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

export const Route = createFileRoute('/warehouses')({
  component: WarehousesPage,
})

type WarehouseFilter = 'all' | 'cold' | 'standard'

function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [inventoryWarehouses, setInventoryWarehouses] = useState<Warehouse[]>(
    [],
  )
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<WarehouseFilter>('all')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [totalPages, setTotalPages] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Warehouse | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<WarehouseInput>({
    name: '',
    location: '',
    maxCapacity: 0,
    type: 'STANDARD',
  })
  const [addSubmitting, setAddSubmitting] = useState(false)

  const loadWarehouses = async (currentPage: number) => {
    const [warehousesResponse, inventoryReport] = await Promise.all([
      getWarehouses(currentPage, pageSize),
      getInventoryReport(1, 100),
    ])

    setWarehouses(warehousesResponse.warehouses)
    setInventoryWarehouses(inventoryReport.warehouses)
    setTotalPages(warehousesResponse.meta.totalPages)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        await loadWarehouses(page)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [page])

  const filtered = useMemo(() => {
    const reportByWarehouseId = new Map(
      inventoryWarehouses
        .filter((warehouse) => warehouse.id !== undefined)
        .map((warehouse) => [warehouse.id as string, warehouse]),
    )

    const mergedWarehouses = warehouses.map((warehouse) => {
      const reportWarehouse = warehouse.id
        ? reportByWarehouseId.get(warehouse.id)
        : undefined

      return {
        ...warehouse,
        capacity: reportWarehouse?.capacity ?? warehouse.capacity,
        occupancy: reportWarehouse?.occupancy ?? warehouse.occupancy,
      }
    })

    const term = query.trim().toLowerCase()
    return mergedWarehouses
      .filter((warehouse) => {
        const matchesQuery = term
          ? `${warehouse.name ?? ''} ${warehouse.location ?? ''}`
              .toLowerCase()
              .includes(term)
          : true
        const type = (warehouse.temperatureZone ?? '').toLowerCase()
        const matchesFilter =
          filter === 'all' ||
          (filter === 'cold' && type.includes('cold')) ||
          (filter === 'standard' && !type.includes('cold'))
        return matchesQuery && matchesFilter
      })
      .sort((left, right) =>
        compareNames(left.name ?? 'Warehouse', right.name ?? 'Warehouse'),
      )
  }, [filter, inventoryWarehouses, query, warehouses])

  const handleDelete = async (warehouse: Warehouse) => {
    const id = Number(warehouse.id)
    if (!Number.isFinite(id)) return
    const loadingToast = pushLoading('Deleting warehouse', 'Please wait...')
    try {
      await deleteWarehouse(id)
      loadingToast.updateSuccess({
        title: 'Warehouse deleted',
        message: `${warehouse.name ?? 'Warehouse'} was deleted.`,
        tone: 'success',
      })
      await loadWarehouses(page)
    } catch (error) {
      const message =
        typeof error === 'object' && error && 'response' in error
          ? extractMessage(
              (error as { response?: { data?: unknown } }).response?.data,
            )
          : undefined
      loadingToast.updateError({
        title: 'Delete failed',
        message: message ?? 'Unable to delete the warehouse.',
        tone: 'error',
      })
    }
  }

  useEffect(() => {
    setPage(1)
  }, [query, filter])

  const handleAddWarehouse = async () => {
    if (
      !addForm.name.trim() ||
      !addForm.location.trim() ||
      !Number.isFinite(addForm.maxCapacity) ||
      addForm.maxCapacity <= 0
    ) {
      return
    }
    setAddSubmitting(true)
    const loadingToast = pushLoading('Adding warehouse', 'Please wait...')
    try {
      await createWarehouse(addForm)
      loadingToast.updateSuccess({
        title: 'Warehouse added',
        message: `${addForm.name} was created.`,
        tone: 'success',
      })
      setShowAddModal(false)
      setAddForm({ name: '', location: '', maxCapacity: 0, type: 'STANDARD' })
      await loadWarehouses(page)
    } catch (error) {
      const message =
        typeof error === 'object' && error && 'response' in error
          ? extractMessage(
              (error as { response?: { data?: unknown } }).response?.data,
            )
          : undefined
      loadingToast.updateError({
        title: 'Failed to add warehouse',
        message: message ?? 'Please review the details and try again.',
        tone: 'error',
      })
    } finally {
      setAddSubmitting(false)
    }
  }

  return (
    <main className="page-wrap px-4 py-12">
      <section className="grid gap-6">
        <Card className="glass-panel">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Warehouses</CardTitle>
              <CardDescription>
                Filter by location or storage type.
              </CardDescription>
            </div>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => setShowAddModal(true)}
            >
              Add Warehouse
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
              <div className="grid gap-2">
                <label className="text-xs font-semibold text-slate-600">
                  Search
                </label>
                <Input
                  placeholder="Search warehouse or location"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['all', 'cold', 'standard'] as const).map((value) => (
                  <Button
                    key={value}
                    variant={filter === value ? 'default' : 'outline'}
                    className={
                      filter === value
                        ? 'rounded-full bg-blue-600 px-4 text-white'
                        : 'rounded-full border-slate-200 px-4 text-slate-600'
                    }
                    onClick={() => setFilter(value)}
                  >
                    {value.charAt(0).toUpperCase()}
                    {value.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="grid gap-2">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-slate-500">
                No warehouses match your filters.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((warehouse, index) => (
                    <TableRow key={warehouse.id ?? index}>
                      <TableCell>
                        <p className="font-semibold text-slate-900">
                          {warehouse.name ?? 'Warehouse'}
                        </p>
                        <p className="text-xs text-slate-500">
                          ID {warehouse.id ?? '—'}
                        </p>
                      </TableCell>
                      <TableCell>{warehouse.location ?? '—'}</TableCell>
                      <TableCell>
                        {warehouse.occupancy ?? 0} / {warehouse.capacity ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            warehouse.temperatureZone === 'COLD'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {formatStorageLabel(warehouse.temperatureZone)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          className="border-rose-200 text-rose-600"
                          onClick={() => setDeleteTarget(warehouse)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-200 text-slate-600"
                    onClick={() =>
                      setPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Dialog
        open={showAddModal}
        onOpenChange={(open) => {
          if (!addSubmitting) setShowAddModal(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Warehouse</DialogTitle>
            <DialogDescription>
              Fill in the details to create a new warehouse.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Name</Label>
              <Input
                placeholder="e.g. Warehouse North 1"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Location</Label>
              <Input
                placeholder="e.g. Manila"
                value={addForm.location}
                onChange={(e) =>
                  setAddForm((prev) => ({ ...prev, location: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Max Capacity</Label>
              <Input
                type="number"
                placeholder="e.g. 500"
                value={addForm.maxCapacity === 0 ? '' : addForm.maxCapacity}
                onChange={(e) =>
                  setAddForm((prev) => ({
                    ...prev,
                    maxCapacity: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(['STANDARD', 'COLD'] as const).map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={addForm.type === value ? 'default' : 'outline'}
                    className={
                      addForm.type === value
                        ? 'rounded-full bg-blue-600 px-4 text-white'
                        : 'rounded-full border-slate-200 px-4 text-slate-600'
                    }
                    onClick={() =>
                      setAddForm((prev) => ({ ...prev, type: value }))
                    }
                  >
                    {value}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => setShowAddModal(false)}
              disabled={addSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-500"
              onClick={() => void handleAddWarehouse()}
              disabled={
                addSubmitting ||
                !addForm.name.trim() ||
                !addForm.location.trim() ||
                !Number.isFinite(addForm.maxCapacity) ||
                addForm.maxCapacity <= 0
              }
            >
              Add Warehouse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={() => setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete warehouse</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `Delete ${deleteTarget.name ?? 'this warehouse'}? This cannot be undone.`
                : 'This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-slate-200"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-rose-600 text-white hover:bg-rose-500"
              onClick={() => {
                if (deleteTarget) {
                  void handleDelete(deleteTarget)
                }
                setDeleteTarget(null)
              }}
            >
              Confirm delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function formatStorageLabel(value?: string) {
  if (!value) return 'STANDARD'
  return value.replace(/_/g, ' ')
}

function compareNames(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}
