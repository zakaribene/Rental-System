import { api } from './client'

export const listAdmins = () => api.get('/admin/users').then((r) => r.data)

export const createAdmin = (payload) => api.post('/admin/users', payload).then((r) => r.data)

export const updateAdmin = (id, payload) => api.patch(`/admin/users/${id}`, payload).then((r) => r.data)

export const deleteAdmin = (id) => api.delete(`/admin/users/${id}`).then((r) => r.data)
