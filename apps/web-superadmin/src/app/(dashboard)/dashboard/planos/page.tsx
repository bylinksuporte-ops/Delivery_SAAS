'use client'

import { Check, Zap, Star, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = [
  {
    id: 'basic',
    name: 'Básico',
    icon: <Zap className="h-5 w-5" />,
    color: 'text-blue-600 bg-blue-50',
    price: 'R$ 49',
    period: '/mês',
    description: 'Ideal para quem está começando',
    features: [
      '1 loja',
      'Cardápio ilimitado',
      'Pedidos online',
      'WhatsApp integrado',
      'Relatórios básicos',
      'Suporte por e-mail',
    ],
    missing: ['Atendente IA', 'Multi-lojas', 'API avançada'],
    cta: 'Plano atual padrão',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: <Star className="h-5 w-5" />,
    color: 'text-primary bg-primary/10',
    price: 'R$ 99',
    period: '/mês',
    description: 'Para negócios em crescimento',
    features: [
      'Até 3 lojas',
      'Cardápio ilimitado',
      'Pedidos online',
      'WhatsApp integrado',
      'Atendente IA (Claude)',
      'Relatórios avançados',
      'Cashback para clientes',
      'Suporte prioritário',
    ],
    missing: ['Multi-lojas ilimitado'],
    cta: 'Mais popular',
    highlighted: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: <Building2 className="h-5 w-5" />,
    color: 'text-purple-600 bg-purple-50',
    price: 'Sob consulta',
    period: '',
    description: 'Para franquias e grandes redes',
    features: [
      'Lojas ilimitadas',
      'Cardápio ilimitado',
      'Pedidos online',
      'WhatsApp integrado',
      'Atendente IA avançado',
      'API personalizada',
      'White-label',
      'SLA garantido',
      'Gerente de conta dedicado',
    ],
    missing: [],
    cta: 'Entre em contato',
    highlighted: false,
  },
]

export default function PlanosPage() {
  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Planos</h1>
        <p className="text-sm text-muted-foreground mt-1">Estrutura de planos e funcionalidades por tier</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <div key={plan.id} className={cn(
            'relative rounded-2xl border bg-card p-6 space-y-5 flex flex-col',
            plan.highlighted && 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary',
          )}>
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                  ⭐ Mais popular
                </span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', plan.color)}>
                {plan.icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
                <p className="text-xs text-muted-foreground">{plan.description}</p>
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-foreground">{plan.price}</span>
              <span className="text-sm text-muted-foreground">{plan.period}</span>
            </div>

            <div className="flex-1 space-y-2">
              {plan.features.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-foreground">{f}</span>
                </div>
              ))}
              {plan.missing.map((f) => (
                <div key={f} className="flex items-center gap-2 text-sm opacity-40">
                  <div className="h-4 w-4 rounded-full border border-muted-foreground shrink-0" />
                  <span className="text-muted-foreground line-through">{f}</span>
                </div>
              ))}
            </div>

            <div className={cn(
              'rounded-xl px-4 py-2.5 text-sm font-semibold text-center',
              plan.highlighted
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground',
            )}>
              {plan.cta}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold">Comparativo de funcionalidades</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-medium text-muted-foreground">Funcionalidade</th>
                {PLANS.map(p => <th key={p.id} className="text-center py-2 font-semibold">{p.name}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                ['Cardápio ilimitado', true, true, true],
                ['Pedidos online', true, true, true],
                ['WhatsApp (notificações)', true, true, true],
                ['Caixa / PDV', true, true, true],
                ['Relatórios', 'Básico', 'Avançado', 'Avançado'],
                ['Atendente IA', false, true, true],
                ['Cashback', false, true, true],
                ['Número de lojas', '1', '3', 'Ilimitado'],
                ['White-label', false, false, true],
                ['API acesso', false, false, true],
                ['SLA', false, false, '99.9%'],
              ].map(([feature, ...values]) => (
                <tr key={String(feature)}>
                  <td className="py-2.5 text-foreground">{feature}</td>
                  {values.map((v, i) => (
                    <td key={i} className="py-2.5 text-center">
                      {v === true ? <Check className="h-4 w-4 text-green-600 mx-auto" /> :
                       v === false ? <span className="text-muted-foreground">—</span> :
                       <span className="text-xs font-medium">{v}</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
