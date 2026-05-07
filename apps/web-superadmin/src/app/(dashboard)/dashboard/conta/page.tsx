'use client'

import { useState } from 'react'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'

export default function ContaPage() {
  const { admin } = useAuthStore()

  const [name, setName] = useState(admin?.name ?? '')
  const [email, setEmail] = useState(admin?.email ?? '')
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passLoading, setPassLoading] = useState(false)
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  async function handleProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileMsg(null)
    setProfileLoading(true)
    try {
      const { data } = await api.patch('/super-admin/auth/profile', { name, email })
      useAuthStore.setState((s) => ({ admin: s.admin ? { ...s.admin, ...data.data.admin } : null }))
      setProfileMsg({ type: 'success', text: 'Perfil atualizado com sucesso!' })
    } catch (err: any) {
      setProfileMsg({ type: 'error', text: err?.response?.data?.message ?? 'Erro ao atualizar perfil.' })
    } finally {
      setProfileLoading(false)
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    setPassMsg(null)
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'error', text: 'As senhas não coincidem.' })
      return
    }
    setPassLoading(true)
    try {
      await api.patch('/super-admin/auth/password', { currentPassword, newPassword })
      setPassMsg({ type: 'success', text: 'Senha atualizada com sucesso!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err?.response?.data?.message ?? 'Erro ao atualizar senha.' })
    } finally {
      setPassLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Minha Conta</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie seus dados de acesso</p>
      </div>

      {/* Perfil */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Dados do Perfil</h2>
        <form onSubmit={handleProfile} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {profileMsg && (
            <p className={`text-sm ${profileMsg.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {profileMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={profileLoading}
            className="h-10 px-6 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {profileLoading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>
      </div>

      {/* Senha */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">Alterar Senha</h2>
        <form onSubmit={handlePassword} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Senha Atual</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Nova Senha</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Confirmar Nova Senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {passMsg && (
            <p className={`text-sm ${passMsg.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {passMsg.text}
            </p>
          )}
          <button
            type="submit"
            disabled={passLoading}
            className="h-10 px-6 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {passLoading ? 'Salvando...' : 'Alterar Senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
