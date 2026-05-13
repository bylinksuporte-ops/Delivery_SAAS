import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'

const deliverymanSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  vehicle: z.string().optional(),
  isActive: z.boolean().optional(),
  commission: z.number().min(0).max(100).optional(),
})

const deliverymenRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /deliverymen ─────────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const deliverymen = await app.prisma.deliveryman.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { orders: { where: { status: 'DELIVERED' } } } },
      },
    })
    return {
      data: deliverymen.map((d) => ({
        ...d,
        commission: Number(d.commission),
      })),
    }
  })

  // ─── POST /deliverymen ────────────────────────────────────────────
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = deliverymanSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const d = await app.prisma.deliveryman.create({
      data: {
        ...result.data,
        storeId: request.user.storeId,
      },
    })
    return reply.status(201).send({ data: { ...d, commission: Number(d.commission) } })
  })

  // ─── PATCH /deliverymen/:id ───────────────────────────────────────
  app.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = deliverymanSchema.partial().safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const existing = await app.prisma.deliveryman.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Entregador não encontrado', statusCode: 404 })
    }

    const d = await app.prisma.deliveryman.update({
      where: { id },
      data: result.data,
    })
    return { data: { ...d, commission: Number(d.commission) } }
  })

  // ─── DELETE /deliverymen/:id ──────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await app.prisma.deliveryman.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Entregador não encontrado', statusCode: 404 })
    }

    // Desvincula pedidos antes de deletar
    await app.prisma.order.updateMany({
      where: { deliverymanId: id },
      data: { deliverymanId: null },
    })

    await app.prisma.deliveryman.delete({ where: { id } })
    return reply.status(204).send()
  })
}

export default deliverymenRoutes
