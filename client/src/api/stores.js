import { api } from './client'

export const listStores = () => api.get('/stores').then((r) => r.data)

export const getStore = (id) => api.get(`/stores/${id}`).then((r) => r.data)

export const createStore = (payload) => api.post('/stores', payload).then((r) => r.data)

export const updateStore = (id, payload) => api.patch(`/stores/${id}`, payload).then((r) => r.data)

export const getStoreAnalytics = () => api.get('/stores/analytics').then((r) => r.data)

export const resetStorePassword = (id, password) => api.patch(`/stores/${id}/reset-password`, { password }).then((r) => r.data)

export const impersonateStore = (id) => api.post(`/stores/${id}/impersonate`).then((r) => r.data)
