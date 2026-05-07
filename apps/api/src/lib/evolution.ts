/**
 * Cliente HTTP para Evolution API (WhatsApp)
 * Docs: https://doc.evolution-api.com
 */

interface EvolutionConfig {
  url: string
  apiKey: string
  instance: string
}

async function evolutionFetch(
  config: EvolutionConfig,
  path: string,
  body: unknown,
): Promise<void> {
  const res = await fetch(`${config.url.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: config.apiKey,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Evolution API ${res.status}: ${text}`)
  }
}

/** Envia mensagem de texto simples */
export async function evolutionSendText(
  config: EvolutionConfig,
  phone: string,
  text: string,
): Promise<void> {
  // Remove tudo que não for dígito e garante DDI 55
  const cleaned = phone.replace(/\D/g, '')
  const number = cleaned.startsWith('55') ? cleaned : `55${cleaned}`

  await evolutionFetch(config, `/message/sendText/${config.instance}`, {
    number,
    text,
  })
}

/** Templates de mensagens */
export const WhatsAppTemplates = {
  orderReceived: (orderNumber: number, storeName: string, estimatedTime: number) =>
    `✅ *Pedido #${orderNumber} recebido!*\n\nObrigado por pedir na *${storeName}*!\n⏱ Tempo estimado: *${estimatedTime} min*\n\nAcompanhe seu pedido pelo link que você recebeu.`,

  outForDelivery: (orderNumber: number, deliverymanName?: string) => {
    const dm = deliverymanName ? `\n🏍 Entregador: *${deliverymanName}*` : ''
    return `🛵 *Pedido #${orderNumber} saiu para entrega!*${dm}\n\nFique atento — seu pedido está a caminho!`
  },

  readyForPickup: (orderNumber: number, storeName: string) =>
    `🏠 *Pedido #${orderNumber} pronto para retirada!*\n\nSeu pedido está esperando em *${storeName}*. Pode vir buscar!`,

  delivered: (orderNumber: number) =>
    `🎉 *Pedido #${orderNumber} entregue!*\n\nEsperamos que aproveite! Volte sempre. 😊`,

  cancelled: (orderNumber: number, reason?: string) => {
    const reasonLine = reason ? `\nMotivo: ${reason}` : ''
    return `❌ *Pedido #${orderNumber} cancelado.*${reasonLine}\n\nSe tiver dúvidas, entre em contato conosco.`
  },
}
