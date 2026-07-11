import { api } from './client'

export const login = (phone, password) => api.post('/auth/login', { phone, password }).then((r) => r.data)

export const refreshToken = () => api.post('/auth/refresh-token').then((r) => r.data)

export const logout = () => api.post('/auth/logout').then((r) => r.data)
