import { api } from './client'

export const listPayments = (params = {}) => api.get('/payments', { params }).then((r) => r.data)

export const createPayment = (payload) => api.post('/payments', payload).then((r) => r.data)

export const listPaymentMethods = () => api.get('/payment-methods').then((r) => r.data)

export const createPaymentMethod = (payload) => api.post('/payment-methods', payload).then((r) => r.data)

export const updatePaymentMethod = (id, payload) => api.patch(`/payment-methods/${id}`, payload).then((r) => r.data)
