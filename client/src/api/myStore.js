import { api } from './client'

export const getMyStore = () => api.get('/my-store').then((r) => r.data)

export const uploadMyStoreLogo = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return api.post('/my-store/logo', formData).then((r) => r.data)
}
