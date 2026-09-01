import { api } from './client'

export const listExpenses = (params = {}) => api.get('/expenses', { params }).then((r) => r.data)

export const createExpense = (payload) => api.post('/expenses', payload).then((r) => r.data)

export const deleteExpense = (id) => api.delete(`/expenses/${id}`).then((r) => r.data)

export const listExpenseCategories = () => api.get('/expenses/categories').then((r) => r.data)

export const createExpenseCategory = (payload) => api.post('/expenses/categories', payload).then((r) => r.data)

export const getExpenseBalances = () => api.get('/expenses/balances').then((r) => r.data)
