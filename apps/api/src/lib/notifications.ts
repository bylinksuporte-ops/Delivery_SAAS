import type { PrismaClient } from '@prisma/client'
import { evolutionSendText, WhatsAppTemplates } from './evolution.js'

interface NotifyOrderParams {
  prisma: PrismaClient
  orderId: string
  event: 'ORDER_RECEIVED' | 'OUT_FOR_DELIVERY' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'CANCELLED'
  cancelReason?: string
}

/**
 * Envia notificação WhatsApp ao cliente quando o status do pedido muda.
 * Falhas são silenciosas (não derrubam o fluxo principal).
 */
export async function notifyOrderStatus({ prisma, orderId, event, cancelReason }: NotifyOrderParams): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        orderNumber: true,
        customer: { select: { phone: true } },
        deliveryman: { select: { name: true } },
        store: {
          select: {
            name: true,
            estimatedTime: true,
            evolutionApiUrl: true,
            evolutionApiKey: true,
            evolutionInstance: true,
          },
        },
      },
    })

    if (!order) return

    const { store, customer, orderNumber, deliveryman } = order

    // Sem configuração de WhatsApp — silencioso
    if (!store.evolutionApiUrl || !store.evolutionApiKey || !store.evolutionInstance) return

    // Sem telefone do cliente — silencioso
    if (!customer?.phone) return

    const config = {
      url: store.evolutionApiUrl,
      apiKey: store.evolutionApiKey,
      instance: store.evolutionInstance,
    }

    let text: string
    switch (event) {
      case 'ORDER_RECEIVED':
        text = WhatsAppTemplates.orderReceived(orderNumber, store.name, store.estimatedTime)
        break
      case 'OUT_FOR_DELIVERY':
        text = WhatsAppTemplates.outForDelivery(orderNumber, deliveryman?.name)
        break
      case 'READY_FOR_PICKUP':
        text = WhatsAppTemplates.readyForPickup(orderNumber, store.name)
        break
      case 'DELIVERED':
        text = WhatsAppTemplates.delivered(orderNumber)
        break
      case 'CANCELLED':
        text = WhatsAppTemplates.cancelled(orderNumber, cancelReason)
        break
      default:
        return
    }

    await evolutionSendText(config, customer.phone, text)
  } catch {
    // Falha de WhatsApp nunca deve quebrar o pedido
  }
}
