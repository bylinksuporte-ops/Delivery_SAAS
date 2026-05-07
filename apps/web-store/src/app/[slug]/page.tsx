'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Script from 'next/script'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'
import { cn } from '@delivery/ui'
import { StoreHeader } from '@/components/store/store-header'
import { ProductModal } from '@/components/store/product-modal'
import { CartDrawer } from '@/components/store/cart-drawer'
import { Plus, Search, X } from 'lucide-react'

interface AddonOption { id: string; name: string; price: number; isActive: boolean; position: number }
interface AddonGroup { id: string; name: string; min: number; max: number; required: boolean; options: AddonOption[] }
interface Product {
  id: string; name: string; description: string | null; price: number
  imageUrl: string | null; tags: string[]; availableFor: string
  stockControl: boolean; stockQty: number | null
  addonGroups: AddonGroup[]
}
interface Category { id: string; name: string; products: Product[] }
interface StoreData {
  id: string; name: string; slug: string; logoUrl: string | null
  description: string | null; isOpen: boolean; estimatedTime: number
  minOrderValue: number; timezone: string
  primaryColor: string; layoutStyle: string; bannerUrl: string | null
  address: string | null; number: string | null; district: string | null
  city: string | null; state: string | null
  facebookPixelId: string | null; googleTagManagerId: string | null
  storeNotice: string | null; storeNoticeType: string | null
  schedules: { dayOfWeek: number; openTime: string; closeTime: string }[]
}

const TAG_STYLES: Record<string, string> = {
  destaque:     'bg-amber-100 text-amber-700 border-amber-200',
  novo:         'bg-sky-100 text-sky-700 border-sky-200',
  vegano:       'bg-emerald-100 text-emerald-700 border-emerald-200',
  picante:      'bg-red-100 text-red-700 border-red-200',
  'sem glúten': 'bg-violet-100 text-violet-700 border-violet-200',
}

const ALL_TAGS = ['destaque', 'novo', 'vegano', 'picante', 'sem glúten']

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const navRef = useRef<HTMLDivElement>(null)

  const { data: store, isLoading: storeLoading, error: storeError } = useQuery({
    queryKey: ['store', slug],
    queryFn: () => api.get<{ data: StoreData }>(`/store/${slug}`).then((r) => r.data.data),
  })

  const { data: menu = [], isLoading: menuLoading } = useQuery({
    queryKey: ['menu', slug],
    queryFn: () => api.get<{ data: Category[] }>(`/store/${slug}/menu`).then((r) => r.data.data),
    enabled: !!store,
  })

  // Highlight active category on scroll
  useEffect(() => {
    if (!menu.length) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id.replace('cat-', '')
            setActiveCategory(id)
            // Scroll nav pill into view
            const btn = navRef.current?.querySelector(`[data-cat="${id}"]`) as HTMLElement
            btn?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 },
    )
    menu.forEach((cat) => {
      const el = document.getElementById(`cat-${cat.id}`)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [menu])

  // Aplica cor primária da loja via CSS variable
  useEffect(() => {
    if (store?.primaryColor) {
      const hex = store.primaryColor
      // Converte hex para HSL para o sistema de design
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b)
      let h = 0, s = 0
      const l = (max + min) / 2
      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
          case g: h = ((b - r) / d + 2) / 6; break
          case b: h = ((r - g) / d + 4) / 6; break
        }
      }
      const hsl = `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
      document.documentElement.style.setProperty('--primary', hsl)
      document.documentElement.style.setProperty('--ring', hsl)
    }
    return () => {
      document.documentElement.style.removeProperty('--primary')
      document.documentElement.style.removeProperty('--ring')
    }
  }, [store?.primaryColor])

  if (storeLoading) return <PageSkeleton />

  if (storeError || !store) {
    return (
      <div className="flex min-h-screen items-center justify-center text-center px-4 bg-muted/20">
        <div className="space-y-4">
          <div className="text-7xl">😕</div>
          <h1 className="text-2xl font-bold">Loja não encontrada</h1>
          <p className="text-muted-foreground">Verifique o endereço e tente novamente.</p>
        </div>
      </div>
    )
  }

  // Filtra menu por busca e tag
  const filteredMenu = menu.map((cat) => ({
    ...cat,
    products: cat.products.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)
      const matchTag = !activeTag || p.tags.map(t => t.toLowerCase()).includes(activeTag)
      return matchSearch && matchTag
    }),
  })).filter((c) => c.products.length > 0)

  const categoriesWithProducts = search || activeTag ? filteredMenu : menu.filter((c) => c.products.length > 0)

  function scrollToCategory(id: string) {
    setActiveCategory(id)
    const el = document.getElementById(`cat-${id}`)
    if (el) {
      const offset = 160
      const top = el.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <StoreHeader store={store} />

      {/* Nav de categorias — sticky com estilo escuro igual ao header */}
      {categoriesWithProducts.length > 1 && (
        <nav className="sticky top-0 z-30 bg-[#1c1c1e] border-b border-white/5">
          <div className="mx-auto max-w-2xl px-4" ref={navRef}>
            <div className="flex gap-1.5 overflow-x-auto py-2.5 scrollbar-none">
              {categoriesWithProducts.map((cat) => (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className={cn(
                    'shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-all whitespace-nowrap',
                    activeCategory === cat.id
                      ? 'bg-primary text-white shadow-sm shadow-primary/40'
                      : 'text-[#8e8e93] hover:text-white hover:bg-white/10',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}

      {/* FB Pixel */}
      {store.facebookPixelId && (
        <Script id="fb-pixel" strategy="afterInteractive">{`
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init','${store.facebookPixelId}');fbq('track','PageView');
        `}</Script>
      )}

      {/* Google Tag Manager */}
      {store.googleTagManagerId && (
        <Script id="gtm" strategy="afterInteractive">{`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${store.googleTagManagerId}');
        `}</Script>
      )}

      {/* Aviso no cardápio */}
      {store.storeNotice && (
        <div className={cn('mx-auto max-w-2xl px-4 pt-3', '')}>
          <div className={cn('rounded-xl px-4 py-3 text-sm font-medium flex items-center gap-2',
            store.storeNoticeType === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
            store.storeNoticeType === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            'bg-blue-50 border border-blue-200 text-blue-800'
          )}>
            <span>{store.storeNoticeType === 'warning' ? '⚠️' : store.storeNoticeType === 'success' ? '✅' : 'ℹ️'}</span>
            {store.storeNotice}
          </div>
        </div>
      )}

      {/* Busca e filtros */}
      <div className="mx-auto max-w-2xl px-4 pt-4 space-y-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no cardápio..."
            className="w-full h-10 pl-10 pr-10 rounded-2xl border bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {ALL_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1 text-xs font-semibold border transition-all capitalize',
                activeTag === tag
                  ? cn('bg-primary text-primary-foreground border-primary shadow-sm')
                  : cn(TAG_STYLES[tag] ?? 'bg-muted text-muted-foreground border-border', 'hover:opacity-80'),
              )}
            >
              {tag}
            </button>
          ))}
        </div>
        {(search || activeTag) && (
          <p className="text-xs text-muted-foreground px-1">
            {categoriesWithProducts.reduce((s, c) => s + c.products.length, 0)} resultado(s)
            {search ? ` para "${search}"` : ''}
            {activeTag ? ` com tag "${activeTag}"` : ''}
            <button onClick={() => { setSearch(''); setActiveTag(null) }} className="ml-2 text-primary hover:underline">Limpar</button>
          </p>
        )}
      </div>

      {/* Cardápio */}
      <main className="mx-auto max-w-2xl px-4 py-4 space-y-10 pb-32">
        {menuLoading ? (
          <MenuSkeleton />
        ) : categoriesWithProducts.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            {search || activeTag ? (
              <>
                <div className="text-5xl">🔍</div>
                <p className="text-lg font-bold text-foreground">Nada encontrado</p>
                <p className="text-sm text-muted-foreground">Tente outro termo ou remova os filtros</p>
                <button onClick={() => { setSearch(''); setActiveTag(null) }}
                  className="text-sm text-primary hover:underline font-medium">Limpar filtros</button>
              </>
            ) : (
              <>
                <div className="text-6xl">🍽️</div>
                <p className="text-xl font-bold text-foreground">Cardápio em preparação</p>
                <p className="text-sm text-muted-foreground">Em breve novidades por aqui!</p>
              </>
            )}
          </div>
        ) : (
          categoriesWithProducts.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-24">
              <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-primary inline-block" />
                {cat.name}
              </h2>

              {/* Layout controlado pela configuração da loja */}
              {store.layoutStyle === 'list' ? (
                <div className="space-y-2">
                  {cat.products.map((product) => (
                    <ProductCardList key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
                  ))}
                </div>
              ) : cat.products.every((p) => p.imageUrl) ? (
                <div className="grid grid-cols-2 gap-3">
                  {cat.products.map((product) => (
                    <ProductCardGrid key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {cat.products.map((product) => (
                    <ProductCardList key={product.id} product={product} onClick={() => setSelectedProduct(product)} />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </main>

      <ProductModal product={selectedProduct} slug={slug} onClose={() => setSelectedProduct(null)} />
      <CartDrawer slug={slug} />
    </div>
  )
}

// ─── Card em grade (com imagem) ───────────────────────────────────────────────
function ProductCardGrid({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="group relative flex flex-col rounded-2xl bg-white border overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.98] text-left">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {product.imageUrl
          ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          : <div className="flex h-full w-full items-center justify-center text-3xl">🍽️</div>
        }
        {/* Tags */}
        {product.tags.length > 0 && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {product.tags.slice(0, 2).map((tag) => (
              <span key={tag} className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold border backdrop-blur-sm', TAG_STYLES[tag.toLowerCase()] ?? 'bg-white/80 text-foreground border-border')}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {/* Plus button */}
        <div className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-200">
          <Plus className="h-4 w-4" />
        </div>
      </div>
      <div className="p-3 space-y-1">
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2">{product.name}</p>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
        )}
        <p className="text-sm font-bold text-primary pt-0.5">{currency(Number(product.price))}</p>
      </div>
    </button>
  )
}

// ─── Card em lista (sem imagem ou misto) ─────────────────────────────────────
function ProductCardList({ product, onClick }: { product: Product; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-2xl bg-white border p-3.5 text-left shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 active:scale-[0.99]">
      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-sm text-foreground">{product.name}</span>
          {product.tags.map((tag) => (
            <span key={tag} className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold border', TAG_STYLES[tag.toLowerCase()] ?? 'bg-muted text-muted-foreground border-border')}>
              {tag}
            </span>
          ))}
        </div>
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
        )}
        <p className="text-sm font-bold text-primary">{currency(Number(product.price))}</p>
      </div>

      {/* Imagem + botão */}
      <div className="relative shrink-0">
        {product.imageUrl ? (
          <div className="h-20 w-20 overflow-hidden rounded-xl bg-muted">
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
          </div>
        ) : (
          <div className="h-20 w-20 overflow-hidden rounded-xl bg-muted flex items-center justify-center text-2xl">🍽️</div>
        )}
        <div className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white shadow-md border-2 border-white">
          <Plus className="h-3.5 w-3.5" />
        </div>
      </div>
    </button>
  )
}

// ─── Skeletons ────────────────────────────────────────────────────────────────
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-40 bg-gradient-to-r from-primary/90 to-primary animate-pulse" />
      <div className="mx-auto max-w-2xl px-4 -mt-6 pb-3">
        <div className="h-16 rounded-2xl bg-white border shadow-md animate-pulse" />
      </div>
      <div className="mx-auto max-w-2xl px-4 py-6"><MenuSkeleton /></div>
    </div>
  )
}

function MenuSkeleton() {
  return (
    <div className="space-y-8">
      {[1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-28 rounded-full bg-muted animate-pulse" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="rounded-2xl bg-muted animate-pulse aspect-[3/4]" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
