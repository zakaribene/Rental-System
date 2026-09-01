import { api } from './client'

export const getDailyTotals = (date) => api.get('/reports/daily-totals', { params: { date } }).then((r) => r.data)

export const getSummary = (params = {}) => api.get('/reports/summary', { params }).then((r) => r.data)

export const getAnalytics = (params = {}) => api.get('/reports/analytics', { params }).then((r) => r.data)

export const getSalesReport = (params = {}) => api.get('/reports/sales', { params }).then((r) => r.data)

export const getExpenseReport = (params = {}) => api.get('/reports/expenses', { params }).then((r) => r.data)
