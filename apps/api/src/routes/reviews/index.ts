import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

const reviewRoutes: FastifyPluginAsync = async (app) => {
  // POST /reviews/:orderId — cliente avalia o pedido (público)
  app.post('/:orderId', async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const schema = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(500).optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const order = await app.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, storeId: true, status: true },
    })
    if (!order) return reply.status(404).send({ error: 'Not Found', message: 'Pedido não encontrado', statusCode: 404 })
    if (order.status !== 'DELIVERED') {
      return reply.status(422).send({ error: 'Unavailable', message: 'Só é possível avaliar pedidos entregues', statusCode: 422 })
    }

    const existing = await app.prisma.orderReview.findUnique({ where: { orderId } })
    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Pedido já foi avaliado', statusCode: 409 })
    }

    const review = await app.prisma.orderReview.create({
      data: { orderId, storeId: order.storeId, rating: body.data.rating, comment: body.data.comment },
    })
    return reply.status(201).send({ data: review })
  })

  // GET /reviews/:orderId — ver avaliação de um pedido
  app.get('/:orderId', async (request, reply) => {
    const { orderId } = request.params as { orderId: string }
    const review = await app.prisma.orderReview.findUnique({ where: { orderId } })
    if (!review) return reply.status(404).send({ error: 'Not Found', message: 'Avaliação não encontrada', statusCode: 404 })
    return { data: review }
  })

  // GET /reviews/store/:storeId/summary — média da loja (público)
  app.get('/store/:storeSlug/summary', async (request, reply) => {
    const { storeSlug } = request.params as { storeSlug: string }
    const store = await app.prisma.store.findUnique({ where: { slug: storeSlug }, select: { id: true } })
    if (!store) return reply.status(404).send({ error: 'Not Found', message: 'Loja não encontrada', statusCode: 404 })

    const result = await app.prisma.orderReview.aggregate({
      where: { storeId: store.id },
      _avg: { rating: true },
      _count: true,
    })
    return { data: { avg: result._avg.rating ?? 0, count: result._count } }
  })
}

export default reviewRoutes
