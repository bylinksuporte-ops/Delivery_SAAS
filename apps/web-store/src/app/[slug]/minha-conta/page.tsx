'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { ArrowLeft, Phone, ShoppingBag, MapPin, Clock, Star, ChevronRight } from 'lucide-react'
import { cn } from '@delivery/ui'
import Link from 'next/link'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING:          { label: 'Pendente',       color: 'bg-yellow-100 text-yellow-700' },
  CONFIRMED:        { label: 'Confirmado',      color: 'bg-blue-100 text-blue-700' },
  IN_PRODUCTION:    { label: 'Em produção',     color: 'bg-orange-100 text-orange-700' },
  OUT_FOR_DELIVERY: { label: 'Saindo',          color: 'bg-purple-100 text-purple-700' },
  READY_FOR_PICKUP: { label: 'Pronto',          color: 'bg-indigo-100 text-indigo-700' },
  DELIVERED:        { label: 'Entregue',        color: 'bg-green-100 text-green-700' },
  CANCELLED:        { label: 'Cancelado',       color: 'bg-red-100 text-red-700' },
}

export default function MinhaContaPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [inputPhone, setInputPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Busca cliente e pedidos após identificação
  const { data: customer } = useQuery({
    queryKey: ['customer-portal', slug, phone],
    queryFn: async () => {
      const clean = phone.replace(/\D/g, '')
      const r = await api.get<{ data: { id: string; name: string; phone: string } }>(`/store/${slug}/customer?phone=${clean}`)
      return r.data.data
    },
    enabled: !!phone,
    retry: false,
  })

  const { data: ordersData } = useQuery({
    queryKey: ['customer-orders', slug, phone],
    queryFn: async () => {
      const clean = phone.replace(/\D/g, '')
      const r = await api.get<{ data: any[] }>(`/store/${slug}/customer-orders?phone=${clean}`)
      return r.data.data
    },
    enabled: !!phone && !!customer,
    retry: false,
  })

  function maskPhone(v: string) {
    const d = v.replace(/\D/g, '').slice(0, 11)
    if (d.length <= 2) return d
    if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
  }

  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const clean = inputPhone.replace(/\D/g, '')
      await api.get(`/store/${slug}/customer?phone=${clean}`)
      setPhone(inputPhone)
    } catch {
      setError('Nenhuma conta encontrada com este número.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
          <button onClick={() => router.push(`/${slug}`)} className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base">Minha Conta</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6 space-y-5">
        {!phone ? (
          // Tela de identificação
          <div className="bg-white rounded-2xl border p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Phone className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold">Identifique-se</h2>
              <p className="text-sm text-muted-foreground">Digite seu WhatsApp para ver seus pedidos e endereços salvos</p>
            </div>
            <form onSubmit={handleIdentify} className="space-y-3">
              <input
                value={inputPhone}
                onChange={e => setInputPhone(maskPhone(e.target.value))}
                placeholder="(11) 99999-9999"
                inputMode="numeric"
                required
                className="w-full h-11 rounded-xl border px-4 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 text-center font-semibold"
              />
              {error && <p className="text-sm text-red-600 text-center">{error}</p>}
              <button type="submit" disabled={loading || inputPhone.length < 14}
                className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition disabled:opacity-50">
                {loading ? 'Buscando...' : 'Entrar'}
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* Perfil */}
            <div className="bg-white rounded-2xl border p-4 flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
                {customer?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-foreground">{customer?.name}</p>
                <p className="text-sm text-muted-foreground">{phone}</p>
              </div>
              <button onClick={() => setPhone('')} className="text-xs text-muted-foreground hover:text-foreground underline">Sair</button>
            </div>

            {/* Pedidos */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground px-1">Meus Pedidos</h3>
              {!ordersData && (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />)}
                </div>
              )}
              {ordersData?.length === 0 && (
                <div className="bg-white rounded-2xl border p-8 text-center space-y-2">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">Você ainda não fez nenhum pedido aqui.</p>
                  <Link href={`/${slug}`} className="text-sm text-primary font-medium hover:underline">Ver cardápio →</Link>
                </div>
              )}
              {ordersData?.map((order: any) => {
                const st = STATUS_LABELS[order.status] ?? { label: order.status, color: 'bg-muted text-muted-foreground' }
                const isActive = !['DELIVERED','CANCELLED'].includes(order.status)
                return (
                  <Link key={order.id} href={`/${slug}/pedido/${order.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl border p-4 hover:shadow-sm transition">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-muted-foreground">#{order.orderNumber}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', st.color)}>{st.label}</span>
                        {isActive && <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {order.items?.slice(0,2).map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                        {order.items?.length > 2 ? '...' : ''}
                      </p>
                      <p className="text-sm font-semibold text-primary mt-0.5">{currency(Number(order.total))}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
