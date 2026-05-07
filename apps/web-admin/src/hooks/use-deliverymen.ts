import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Deliveryman {
  id: string
  name: string
  phone: string | null
  vehicle: string | null
  isActive: boolean
  commission: number
  createdAt: string
  _count: { orders: number }
}

export function useDeliverymen() {
  return useQuery({
    queryKey: ['deliverymen'],
    queryFn: () => api.get<{ data: Deliveryman[] }>('/deliverymen').then((r) => r.data.data),
  })
}

export function useCreateDeliveryman() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Deliveryman, 'id' | '_count' | 'createdAt'>) =>
      api.post<{ data: Deliveryman }>('/deliverymen', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliverymen'] }),
  })
}

export function useUpdateDeliveryman() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Omit<Deliveryman, '_count'>> & { id: string }) =>
      api.patch(`/deliverymen/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliverymen'] }),
  })
}

export function useDeleteDeliveryman() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/deliverymen/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deliverymen'] }),
  })
}

export function useAssignDeliveryman() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ orderId, deliverymanId }: { orderId: string; deliverymanId: string | null }) =>
      api.patch(`/orders/${orderId}/deliveryman`, { deliverymanId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}
