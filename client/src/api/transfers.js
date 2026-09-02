import { api } from './client'

export const listTransfers = (params = {}) => api.get('/transfers', { params }).then((r) => r.data)

export const createTransfer = (payload) => api.post('/transfers', payload).then((r) => r.data)

export const deleteTransfer = (id) => api.delete(`/transfers/${id}`).then((r) => r.data)

export const getTransferBalances = () => api.get('/transfers/balances').then((r) => r.data)
