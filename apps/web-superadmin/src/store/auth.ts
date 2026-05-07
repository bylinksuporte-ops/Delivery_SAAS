import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface Admin {
  id: string
  name: string
  email: string
}

interface AuthState {
  admin: Admin | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState>(
    (set) => ({
      admin: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/super-admin/auth/login', { email, password })
        const { accessToken, refreshToken, admin } = data.data
        localStorage.setItem('sa_accessToken', accessToken)
        localStorage.setItem('sa_refreshToken', refreshToken)
        set({ admin, accessToken, refreshToken, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('sa_accessToken')
        localStorage.removeItem('sa_refreshToken')
        set({ admin: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        const { data } = await api.get('/super-admin/auth/me')
        set({ admin: data.data.admin, isAuthenticated: true })
      },
    }),
    {
      name: 'sa-auth',
      partialize: (state) => ({
        admin: state.admin,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        login: state.login,
        logout: state.logout,
        fetchMe: state.fetchMe,
      }),
    },
  ),
)
