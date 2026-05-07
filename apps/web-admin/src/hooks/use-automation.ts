import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface AutomationConfig {
  id: string
  isEnabled: boolean
  aiProvider: string
  aiApiKey: string | null
  aiModel: string
  systemPrompt: string | null
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface Conversation {
  id: string
  customerPhone: string
  customerName: string | null
  status: 'ACTIVE' | 'CLOSED'
  createdAt: string
  updatedAt: string
  messages: ConversationMessage[]
  _count?: { messages: number }
}

// ─── Config ───────────────────────────────────────────────────────────────────

export function useAutomationConfig() {
  return useQuery({
    queryKey: ['automation-config'],
    queryFn: () => api.get<{ data: AutomationConfig }>('/automation/config').then((r) => r.data.data),
  })
}

export function useUpdateAutomationConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<AutomationConfig>) =>
      api.patch<{ data: AutomationConfig }>('/automation/config', data).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automation-config'] }),
  })
}

// ─── Conversas ────────────────────────────────────────────────────────────────

export function useConversations(page = 1, search = '') {
  return useQuery({
    queryKey: ['conversations', page, search],
    queryFn: () => {
      const q = new URLSearchParams({ page: String(page) })
      if (search) q.set('search', search)
      return api.get<{ data: Conversation[]; total: number; totalPages: number }>(`/automation/conversations?${q}`).then((r) => r.data)
    },
    refetchInterval: 15_000,
  })
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ['conversation', id],
    queryFn: () => api.get<{ data: Conversation }>(`/automation/conversations/${id}`).then((r) => r.data.data),
    enabled: !!id,
    refetchInterval: 5_000,
  })
}

export function useCloseConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/automation/conversations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] })
      qc.invalidateQueries({ queryKey: ['conversation'] })
    },
  })
}

// ─── Teste ────────────────────────────────────────────────────────────────────

export function useTestAutomation() {
  return useMutation({
    mutationFn: (message: string) =>
      api.post<{ data: { response: string } }>('/automation/test', { message }).then((r) => r.data.data),
  })
}
