import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  availableFor: z.enum(['DELIVERY', 'PICKUP', 'BOTH']).default('BOTH'),
})

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  availableFor: z.enum(['DELIVERY', 'PICKUP', 'BOTH']).optional(),
})

const reorderSchema = z.object({
  // Array de { id, position }
  items: z.array(z.object({ id: z.string(), position: z.number().int().min(0) })),
})

const categoryRoutes: FastifyPluginAsync = async (app) => {
  // Todas as rotas exigem autenticação
  app.addHook('preHandler', authenticate)

  // ─── GET /categories ────────────────────────────────────────────
  app.get('/', async (request) => {
    const categories = await app.prisma.category.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { position: 'asc' },
      include: {
        _count: { select: { products: { where: { isActive: true } } } },
      },
    })
    return { data: categories }
  })

  // ─── POST /categories ────────────────────────────────────────────
  app.post('/', async (request, reply) => {
    const result = createSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    // Posição no final da lista
    const lastCategory = await app.prisma.category.findFirst({
      where: { storeId: request.user.storeId },
      orderBy: { position: 'desc' },
    })

    const category = await app.prisma.category.create({
      data: {
        storeId: request.user.storeId,
        name: result.data.name,
        availableFor: result.data.availableFor,
        position: (lastCategory?.position ?? -1) + 1,
      },
    })

    return reply.status(201).send({ data: category })
  })

  // ─── PATCH /categories/:id ───────────────────────────────────────
  app.patch('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const result = updateSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    const existing = await app.prisma.category.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Categoria não encontrada', statusCode: 404 })

    const updated = await app.prisma.category.update({
      where: { id },
      data: result.data,
    })

    return { data: updated }
  })

  // ─── DELETE /categories/:id ──────────────────────────────────────
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const existing = await app.prisma.category.findFirst({
      where: { id, storeId: request.user.storeId },
    })
    if (!existing) return reply.status(404).send({ error: 'Not Found', message: 'Categoria não encontrada', statusCode: 404 })

    await app.prisma.category.delete({ where: { id } })
    return reply.status(204).send()
  })

  // ─── POST /categories/reorder ────────────────────────────────────
  app.post('/reorder', async (request, reply) => {
    const result = reorderSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: 'Dados inválidos', statusCode: 400 })
    }

    await app.prisma.$transaction(
      result.data.items.map(({ id, position }) =>
        app.prisma.category.updateMany({
          where: { id, storeId: request.user.storeId },
          data: { position },
        }),
      ),
    )

    return { data: { ok: true } }
  })
}

export default categoryRoutes
