import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Coupon {
  id: string
  code: string
  type: 'PERCENT_DISCOUNT' | 'FIXED_DISCOUNT' | 'FREE_DELIVERY' | 'ITEM_DISCOUNT'
  value: number
  minOrder: number
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  isActive: boolean
  createdAt: string
}

export const COUPON_TYPE_LABELS: Record<string, string> = {
  PERCENT_DISCOUNT: '% Desconto',
  FIXED_DISCOUNT:   'R$ Desconto',
  FREE_DELIVERY:    'Frete Grátis',
  // ITEM_DISCOUNT removido — não implementado na engine de pedidos
}

export function useCoupons() {
  return useQuery({
    queryKey: ['coupons'],
    queryFn: () => api.get<{ data: Coupon[] }>('/coupons').then((r) => r.data.data),
  })
}

export function useCreateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Coupon, 'id' | 'usedCount' | 'createdAt'>) =>
      api.post<{ data: Coupon }>('/coupons', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  })
}

export function useUpdateCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Coupon> & { id: string }) =>
      api.patch(`/coupons/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  })
}

export function useDeleteCoupon() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/coupons/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['coupons'] }),
  })
}
