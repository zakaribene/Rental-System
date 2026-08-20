import { api } from './client'

// Store side — always talks to the super admin, no recipient picker
export const getStoreMessages = () => api.get('/support/store/messages').then((r) => r.data)

export const sendStoreMessage = (message) => api.post('/support/store/messages', { message }).then((r) => r.data)

export const getStoreUnreadCount = () => api.get('/support/store/unread-count').then((r) => r.data)

export const markStoreRead = () => api.post('/support/store/mark-read').then((r) => r.data)

// Super admin side — one thread per store
export const listThreads = () => api.get('/support/admin/threads').then((r) => r.data)

export const getThreadMessages = (storeId) => api.get(`/support/admin/threads/${storeId}`).then((r) => r.data)

export const replyToThread = (storeId, message) =>
  api.post(`/support/admin/threads/${storeId}/reply`, { message }).then((r) => r.data)

export const getAdminUnreadCount = () => api.get('/support/admin/unread-count').then((r) => r.data)

export const markThreadRead = (storeId) => api.post(`/support/admin/threads/${storeId}/mark-read`).then((r) => r.data)
