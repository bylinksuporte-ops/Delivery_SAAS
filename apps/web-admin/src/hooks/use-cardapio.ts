import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  isActive: boolean
  position: number
  availableFor: 'DELIVERY' | 'PICKUP' | 'BOTH'
  _count?: { products: number }
}

export interface AddonOption {
  id: string
  addonGroupId: string
  name: string
  price: number
  isActive: boolean
  position: number
}

export interface AddonGroup {
  id: string
  productId: string
  name: string
  min: number
  max: number
  required: boolean
  position: number
  options: AddonOption[]
}

export interface Product {
  id: string
  categoryId: string
  name: string
  description: string | null
  price: number
  imageUrl: string | null
  isActive: boolean
  position: number
  tags: string[]
  availableFor: 'DELIVERY' | 'PICKUP' | 'BOTH'
  stockControl: boolean
  stockQty: number | null
  minStock: number | null
  avgCost: number | null
  category?: { id: string; name: string }
  addonGroups?: AddonGroup[]
  _count?: { addonGroups: number }
}

// ─── Categories ──────────────────────────────────────────────────────────

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Category[] }>('/categories')
      return data.data
    },
  })
}

export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; availableFor?: string }) =>
      api.post('/categories', payload).then((r) => r.data.data as Category),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Category> & { id: string }) =>
      api.patch(`/categories/${id}`, data).then((r) => r.data.data as Category),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

export function useReorderCategories() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (items: { id: string; position: number }[]) =>
      api.post('/categories/reorder', { items }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  })
}

// ─── Products ─────────────────────────────────────────────────────────────

export function useProducts(categoryId?: string) {
  return useQuery({
    queryKey: ['products', categoryId],
    queryFn: async () => {
      const params = categoryId ? `?categoryId=${categoryId}` : ''
      const { data } = await api.get<{ data: Product[] }>(`/products${params}`)
      return data.data
    },
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: Product }>(`/products/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export type ProductInput = {
  categoryId: string
  name: string
  description?: string
  price: number
  imageUrl?: string | null
  tags?: string[]
  availableFor?: 'DELIVERY' | 'PICKUP' | 'BOTH'
  stockControl?: boolean
  stockQty?: number | null
  minStock?: number | null
  avgCost?: number | null
}

export function useCreateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductInput) =>
      api.post('/products', payload).then((r) => r.data.data as Product),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['products'] })
      qc.invalidateQueries({ queryKey: ['products', vars.categoryId] })
    },
  })
}

export function useUpdateProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<ProductInput> & { id: string; isActive?: boolean }) =>
      api.patch(`/products/${id}`, data).then((r) => r.data.data as Product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

export function useDeleteProduct() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })
}

// ─── Addons ──────────────────────────────────────────────────────────────

export function useAddonGroups(productId: string) {
  return useQuery({
    queryKey: ['addons', productId],
    queryFn: async () => {
      const { data } = await api.get<{ data: AddonGroup[] }>(`/addons/${productId}/groups`)
      return data.data
    },
    enabled: !!productId,
  })
}

export function useCreateAddonGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ productId, ...data }: { productId: string; name: string; min: number; max: number; required: boolean }) =>
      api.post(`/addons/${productId}/groups`, data).then((r) => r.data.data as AddonGroup),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['addons', vars.productId] }),
  })
}

export function useUpdateAddonGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, productId, ...data }: Partial<AddonGroup> & { id: string; productId: string }) =>
      api.patch(`/addons/groups/${id}`, data).then((r) => r.data.data as AddonGroup),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['addons', vars.productId] }),
  })
}

export function useDeleteAddonGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      api.delete(`/addons/groups/${id}`).then(() => ({ productId })),
    onSuccess: (res) => qc.invalidateQueries({ queryKey: ['addons', res.productId] }),
  })
}

export function useCreateAddonOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, productId, ...data }: { groupId: string; productId: string; name: string; price: number }) =>
      api.post(`/addons/groups/${groupId}/options`, data).then((r) => r.data.data as AddonOption),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['addons', vars.productId] }),
  })
}

export function useUpdateAddonOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, productId, ...data }: Partial<AddonOption> & { id: string; productId: string }) =>
      api.patch(`/addons/options/${id}`, data).then((r) => r.data.data as AddonOption),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['addons', vars.productId] }),
  })
}

export function useDeleteAddonOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, productId }: { id: string; productId: string }) =>
      api.delete(`/addons/options/${id}`).then(() => ({ productId })),
    onSuccess: (res) => qc.invalidateQueries({ queryKey: ['addons', res.productId] }),
  })
}
