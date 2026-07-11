import { api } from './client'

export const listUsers = () => api.get('/users').then((r) => r.data)

export const createUser = (payload) => api.post('/users', payload).then((r) => r.data)

export const updateUser = (id, payload) => api.patch(`/users/${id}`, payload).then((r) => r.data)
