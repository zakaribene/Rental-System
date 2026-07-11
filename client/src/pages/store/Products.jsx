import { useEffect, useRef, useState } from 'react'
import { Plus, Package, Search, ImageOff, Trash2, Pencil, Upload, X } from 'lucide-react'
import { listProducts, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../../api/products'
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
  const fileInputRef = useRef(null)

  const load = () => {
    setLoading(true)
    listProducts(statusFilter || undefined)
      .then(setProducts)
      .finally(() => setLoading(false))
  }

  useEffect(load, [statusFilter])

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

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

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="h-10 w-full rounded-lg border border-ink-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-100"
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">All statuses</option>
          <option value="available">Available</option>
          <option value="rented">Rented</option>
          <option value="damaged">Damaged</option>
          <option value="lost">Lost</option>
        </Select>
        <span className="text-sm font-medium text-ink-400">{filtered.length} product(s)</span>
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl2 border border-ink-100 bg-white">
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
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((product) => (
            <div
              key={product._id}
              className="group overflow-hidden rounded-xl2 border border-ink-100 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-100">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-ink-300">
                    <ImageOff size={28} />
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <StatusBadge status={product.status} />
                </div>
              </div>
              <div className="p-4">
                <p className="truncate font-display font-bold text-ink-900">{product.name}</p>
                <p className="mt-0.5 text-xs capitalize text-ink-400">
                  {product.category || 'other'}
                  {product.plateNumber && ` · ${product.plateNumber}`}
                </p>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="font-display text-lg font-extrabold text-primary-700">
                    {formatMoney(product.rentPrice)}
                  </span>
                  <span className="text-xs text-ink-400">/ rental</span>
                </div>
                {product.depositPrice ? (
                  <p className="mt-0.5 text-xs text-ink-400">Deposit {formatMoney(product.depositPrice)}</p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="secondary" icon={Pencil} className="flex-1" onClick={() => openEdit(product)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={() => handleDelete(product)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  )
}
