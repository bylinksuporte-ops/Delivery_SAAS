'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Copy, Clock, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { currency } from '@/lib/utils'

interface GatewayData {
  qrCodeImage: string   // base64 PNG
  qrCodeText: string    // copia-e-cola
  expiresAt: string     // ISO datetime
}

interface PaymentData {
  id: string
  method: string
  amount: number
  status: string
  gatewayData: GatewayData | null
  paidAt: string | null
}

function useCountdown(expiresAt: string | null) {
  const [seconds, setSeconds] = useState<number>(0)

  useEffect(() => {
    if (!expiresAt) return undefined

    function calc() {
      const diff = Math.max(0, Math.floor((new Date(expiresAt!).getTime() - Date.now()) / 1000))
      setSeconds(diff)
    }
    calc()
    const timer = setInterval(calc, 1000)
    return () => clearInterval(timer)
  }, [expiresAt])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return { seconds, formatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` }
}

export default function PixPaymentPage() {
  const { slug, orderId } = useParams<{ slug: string; orderId: string }>()
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  const { data: payment } = useQuery({
    queryKey: ['payment', orderId],
    queryFn: () => api.get<{ data: PaymentData }>(`/orders/${orderId}/payment`).then((r) => r.data.data),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === 'PAID' || status === 'REFUNDED') return false
      return 5_000
    },
  })

  // Redireciona automaticamente quando confirmado
  useEffect(() => {
    if (payment?.status !== 'PAID') return undefined
    const timer = setTimeout(() => router.push(`/${slug}/pedido/${orderId}`), 2000)
    return () => clearTimeout(timer)
  }, [payment?.status, slug, orderId, router])

  const gd = payment?.gatewayData
  const { formatted: countdown } = useCountdown(gd?.expiresAt ?? null)

  async function handleCopy() {
    if (!gd?.qrCodeText) return
    await navigator.clipboard.writeText(gd.qrCodeText)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  // Pago!
  if (payment?.status === 'PAID') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-green-700">Pagamento confirmado!</h1>
          <p className="text-sm text-muted-foreground">Redirecionando para acompanhar seu pedido...</p>
          <div className="h-5 w-5 mx-auto animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </div>
    )
  }

  // Carregando
  if (!payment) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="mx-auto max-w-xl px-4 flex items-center gap-3 py-3">
          <button
            onClick={() => router.push(`/${slug}/pedido/${orderId}`)}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="font-bold text-base">Pagar com Pix</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6 space-y-4">
        {/* Valor + timer */}
        <div className="rounded-2xl bg-white border p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total a pagar</p>
            <p className="text-2xl font-bold text-primary">{currency(payment.amount)}</p>
          </div>
          {gd?.expiresAt && (
            <div className="flex items-center gap-1.5 text-sm text-orange-600">
              <Clock className="h-4 w-4" />
              <span className="font-semibold tabular-nums">{countdown}</span>
            </div>
          )}
        </div>

        {gd ? (
          <>
            {/* QR Code */}
            <div className="rounded-2xl bg-white border p-5 flex flex-col items-center gap-4">
              <p className="text-sm font-semibold text-foreground">Escaneie o QR Code</p>
              <div className="rounded-xl overflow-hidden border p-2 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${gd.qrCodeImage}`}
                  alt="QR Code Pix"
                  className="h-52 w-52"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Abra o app do seu banco, acesse a área Pix e escaneie o código
              </p>
            </div>

            {/* Copia e Cola */}
            <div className="rounded-2xl bg-white border p-4 space-y-3">
              <p className="text-sm font-semibold">Ou use o código Pix Copia e Cola</p>
              <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2">
                <p className="flex-1 truncate text-xs text-muted-foreground font-mono">{gd.qrCodeText}</p>
              </div>
              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition
                  ${copied
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Código copiado!' : 'Copiar código Pix'}
              </button>
            </div>
          </>
        ) : (
          // Fallback — PIX manual (sem Asaas configurado)
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-5 space-y-3">
            <div className="text-center space-y-1">
              <p className="font-semibold text-yellow-800">Pix manual</p>
              <p className="text-sm text-yellow-700">
                Faça o pagamento via Pix e envie o comprovante para a loja confirmar seu pedido.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-yellow-800">Como pagar:</p>
              <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Abra o app do seu banco e acesse o Pix</li>
                <li>Copie a chave Pix da loja (peça no WhatsApp)</li>
                <li>Faça o pagamento de <strong>{currency(payment.amount)}</strong></li>
                <li>Envie o comprovante pelo WhatsApp para a loja</li>
              </ol>
            </div>
            <a
              href={`https://wa.me/?text=Pedido+confirmado!+Segue+o+comprovante+do+PIX+de+${currency(payment.amount)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-green-600 text-white py-3 text-sm font-semibold hover:bg-green-700 transition"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Avisar a loja pelo WhatsApp
            </a>
          </div>
        )}

        {/* Aguardando */}
        <div className="rounded-2xl bg-white border p-4 flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent shrink-0" />
          <p className="text-sm text-muted-foreground">
            Aguardando confirmação do pagamento...
          </p>
        </div>

        {/* Acompanhar pedido */}
        <button
          onClick={() => router.push(`/${slug}/pedido/${orderId}`)}
          className="w-full rounded-2xl border border-primary py-3 text-sm font-semibold text-primary hover:bg-primary/5 transition"
        >
          Acompanhar pedido
        </button>
      </div>
    </div>
  )
}
