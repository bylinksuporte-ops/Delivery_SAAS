import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface CashbackConfig {
  id: string
  isActive: boolean
  percentBack: number
  minOrderValue: number
  expirationDays: number
}

export interface PromoStats {
  totalDiscount30d: number
  ordersWithDiscount30d: number
  totalCouponsUsed: number
  activeCoupons: number
  topCoupons: { id: string; code: string; type: string; value: number; usedCount: number }[]
}

export function useCashback() {
  return useQuery({
    queryKey: ['cashback'],
    queryFn: () => api.get<{ data: CashbackConfig }>('/settings/cashback').then((r) => r.data.data),
  })
}

export function useUpdateCashback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<CashbackConfig>) =>
      api.patch<{ data: CashbackConfig }>('/settings/cashback', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cashback'] }),
  })
}

export function usePromoStats() {
  return useQuery({
    queryKey: ['promo-stats'],
    queryFn: () => api.get<{ data: PromoStats }>('/settings/promo-stats').then((r) => r.data.data),
    staleTime: 60_000,
  })
}
