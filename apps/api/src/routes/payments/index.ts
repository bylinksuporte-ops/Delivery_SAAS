import type { FastifyPluginAsync } from 'fastify'

interface AsaasWebhookPayload {
  event: string
  payment?: {
    id: string
    status?: string
    value?: number
    externalReference?: string
  }
}

const paymentRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /payments/webhook/asaas ─────────────────────────────────
  app.post('/webhook/asaas', async (request, reply) => {
    // Validação por token de acesso (configurável via env ASAAS_WEBHOOK_TOKEN)
    const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN
    if (webhookToken) {
      const headerToken = request.headers['asaas-access-token'] as string | undefined
      if (headerToken !== webhookToken) {
        app.log.warn({ url: request.url }, 'Webhook Asaas rejeitado: token inválido')
        return reply.status(401).send({ error: 'Unauthorized' })
      }
    }

    const body = request.body as AsaasWebhookPayload
    app.log.info({ event: body.event }, 'Asaas webhook recebido')

    const confirmEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED']

    if (confirmEvents.includes(body.event) && body.payment?.id) {
      const gatewayId = body.payment.id

      const payment = await app.prisma.payment.findFirst({
        where: { gatewayId },
      })

      if (payment && payment.status !== 'PAID') {
        await app.prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'PAID', paidAt: new Date() },
        })

        await app.prisma.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
        })

        app.log.info({ orderId: payment.orderId }, 'Pagamento confirmado via webhook')
      }
    }

    return reply.send({ received: true })
  })
}

export default paymentRoutes
