import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
})

let accessToken = null
let onUnauthorized = null

export function setAccessToken(token) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise = null

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const url = original?.url || ''

    if (status === 401 && !original._retry && !url.includes('/auth/login') && !url.includes('/auth/refresh-token')) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = api.post('/auth/refresh-token').finally(() => {
            refreshPromise = null
          })
        }
        const { data } = await refreshPromise
        setAccessToken(data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch (refreshErr) {
        setAccessToken(null)
        if (onUnauthorized) onUnauthorized()
        return Promise.reject(refreshErr)
      }
    }

    return Promise.reject(error)
  }
)

export function apiErrorMessage(err, fallback = 'Something went wrong') {
  return err?.response?.data?.message || err?.message || fallback
}
