import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('sa_accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('sa_refreshToken')
        if (!refreshToken) throw new Error()
        const { data } = await axios.post(`${API_URL}/super-admin/auth/refresh`, { refreshToken })
        const newToken = data.data.accessToken
        localStorage.setItem('sa_accessToken', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.removeItem('sa_accessToken')
        localStorage.removeItem('sa_refreshToken')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  },
)
