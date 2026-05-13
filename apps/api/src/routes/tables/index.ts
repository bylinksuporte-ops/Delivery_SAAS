import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'

const tableSchema = z.object({
  number: z.number().int().min(1),
  label: z.string().optional(),
  capacity: z.number().int().min(1).default(4),
  isActive: z.boolean().optional(),
})

const tableRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /tables ──────────────────────────────────────────────────
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const tables = await app.prisma.table.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { number: 'asc' },
    })
    return { data: tables }
  })

  // ─── POST /tables ─────────────────────────────────────────────────
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const result = tableSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const existing = await app.prisma.table.findFirst({
      where: { storeId: request.user.storeId, number: result.data.number },
    })
    if (existing) {
      return reply.status(409).send({
        error: 'Conflict',
        message: `Mesa ${result.data.number} já existe`,
        statusCode: 409,
      })
    }

    const table = await app.prisma.table.create({
      data: { ...result.data, storeId: request.user.storeId },
    })
    return reply.status(201).send({ data: table })
  })

  // ─── PATCH /tables/:id ────────────────────────────────────────────
  app.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = tableSchema.partial().safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation Error',
        message: result.error.issues[0]?.message ?? 'Dados inválidos',
        statusCode: 400,
      })
    }

    const existing = await app.prisma.table.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Mesa não encontrada', statusCode: 404 })
    }

    // Verifica conflito de número (excluindo a própria mesa)
    if (result.data.number !== undefined && result.data.number !== existing.number) {
      const conflict = await app.prisma.table.findFirst({
        where: { storeId: request.user.storeId, number: result.data.number, id: { not: id } },
      })
      if (conflict) {
        return reply.status(409).send({ error: 'Conflict', message: `Mesa ${result.data.number} já existe`, statusCode: 409 })
      }
    }

    const table = await app.prisma.table.update({ where: { id }, data: result.data })
    return { data: table }
  })

  // ─── DELETE /tables/:id ───────────────────────────────────────────
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await app.prisma.table.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Mesa não encontrada', statusCode: 404 })
    }

    const activeOrders = await app.prisma.order.count({
      where: {
        tableId: id,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PRODUCTION', 'READY_FOR_PICKUP'] },
      },
    })
    if (activeOrders > 0) {
      return reply.status(409).send({
        error: 'Conflict',
        message: `Mesa possui ${activeOrders} pedido(s) em andamento. Finalize-os antes de excluir a mesa.`,
        statusCode: 409,
      })
    }

    await app.prisma.table.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ─── POST /tables/:id/regenerate-qr (gera novo token) ────────────
  app.post('/:id/regenerate-qr', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await app.prisma.table.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Mesa não encontrada', statusCode: 404 })
    }

    const { randomUUID } = await import('crypto')
    const table = await app.prisma.table.update({
      where: { id },
      data: { qrToken: randomUUID() },
    })
    return { data: table }
  })
}

// ─── Rota PÚBLICA — valida token do QR e retorna dados da loja/mesa ──
export const tablePublicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/table/:token', async (request, reply) => {
    const { token } = request.params as { token: string }

    const table = await app.prisma.table.findUnique({
      where: { qrToken: token },
      include: { store: { select: { id: true, name: true, slug: true, logoUrl: true, isOpen: true, estimatedTime: true } } },
    })

    if (!table || !table.isActive) {
      return reply.status(404).send({ error: 'Not Found', message: 'Mesa não encontrada ou inativa', statusCode: 404 })
    }

    return {
      data: {
        tableId: table.id,
        tableNumber: table.number,
        tableLabel: table.label,
        store: table.store,
      },
    }
  })
}

export default tableRoutes
