import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type Period = 'today' | '7d' | '30d'

export interface Summary {
  ordersCount: number
  revenue: number
  avgTicket: number
  deliveryFees: number
  discounts: number
  cancelled: number
  newCustomers: number
  revenueGrowth: number | null
}

export interface SalesDay {
  date: string
  count: number
  revenue: number
}

export interface TopProduct {
  productId: string
  name: string
  quantity: number
  revenue: number
}

export interface ReportOrder {
  id: string
  orderNumber: number
  status: string
  type: string
  paymentMethod: string | null
  subtotal: number
  deliveryFee: number
  discount: number
  total: number
  createdAt: string
  customer: { name: string; phone: string } | null
}

export function useSummary(period: Period) {
  return useQuery({
    queryKey: ['reports', 'summary', period],
    queryFn: () =>
      api.get<{ data: Summary }>(`/reports/summary?period=${period}`).then((r) => r.data.data),
    staleTime: 60_000,
  })
}

export function useSalesChart(period: Period) {
  return useQuery({
    queryKey: ['reports', 'sales', period],
    queryFn: () =>
      api.get<{ data: SalesDay[] }>(`/reports/sales?period=${period}`).then((r) => r.data.data),
    staleTime: 60_000,
  })
}

export function useTopProducts(period: Period) {
  return useQuery({
    queryKey: ['reports', 'top-products', period],
    queryFn: () =>
      api
        .get<{ data: TopProduct[] }>(`/reports/top-products?period=${period}&limit=10`)
        .then((r) => r.data.data),
    staleTime: 60_000,
  })
}

export function useReportOrders(period: Period, page = 1) {
  return useQuery({
    queryKey: ['reports', 'orders', period, page],
    queryFn: () =>
      api
        .get<{ data: ReportOrder[]; meta: { total: number; page: number; pages: number } }>(
          `/reports/orders?period=${period}&page=${page}`,
        )
        .then((r) => r.data),
    staleTime: 60_000,
  })
}
