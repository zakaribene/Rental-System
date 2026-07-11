import { api } from './client'

export const listRentals = (status) => api.get('/rentals', { params: status ? { status } : {} }).then((r) => r.data)

export const getRental = (id) => api.get(`/rentals/${id}`).then((r) => r.data)

export const createRental = (payload) => api.post('/rentals', payload).then((r) => r.data)

export const returnRental = (id, payload) => api.post(`/rentals/${id}/return`, payload).then((r) => r.data)

export const uploadDepositDocument = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/rentals/upload-document', formData).then((r) => r.data)
}
