import { api } from './client'

export const sendNotification = (payload) => api.post('/notifications', payload).then((r) => r.data)

export const listAllNotifications = () => api.get('/notifications/admin').then((r) => r.data)

export const listStoreNotifications = () => api.get('/notifications').then((r) => r.data)

export const getUnreadCount = () => api.get('/notifications/unread-count').then((r) => r.data)

export const markAllRead = () => api.post('/notifications/mark-read').then((r) => r.data)
