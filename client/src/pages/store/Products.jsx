import { useEffect, useRef, useState } from 'react'
import { Plus, Package, Search, ImageOff, Trash2, Pencil, Upload, X, Eye } from 'lucide-react'
import { listProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../../api/products'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field, Select } from '../../components/ui/Input'
import { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatMoney } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const emptyForm = {
  name: '',
  category: 'bag',
  rentPrice: '',
  depositPrice: '',
  imageUrl: '',
  plateNumber: '',
  status: 'available',
}

export default function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [viewProduct, setViewProduct] = useState(null)
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    listProducts(statusFilter || undefined)
      .then(setProducts)
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const query = search.trim().toLowerCase()
  const filtered = query
    ? products.filter((p) => [p.name, p.category, p.plateNumber].some((v) => v?.toLowerCase().includes(query)))
    : products
  const { page, setPage, pageCount, pageItems, total, pageSize } = usePagination(filtered, 10)

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (product) => {
    setEditing(product)
    setForm({
      name: product.name,
      category: product.category || 'bag',
      rentPrice: product.rentPrice,
      depositPrice: product.depositPrice || '',
      imageUrl: product.imageUrl || '',
      plateNumber: product.plateNumber || '',
      status: product.status,
    })
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    const payload = {
      name: form.name,
      category: form.category,
      rentPrice: Number(form.rentPrice),
      depositPrice: form.depositPrice === '' ? undefined : Number(form.depositPrice),
      imageUrl: form.imageUrl || undefined,
      plateNumber: form.plateNumber || undefined,
    }
    try {
      if (editing) {
        await updateProduct(editing._id, { ...payload, status: form.status })
      } else {
        await createProduct(payload)
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to save product'))
    } finally {
      setSaving(false)
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setUploading(true)
    try {
      const { url } = await uploadProductImage(file)
      setForm((f) => ({ ...f, imageUrl: url }))
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to upload image'))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDelete = async (product) => {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return
    await deleteProduct(product._id)
    load()
  }

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Products"
        subtitle="Everything your store has available to rent out."
        action={
          <Button icon={Plus} onClick={openCreate}>
            New product
          </Button>
        }
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-6 py-4 dark:border-ink-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="h-9 w-full rounded-lg border border-ink-200 bg-ink-50 pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100 dark:border-ink-700 dark:bg-ink-800 dark:focus:bg-ink-800"
              />
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
              <option value="">All statuses</option>
              <option value="available">Available</option>
              <option value="rented">Rented</option>
              <option value="damaged">Damaged</option>
              <option value="lost">Lost</option>
            </Select>
          </div>
          <span className="text-sm font-medium text-ink-400">{total} product(s)</span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <Spinner size={28} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No products yet"
            subtitle="Add your first rentable item to get started."
            action={
              <Button icon={Plus} size="sm" onClick={openCreate}>
                New product
              </Button>
            }
          />
        ) : (
          <>
            <Table
              onRowClick={(row) => setViewProduct(row)}
              columns={[
                {
                  key: 'name',
                  header: 'Product',
                  render: (row) => (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-100 dark:bg-ink-800">
                        {row.imageUrl ? (
                          <img src={row.imageUrl} alt={row.name} className="h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        ) : (
                          <ImageOff size={16} className="text-ink-300" />
                        )}
                      </div>
                      <span className="font-semibold text-ink-900 dark:text-white">{row.name}</span>
                    </div>
                  ),
                },
                { key: 'category', header: 'Category', render: (row) => <span className="capitalize">{row.category || 'other'}</span> },
                { key: 'plateNumber', header: 'Plate', render: (row) => row.plateNumber || '—' },
                { key: 'rentPrice', header: 'Rent price', render: (row) => formatMoney(row.rentPrice) },
                { key: 'depositPrice', header: 'Deposit', render: (row) => (row.depositPrice ? formatMoney(row.depositPrice) : '—') },
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewProduct(row)} />
                      <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(row)} />
                      <Button size="sm" variant="ghost" icon={Trash2} onClick={() => handleDelete(row)} />
                    </div>
                  ),
                },
              ]}
              data={pageItems}
            />
            <Pagination page={page} pageCount={pageCount} total={total} pageSize={pageSize} onChange={setPage} />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit product' : 'Add a new product'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button form="product-form" type="submit" loading={saving} disabled={uploading}>
              {editing ? 'Save changes' : 'Add product'}
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert>{error}</Alert>}

          <Field label="Product name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Leather handbag"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category">
              <Select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
                <option value="bag">Bag</option>
                <option value="clothing">Clothing</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            {editing && (
              <Field label="Status">
                <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="damaged">Damaged</option>
                  <option value="lost">Lost</option>
                </Select>
              </Field>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Rent price" required>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.rentPrice}
                onChange={(e) => setForm((f) => ({ ...f, rentPrice: e.target.value }))}
                placeholder="0.00"
                required
              />
            </Field>
            <Field label="Deposit price" hint="Optional">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.depositPrice}
                onChange={(e) => setForm((f) => ({ ...f, depositPrice: e.target.value }))}
                placeholder="0.00"
              />
            </Field>
          </div>

          <Field label="Photo" hint="Optional — JPG, PNG, WEBP or GIF, up to 5MB">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            {form.imageUrl ? (
              <div className="relative w-40 overflow-hidden rounded-lg border border-ink-200">
                <img src={form.imageUrl} alt="Preview" className="aspect-square w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-ink-900/70 text-white hover:bg-ink-900"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-24 w-40 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-ink-200 text-ink-400 transition-colors hover:border-primary-300 hover:text-primary-600 disabled:opacity-60"
              >
                {uploading ? (
                  <Spinner size={20} />
                ) : (
                  <>
                    <Upload size={18} />
                    <span className="text-xs font-medium">Upload photo</span>
                  </>
                )}
              </button>
            )}
          </Field>

          <Field label="Plate number" hint="Optional — for vehicles (targa)">
            <Input
              value={form.plateNumber}
              onChange={(e) => setForm((f) => ({ ...f, plateNumber: e.target.value }))}
              placeholder="e.g. AB123CD"
            />
          </Field>
        </form>
      </Modal>

      <Modal
        open={!!viewProduct}
        onClose={() => setViewProduct(null)}
        title={viewProduct?.name}
        subtitle="Product details"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              openEdit(viewProduct)
              setViewProduct(null)
            }}
            icon={Pencil}
          >
            Edit
          </Button>
        }
      >
        {viewProduct && (
          <div className="space-y-4">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
              {viewProduct.imageUrl ? (
                <img src={viewProduct.imageUrl} alt={viewProduct.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-300">
                  <ImageOff size={32} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-ink-400">Category</p>
                <p className="font-semibold capitalize text-ink-800 dark:text-ink-100">{viewProduct.category || 'other'}</p>
              </div>
              <div>
                <p className="text-ink-400">Status</p>
                <StatusBadge status={viewProduct.status} />
              </div>
              <div>
                <p className="text-ink-400">Rent price</p>
                <p className="font-semibold text-ink-800 dark:text-ink-100">{formatMoney(viewProduct.rentPrice)}</p>
              </div>
              <div>
                <p className="text-ink-400">Deposit price</p>
                <p className="font-semibold text-ink-800 dark:text-ink-100">{viewProduct.depositPrice ? formatMoney(viewProduct.depositPrice) : '—'}</p>
              </div>
              {viewProduct.plateNumber && (
                <div>
                  <p className="text-ink-400">Plate number</p>
                  <p className="font-semibold text-ink-800 dark:text-ink-100">{viewProduct.plateNumber}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
