import { api } from './client'

export const listCustomers = () => api.get('/customers').then((r) => r.data)

export const getCustomer = (id) => api.get(`/customers/${id}`).then((r) => r.data)

export const createCustomer = (payload) => api.post('/customers', payload).then((r) => r.data)

export const updateCustomer = (id, payload) => api.patch(`/customers/${id}`, payload).then((r) => r.data)

export const uploadCustomerPhoto = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/customers/upload-photo', formData).then((r) => r.data)
}

export const uploadCustomerIdDocument = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/customers/upload-id-document', formData).then((r) => r.data)
}
