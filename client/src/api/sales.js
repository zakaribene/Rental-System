import { api } from './client'

export const listSales = (params = {}) => api.get('/sales', { params }).then((r) => r.data)

export const getSale = (id) => api.get(`/sales/${id}`).then((r) => r.data)

export const createSale = (payload) => api.post('/sales', payload).then((r) => r.data)

export const updateSale = (id, payload) => api.patch(`/sales/${id}`, payload).then((r) => r.data)
