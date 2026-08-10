import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Package, Search, ImageOff, Trash2, Pencil, X, Eye, Tags, DollarSign, ImagePlus, Tag } from 'lucide-react'
import { listProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../../api/products'
import { listCategories, createCategory, deleteCategory } from '../../api/categories'
import { getMyStore } from '../../api/myStore'
import usePermissions from '../../hooks/usePermissions'
import Card from '../../components/ui/Card'
import Table from '../../components/ui/Table'
import Pagination from '../../components/ui/Pagination'
import usePagination from '../../hooks/usePagination'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input, { Field, Select } from '../../components/ui/Input'
import CategoryPicker from '../../components/ui/CategoryPicker'
import SectionLabel from '../../components/ui/SectionLabel'
import Badge, { StatusBadge } from '../../components/ui/Badge'
import { PageHeader, EmptyState, Spinner, Alert } from '../../components/ui/Misc'
import { formatMoney } from '../../lib/utils'
import { apiErrorMessage } from '../../api/client'

const emptyForm = {
  name: '',
  category: '',
  listingType: 'RENT',
  rentPrice: '',
  depositPrice: '',
  salePrice: '',
  stockQty: '',
  imageUrl: '',
  plateNumber: '',
  status: 'available',
}

export default function Products() {
  const { can, loaded } = usePermissions()
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
  const [store, setStore] = useState(null)
  const [categories, setCategories] = useState([])
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    listProducts(statusFilter || undefined)
      .then(setProducts)
      .finally(() => setLoading(false))
  }

  const loadCategories = () => listCategories().then(setCategories)

  useEffect(load, [statusFilter])
  useEffect(() => {
    getMyStore().then(setStore).catch(() => setStore(null))
    loadCategories()
  }, [])

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
      category: product.category || '',
      listingType: product.listingType || 'RENT',
      rentPrice: product.rentPrice || '',
      depositPrice: product.depositPrice || '',
      salePrice: product.salePrice || '',
      stockQty: product.stockQty ?? '',
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
      category: form.category || undefined,
      listingType: form.listingType,
      imageUrl: form.imageUrl || undefined,
      plateNumber: form.plateNumber || undefined,
      ...(form.listingType === 'SALE'
        ? { salePrice: Number(form.salePrice), stockQty: Number(form.stockQty) }
        : { rentPrice: Number(form.rentPrice), depositPrice: form.depositPrice === '' ? undefined : Number(form.depositPrice) }),
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

  if (loaded && !can('products')) return <Navigate to="/store" replace />

  return (
    <div className="animate-fadeIn">
      <PageHeader
        title="Products"
        subtitle="Everything your store has available to rent out."
        action={
          <div className="flex gap-2">
            <Button variant="secondary" icon={Tags} onClick={() => setCategoriesModalOpen(true)}>
              Categories
            </Button>
            <Button icon={Plus} onClick={openCreate}>
              New product
            </Button>
          </div>
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
                { key: 'category', header: 'Category', render: (row) => row.category || '—' },
                { key: 'plateNumber', header: 'Plate', render: (row) => row.plateNumber || '—' },
                ...(store?.salesEnabled
                  ? [{ key: 'listingType', header: 'Type', render: (row) => <Badge tone={row.listingType === 'SALE' ? 'info' : 'neutral'}>{row.listingType === 'SALE' ? 'Sale' : 'Rent'}</Badge> }]
                  : []),
                {
                  key: 'price',
                  header: 'Price',
                  render: (row) => (row.listingType === 'SALE' ? formatMoney(row.salePrice) : formatMoney(row.rentPrice)),
                },
                { key: 'depositPrice', header: 'Deposit', render: (row) => (row.depositPrice ? formatMoney(row.depositPrice) : '—') },
                ...(store?.salesEnabled
                  ? [{ key: 'stockQty', header: 'Stock', render: (row) => (row.listingType === 'SALE' ? row.stockQty : '—') }]
                  : []),
                { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
                {
                  key: 'actions',
                  header: '',
                  headerClassName: 'text-right',
                  className: 'text-right',
                  render: (row) => (
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="secondary" icon={Eye} onClick={() => setViewProduct(row)} />
                      {can('products', 'edit') && (
                        <Button size="sm" variant="secondary" icon={Pencil} onClick={() => openEdit(row)} />
                      )}
                      {can('products', 'delete') && (
                        <Button size="sm" variant="ghost" icon={Trash2} onClick={() => handleDelete(row)} />
                      )}
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
        subtitle={editing ? editing.name : 'Fill in the details below to list a new item.'}
        size="lg"
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

          <SectionLabel>Details</SectionLabel>

          <Field label="Product name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Leather handbag"
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" hint={categories.length === 0 ? 'Add one via "Categories" above' : undefined}>
              <CategoryPicker
                categories={categories}
                value={form.category}
                onChange={(name) => setForm((f) => ({ ...f, category: name }))}
              />
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

          {store?.salesEnabled && (
            <Field label="Listing type" hint="Rent it out, or sell it and track stock">
              <Select value={form.listingType} onChange={(e) => setForm((f) => ({ ...f, listingType: e.target.value }))}>
                <option value="RENT">Rent</option>
                <option value="SALE">Sale</option>
              </Select>
            </Field>
          )}

          <SectionLabel>Pricing{form.listingType === 'SALE' && store?.salesEnabled ? ' & stock' : ''}</SectionLabel>

          {form.listingType === 'SALE' && store?.salesEnabled ? (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Sale price" required>
                <Input
                  icon={DollarSign}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.salePrice}
                  onChange={(e) => setForm((f) => ({ ...f, salePrice: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </Field>
              <Field label="Stock quantity" required>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={form.stockQty}
                  onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
                  placeholder="0"
                  required
                />
              </Field>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Rent price" required>
                <Input
                  icon={DollarSign}
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
                  icon={DollarSign}
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.depositPrice}
                  onChange={(e) => setForm((f) => ({ ...f, depositPrice: e.target.value }))}
                  placeholder="0.00"
                />
              </Field>
            </div>
          )}

          <SectionLabel>Media</SectionLabel>

          <Field label="Photo" hint="Optional — JPG, PNG, WEBP or GIF, up to 5MB">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileSelect}
              className="hidden"
            />
            {form.imageUrl ? (
              <div className="group relative w-44 overflow-hidden rounded-xl border border-ink-200 shadow-sm dark:border-ink-700">
                <img src={form.imageUrl} alt="Preview" className="aspect-square w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-950/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/70 text-white backdrop-blur transition-colors hover:bg-danger-600"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-28 w-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink-200 bg-ink-50/50 text-ink-400 transition-all hover:border-primary-300 hover:bg-primary-50/50 hover:text-primary-600 disabled:opacity-60 dark:border-ink-700 dark:bg-ink-800/40 dark:hover:bg-primary-500/10"
              >
                {uploading ? (
                  <Spinner size={20} />
                ) : (
                  <>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-ink-100 dark:bg-ink-800 dark:ring-ink-700">
                      <ImagePlus size={16} />
                    </div>
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
                <p className="font-semibold text-ink-800 dark:text-ink-100">{viewProduct.category || '—'}</p>
              </div>
              <div>
                <p className="text-ink-400">Status</p>
                <StatusBadge status={viewProduct.status} />
              </div>
              {viewProduct.listingType === 'SALE' ? (
                <>
                  <div>
                    <p className="text-ink-400">Sale price</p>
                    <p className="font-semibold text-ink-800 dark:text-ink-100">{formatMoney(viewProduct.salePrice)}</p>
                  </div>
                  <div>
                    <p className="text-ink-400">Stock</p>
                    <p className="font-semibold text-ink-800 dark:text-ink-100">{viewProduct.stockQty}</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-ink-400">Rent price</p>
                    <p className="font-semibold text-ink-800 dark:text-ink-100">{formatMoney(viewProduct.rentPrice)}</p>
                  </div>
                  <div>
                    <p className="text-ink-400">Deposit price</p>
                    <p className="font-semibold text-ink-800 dark:text-ink-100">{viewProduct.depositPrice ? formatMoney(viewProduct.depositPrice) : '—'}</p>
                  </div>
                </>
              )}
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

      <CategoriesModal
        open={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        categories={categories}
        reload={loadCategories}
      />
    </div>
  )
}

function CategoriesModal({ open, onClose, categories, reload }) {
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setError('')
    setSaving(true)
    try {
      await createCategory({ name: name.trim() })
      setName('')
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to add category'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (category) => {
    setDeletingId(category._id)
    try {
      await deleteCategory(category._id)
      reload()
    } catch (err) {
      setError(apiErrorMessage(err, 'Failed to delete category'))
    } finally {
      setDeletingId('')
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Categories" subtitle="Organize your products into custom categories">
      <div className="space-y-4">
        {error && <Alert>{error}</Alert>}
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input icon={Tag} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bags, Clothing, Electronics" className="flex-1" />
          <Button type="submit" loading={saving}>
            Add
          </Button>
        </form>
        <div className="space-y-2">
          {categories.length === 0 && <p className="text-sm text-ink-400">No categories yet.</p>}
          {categories.map((c) => (
            <div key={c._id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 dark:border-ink-700">
              <div className="flex items-center gap-2.5">
                <Tag size={14} className="text-ink-400" />
                <span className="text-sm font-medium text-ink-800 dark:text-ink-100">{c.name}</span>
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={Trash2}
                loading={deletingId === c._id}
                onClick={() => handleDelete(c)}
              />
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}
