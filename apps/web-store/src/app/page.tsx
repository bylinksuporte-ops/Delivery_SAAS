'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import Link from 'next/link'
import { Search, Clock, Bike, Store, MapPin } from 'lucide-react'
import { currency } from '@/lib/utils'

interface StoreItem {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  description: string | null
  city: string | null
  state: string | null
  isOpen: boolean
  estimatedTime: number
  minOrderValue: number
}

export default function HomePage() {
  const [search, setSearch] = useState('')

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ['public-stores'],
    queryFn: () => api.get<{ data: StoreItem[] }>('/store').then((r) => r.data.data),
  })

  const filtered = stores.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.city ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 px-4 py-10 text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shadow-lg">🛵</div>
        </div>
        <h1 className="text-2xl font-black text-white">Delivery Online</h1>
        <p className="text-white/80 text-sm">Encontre sua loja favorita e faça seu pedido</p>
        <div className="relative max-w-sm mx-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar loja ou cidade..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl border-0 bg-white text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-white/50"
          />
        </div>
      </div>

      {/* Lojas */}
      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <Store className="h-12 w-12 text-muted-foreground/30" />
            <p className="font-semibold text-foreground">Nenhuma loja encontrada</p>
            <p className="text-sm text-muted-foreground">
              {search ? 'Tente outro termo de busca.' : 'As lojas aparecerão aqui em breve.'}
            </p>
          </div>
        )}

        {filtered.map((store) => (
          <Link key={store.id} href={`/${store.slug}`}
            className="flex items-center gap-4 rounded-2xl bg-white border p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99]">
            {/* Logo */}
            <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden bg-muted border">
              {store.logoUrl
                ? <img src={store.logoUrl} alt={store.name} className="h-full w-full object-cover" />
                : <div className="h-full w-full flex items-center justify-center text-2xl">🍽️</div>
              }
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-base text-foreground">{store.name}</h2>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${store.isOpen ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                  {store.isOpen ? '● Aberto' : '○ Fechado'}
                </span>
              </div>
              {store.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{store.description}</p>
              )}
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {store.city && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />{store.city}{store.state ? `, ${store.state}` : ''}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />{store.estimatedTime} min
                </span>
                {Number(store.minOrderValue) > 0 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Bike className="h-3 w-3" />Mín. {currency(Number(store.minOrderValue))}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </main>
    </div>
  )
}
