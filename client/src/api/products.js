import { api } from './client'

export const listProducts = (status) => api.get('/products', { params: status ? { status } : {} }).then((r) => r.data)

export const getProduct = (id) => api.get(`/products/${id}`).then((r) => r.data)

export const createProduct = (payload) => api.post('/products', payload).then((r) => r.data)

export const updateProduct = (id, payload) => api.patch(`/products/${id}`, payload).then((r) => r.data)

export const deleteProduct = (id) => api.delete(`/products/${id}`).then((r) => r.data)

export const uploadProductImage = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/products/upload-image', formData).then((r) => r.data)
}
