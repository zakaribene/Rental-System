import { api } from './client'

export const listActivityLogs = (params = {}) => api.get('/activity-logs', { params }).then((r) => r.data)

export const listAllActivityLogs = (params = {}) => api.get('/admin/activity-logs', { params }).then((r) => r.data)

export const getActivityLogSettings = () => api.get('/admin/activity-logs/settings').then((r) => r.data)

export const updateActivityLogSettings = (payload) => api.patch('/admin/activity-logs/settings', payload).then((r) => r.data)
