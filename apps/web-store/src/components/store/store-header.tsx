'use client'

import Image from 'next/image'
import { ShoppingCart, Clock, MapPin, Star, User, ChevronDown } from 'lucide-react'
import { useCartStore } from '@/store/cart'
import { currency } from '@/lib/utils'
import Link from 'next/link'
import { useState } from 'react'

interface Schedule { dayOfWeek: number; openTime: string; closeTime: string }
interface StoreData {
  name: string; slug: string; logoUrl: string | null; bannerUrl: string | null
  description: string | null; isOpen: boolean; estimatedTime: number
  minOrderValue: number
  address: string | null; number: string | null; district: string | null
  city: string | null; state: string | null
  schedules: Schedule[]
}

const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function getNextOpenLabel(schedules: Schedule[]): string | null {
  if (schedules.length === 0) return null
  const today = new Date().getDay()
  for (let i = 1; i <= 7; i++) {
    const day = (today + i) % 7
    const s = schedules.find((x) => x.dayOfWeek === day)
    if (s) return `Abre ${i === 1 ? 'amanhã' : DAY_NAMES[day]} às ${s.openTime}`
  }
  return null
}

export function StoreHeader({ store }: { store: StoreData }) {
  const { totalItems, subtotal, toggleCart } = useCartStore()
  const [showHours, setShowHours] = useState(false)
  const itemCount = totalItems()
  const cartTotal = subtotal()
  const nextOpen = !store.isOpen ? getNextOpenLabel(store.schedules) : null

  const addressLine = [
    store.address,
    store.number,
  ].filter(Boolean).join(', ')

  const locationLine = [
    store.city,
    store.state,
  ].filter(Boolean).join('/')

  const timeRange = `${store.estimatedTime} - ${store.estimatedTime + 20}min`

  return (
    <div className="bg-[#1c1c1e] w-full">
      {/* ── Banner com overlay ── */}
      <div className="relative w-full h-44">
        {store.bannerUrl ? (
          <img
            src={store.bannerUrl}
            alt={store.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#2a2a2e] to-[#111113]" />
        )}
        {/* Overlay escuro */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1e] via-[#1c1c1e]/40 to-transparent" />

        {/* Topo: rating + localização */}
        <div className="absolute top-3 left-0 right-0 px-4 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 border border-white/10">
            <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
            <span className="text-[11px] font-bold text-white">4.9</span>
          </div>
          {locationLine && (
            <div className="rounded-full bg-black/50 backdrop-blur-sm px-2.5 py-1 border border-white/10">
              <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wide">{locationLine}</span>
            </div>
          )}
          {/* Carrinho topo direito */}
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={`/${store.slug}/minha-conta`}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white hover:bg-white/20 transition"
            >
              <User className="h-3.5 w-3.5" />
            </Link>
            {itemCount > 0 && (
              <button
                onClick={toggleCart}
                className="flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-lg active:scale-95 transition"
              >
                <div className="relative">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[8px] font-black text-primary">
                    {itemCount}
                  </span>
                </div>
                <span>{currency(cartTotal)}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Info da loja ── */}
      <div className="relative z-10 px-4 -mt-9 pb-4">
        {/* Logo + status na mesma linha */}
        <div className="flex items-end justify-between gap-3">
          {/* Logo */}
          <div className="shrink-0 h-[72px] w-[72px] rounded-2xl overflow-hidden border-2 border-[#2c2c2e] bg-[#2c2c2e] shadow-xl">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                width={72}
                height={72}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-primary/20">
                <span className="text-2xl">🍽️</span>
              </div>
            )}
          </div>

          {/* Status aberto/fechado */}
          <div className={`flex items-center gap-1.5 pb-1 text-[12px] font-bold ${store.isOpen ? 'text-emerald-400' : 'text-red-400'}`}>
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${store.isOpen ? 'bg-emerald-400' : 'bg-red-400'}`} />
            {store.isOpen ? 'ABERTO AGORA' : (nextOpen ?? 'FECHADO')}
          </div>
        </div>

        {/* Nome — linha própria com largura total */}
        <h1 className="mt-2 text-[22px] font-black text-white leading-tight tracking-tight">
          {store.name}
        </h1>

        {/* Linha de detalhes — sempre visível, sem truncate */}
        <div className="mt-3 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-[12px] text-[#a0a0a8]">
            <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>{timeRange}</span>
          </div>
          {addressLine && (
            <div className="flex items-start gap-2 text-[12px] text-[#a0a0a8]">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-px" />
              <span className="leading-snug">{addressLine}</span>
            </div>
          )}
          {Number(store.minOrderValue) > 0 && (
            <div className="flex items-center gap-2 text-[12px] text-[#a0a0a8]">
              <span className="text-primary shrink-0 font-bold">$</span>
              <span>Pedido mínimo <span className="text-white/70 font-medium">{currency(Number(store.minOrderValue))}</span></span>
            </div>
          )}
        </div>

        {/* Horários (expansível) */}
        {store.schedules.length > 0 && (
          <>
            <button
              onClick={() => setShowHours((v) => !v)}
              className="flex items-center gap-1 mt-2 text-[11px] text-[#6e6e76] hover:text-[#a0a0a8] transition"
            >
              Ver horários de funcionamento
              <ChevronDown className={`h-3 w-3 transition-transform ${showHours ? 'rotate-180' : ''}`} />
            </button>
            {showHours && (
              <div className="mt-2 rounded-xl bg-[#2c2c2e] p-3 space-y-1.5">
                {store.schedules.map((s) => (
                  <div key={s.dayOfWeek} className="flex justify-between text-[12px]">
                    <span className="font-medium text-white/70 w-24">{DAY_NAMES[s.dayOfWeek]}</span>
                    <span className="text-[#a0a0a8]">{s.openTime} – {s.closeTime}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
