'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Database, Wifi, Bot, CreditCard, MessageSquare, Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  'PostgreSQL':                <Database className="h-5 w-5" />,
  'Redis':                     <Database className="h-5 w-5" />,
  'API':                       <Server className="h-5 w-5" />,
  'Asaas (PIX)':               <CreditCard className="h-5 w-5" />,
  'Evolution API (WhatsApp)':  <MessageSquare className="h-5 w-5" />,
  'Atendente IA':              <Bot className="h-5 w-5" />,
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'ok') return <span className="flex items-center gap-1.5 text-xs font-medium text-green-700"><CheckCircle2 className="h-4 w-4" />Online</span>
  if (status === 'configured') return <span className="flex items-center gap-1.5 text-xs font-medium text-blue-700"><CheckCircle2 className="h-4 w-4" />Configurado</span>
  if (status === 'not_configured') return <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><AlertCircle className="h-4 w-4" />Não configurado</span>
  if (status === 'error') return <span className="flex items-center gap-1.5 text-xs font-medium text-red-700"><XCircle className="h-4 w-4" />Erro</span>
  return <span className="text-xs text-muted-foreground">{status}</span>
}

export default function SaudePage() {
  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ['sa-health'],
    queryFn: () => api.get<{ data: any }>('/super-admin/health').then(r => r.data.data),
    refetchInterval: 60_000,
  })

  const overall = data?.overall
  const stats = data?.stats

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Saúde dos Serviços</h1>
          <p className="text-sm text-muted-foreground mt-1">Status em tempo real da plataforma</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching}
          className="flex items-center gap-2 h-9 px-4 rounded-xl border text-sm hover:bg-muted transition disabled:opacity-50">
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Status geral */}
      <div className={cn('rounded-2xl border p-6 flex items-center gap-5',
        overall === 'healthy' ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200')}>
        <div className={cn('h-14 w-14 rounded-full flex items-center justify-center',
          overall === 'healthy' ? 'bg-green-100' : 'bg-orange-100')}>
          {overall === 'healthy'
            ? <CheckCircle2 className="h-7 w-7 text-green-600" />
            : <AlertCircle className="h-7 w-7 text-orange-600" />
          }
        </div>
        <div>
          <p className={cn('text-lg font-bold', overall === 'healthy' ? 'text-green-800' : 'text-orange-800')}>
            {overall === 'healthy' ? 'Todos os serviços operacionais' : 'Sistema com degradação'}
          </p>
          {dataUpdatedAt > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              Verificado em {format(new Date(dataUpdatedAt), "HH:mm:ss 'de' dd/MM/yyyy", { locale: ptBR })}
            </p>
          )}
        </div>
      </div>

      {/* Serviços */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading && [1,2,3,4,5,6].map(i => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
        {(data?.services ?? []).map((service: any) => (
          <div key={service.name} className={cn('bg-card border rounded-2xl p-5 flex items-center gap-4',
            service.status === 'error' && 'border-red-200 bg-red-50/30')}>
            <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center',
              service.status === 'ok' || service.status === 'configured' ? 'bg-muted' :
              service.status === 'not_configured' ? 'bg-muted opacity-50' : 'bg-red-100')}>
              <span className={cn(service.status === 'error' ? 'text-red-600' : 'text-muted-foreground')}>
                {SERVICE_ICONS[service.name] ?? <Wifi className="h-5 w-5" />}
              </span>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm text-foreground">{service.name}</p>
              {service.details && <p className="text-xs text-muted-foreground mt-0.5">{service.details}</p>}
              {service.latency != null && <p className="text-xs text-muted-foreground mt-0.5">{service.latency}ms</p>}
              {service.error && <p className="text-xs text-red-600 mt-0.5">{service.error}</p>}
            </div>
            <StatusBadge status={service.status} />
          </div>
        ))}
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="bg-card border rounded-xl p-6">
          <h2 className="text-sm font-semibold mb-4">Estatísticas da Plataforma</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total de Lojas', value: stats.totalStores },
              { label: 'Lojas Ativas', value: stats.activeStores },
              { label: 'Total de Pedidos', value: stats.totalOrders?.toLocaleString('pt-BR') },
              { label: 'Total de Usuários', value: stats.totalUsers },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-4 rounded-xl bg-muted/30">
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
