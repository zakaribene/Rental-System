import { api } from './client'

export const getDailyTotals = (date) => api.get('/reports/daily-totals', { params: { date } }).then((r) => r.data)

export const getSummary = (params = {}) => api.get('/reports/summary', { params }).then((r) => r.data)
