import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DeliveryArea {
  id: string
  name: string | null
  type: 'DISTRICT' | 'RADIUS' | 'POLYGON'
  fee: number
  minOrder: number
  freeFrom: number | null
  district: string | null
  radiusKm: number | null
  isActive: boolean
}

export function useDeliveryAreas() {
  return useQuery({
    queryKey: ['delivery-areas'],
    queryFn: () => api.get<{ data: DeliveryArea[] }>('/delivery-areas').then((r) => r.data.data),
  })
}

export function useCreateDeliveryArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<DeliveryArea, 'id'>) =>
      api.post<{ data: DeliveryArea }>('/delivery-areas', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-areas'] }),
  })
}

export function useUpdateDeliveryArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<DeliveryArea> & { id: string }) =>
      api.patch(`/delivery-areas/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-areas'] }),
  })
}

export function useDeleteDeliveryArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/delivery-areas/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['delivery-areas'] }),
  })
}
