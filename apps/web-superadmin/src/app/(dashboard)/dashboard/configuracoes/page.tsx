'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Settings2, Check, Bot, Globe, Phone, Mail, UserPlus, Shield } from 'lucide-react'

const AI_MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku — Rápido e econômico' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet — Mais inteligente' },
]

export default function ConfiguracoesPage() {
  const qc = useQueryClient()
  const { data: config } = useQuery({
    queryKey: ['sa-config'],
    queryFn: () => api.get<{ data: any }>('/super-admin/config').then(r => r.data.data),
  })

  const update = useMutation({
    mutationFn: (data: any) => api.patch('/super-admin/config', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-config'] }),
  })

  const [platformName, setPlatformName] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const [supportWhatsapp, setSupportWhatsapp] = useState('')
  const [defaultAiModel, setDefaultAiModel] = useState('claude-haiku-4-5-20251001')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [maintenanceMessage, setMaintenanceMessage] = useState('')
  const [allowNewRegistrations, setAllowNewRegistrations] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (config) {
      setPlatformName(config.platformName ?? '')
      setSupportEmail(config.supportEmail ?? '')
      setSupportWhatsapp(config.supportWhatsapp ?? '')
      setDefaultAiModel(config.defaultAiModel ?? 'claude-haiku-4-5-20251001')
      setMaintenanceMode(config.maintenanceMode ?? false)
      setMaintenanceMessage(config.maintenanceMessage ?? '')
      setAllowNewRegistrations(config.allowNewRegistrations ?? true)
    }
  }, [config])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    await update.mutateAsync({ platformName, supportEmail, supportWhatsapp, defaultAiModel, maintenanceMode, maintenanceMessage, allowNewRegistrations })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações Globais</h1>
        <p className="text-sm text-muted-foreground mt-1">Parâmetros que afetam toda a plataforma</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Identidade da plataforma */}
        <section className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Globe className="h-4 w-4 text-primary" /></div>
            <div><h2 className="font-semibold">Identidade da Plataforma</h2><p className="text-xs text-muted-foreground">Nome e contato de suporte</p></div>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome da plataforma</label>
              <input value={platformName} onChange={e => setPlatformName(e.target.value)} placeholder="Delivery SaaS"
                className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />E-mail de suporte</label>
                <input type="email" value={supportEmail} onChange={e => setSupportEmail(e.target.value)} placeholder="suporte@exemplo.com"
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />WhatsApp de suporte</label>
                <input value={supportWhatsapp} onChange={e => setSupportWhatsapp(e.target.value)} placeholder="(11) 99999-9999"
                  className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
          </div>
        </section>

        {/* IA padrão */}
        <section className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Bot className="h-4 w-4 text-primary" /></div>
            <div><h2 className="font-semibold">Modelo de IA Padrão</h2><p className="text-xs text-muted-foreground">Usado nas novas lojas que ativarem o atendente IA</p></div>
          </div>
          <select value={defaultAiModel} onChange={e => setDefaultAiModel(e.target.value)}
            className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            {AI_MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </section>

        {/* Controles da plataforma */}
        <section className="bg-card border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center"><Shield className="h-4 w-4 text-primary" /></div>
            <div><h2 className="font-semibold">Controles da Plataforma</h2><p className="text-xs text-muted-foreground">Acesso e manutenção</p></div>
          </div>

          <label className="flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition">
            <div className="flex items-center gap-3">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Permitir novos cadastros</p>
                <p className="text-xs text-muted-foreground">Novas lojas podem se registrar na plataforma</p>
              </div>
            </div>
            <div className="relative">
              <input type="checkbox" checked={allowNewRegistrations} onChange={e => setAllowNewRegistrations(e.target.checked)} className="sr-only" />
              <div onClick={() => setAllowNewRegistrations(v => !v)}
                className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${allowNewRegistrations ? 'bg-green-500' : 'bg-muted-foreground/30'}`}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: allowNewRegistrations ? 'translateX(22px)' : 'translateX(2px)' }} />
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl border cursor-pointer hover:bg-muted/30 transition" style={{ borderColor: maintenanceMode ? '#f97316' : undefined, background: maintenanceMode ? '#fff7ed' : undefined }}>
            <div className="flex items-center gap-3">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Modo manutenção</p>
                <p className="text-xs text-muted-foreground">Exibe aviso de manutenção para os clientes</p>
              </div>
            </div>
            <div className="relative">
              <div onClick={() => setMaintenanceMode(v => !v)}
                className={`w-11 h-6 rounded-full cursor-pointer transition-colors ${maintenanceMode ? 'bg-orange-500' : 'bg-muted-foreground/30'}`}>
                <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
                  style={{ transform: maintenanceMode ? 'translateX(22px)' : 'translateX(2px)' }} />
              </div>
            </div>
          </label>

          {maintenanceMode && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mensagem de manutenção</label>
              <textarea value={maintenanceMessage} onChange={e => setMaintenanceMessage(e.target.value)} rows={2}
                className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}
        </section>

        <button type="submit" disabled={update.isPending}
          className="flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
          {saved ? <><Check className="h-4 w-4" />Salvo!</> : update.isPending ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </form>
    </div>
  )
}
