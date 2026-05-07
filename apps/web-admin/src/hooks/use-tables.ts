import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface Table {
  id: string
  number: number
  label: string | null
  capacity: number
  isActive: boolean
  qrToken: string
  createdAt: string
}

export function useTables() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get<{ data: Table[] }>('/tables').then((r) => r.data.data),
  })
}

export function useCreateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { number: number; label?: string; capacity?: number }) =>
      api.post<{ data: Table }>('/tables', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useUpdateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<Omit<Table, 'qrToken' | 'createdAt'>> & { id: string }) =>
      api.patch(`/tables/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useDeleteTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tables/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  })
}

export function useRegenerateQr() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: Table }>(`/tables/${id}/regenerate-qr`).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tables'] }),
  })
}
