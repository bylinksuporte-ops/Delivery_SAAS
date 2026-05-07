import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SelectedAddon {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  price: number
}

export interface CartItem {
  cartItemId: string   // uuid local para identificar a linha no carrinho
  productId: string
  name: string
  price: number        // preço base do produto
  quantity: number
  notes?: string
  addons: SelectedAddon[]
  imageUrl?: string | null
}

function itemTotal(item: CartItem) {
  const addonsSum = item.addons.reduce((s, a) => s + a.price, 0)
  return (item.price + addonsSum) * item.quantity
}

interface CartState {
  storeSlug: string | null
  items: CartItem[]
  isOpen: boolean

  openCart: () => void
  closeCart: () => void
  toggleCart: () => void

  addItem: (item: Omit<CartItem, 'cartItemId'>, slug: string) => void
  removeItem: (cartItemId: string) => void
  updateQty: (cartItemId: string, qty: number) => void
  clearCart: () => void

  subtotal: () => number
  totalItems: () => number
}

let _idCounter = 0
function newId() { return `ci_${Date.now()}_${++_idCounter}` }

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeSlug: null,
      items: [],
      isOpen: false,

      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),

      addItem: (item, slug) => {
        const { storeSlug } = get()

        // Se trocou de loja, limpa o carrinho
        if (storeSlug && storeSlug !== slug) {
          set({ items: [], storeSlug: slug })
        }

        set({
          storeSlug: slug,
          isOpen: true,
          items: [...get().items, { ...item, cartItemId: newId() }],
        })
      },

      removeItem: (cartItemId) =>
        set((s) => ({ items: s.items.filter((i) => i.cartItemId !== cartItemId) })),

      updateQty: (cartItemId, qty) =>
        set((s) => ({
          items: qty <= 0
            ? s.items.filter((i) => i.cartItemId !== cartItemId)
            : s.items.map((i) => i.cartItemId === cartItemId ? { ...i, quantity: qty } : i),
        })),

      clearCart: () => set({ items: [], storeSlug: null }),

      subtotal: () => get().items.reduce((s, i) => s + itemTotal(i), 0),
      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
    }),
    {
      name: 'delivery-cart',
      partialize: (s) => ({ storeSlug: s.storeSlug, items: s.items }),
    },
  ),
)

export { itemTotal }
