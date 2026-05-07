import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { z } from 'zod'

const groupSchema = z.object({
  name: z.string().min(1),
  min: z.number().int().min(0).default(0),
  max: z.number().int().min(1).default(1),
  required: z.boolean().default(false),
})

const groupUpdateSchema = groupSchema.partial().extend({
  position: z.number().int().min(0).optional(),
})

const optionSchema = z.object({
  name: z.string().min(1),
  price: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
})

const optionUpdateSchema = optionSchema.partial().extend({
  position: z.number().int().min(0).optional(),
})

const addonRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate)

  // Helper: verifica que o produto pertence à loja
  async function getProduct(productId: string, storeId: string) {
    return app.prisma.product.findFirst({ where: { id: productId, storeId } })
  }

  // Helper: verifica que o grupo pertence a um produto da loja
  async function getGroup(groupId: string, storeId: string) {
    return app.prisma.addonGroup.findFirst({
      where: { id: groupId, product: { storeId } },
    })
  }

  // ─── GET /addons/:productId/groups ────────────────────────────────
  app.get('/:productId/groups', async (request, reply) => {
    const { productId } = request.params as { productId: string }
    const product = await getProduct(productId, request.user.storeId)
    if (!product) return reply.status(404).send({ error: 'Not Found', message: 'Produto não encontrado', statusCode: 404 })

    const groups = await app.prisma.addonGroup.findMany({
      where: { productId },
      orderBy: { position: 'asc' },
      include: { options: { orderBy: { position: 'asc' } } },
    })

    return { data: groups }
  })

  // ─── POST /addons/:productId/groups ──────────────────────────────
  app.post('/:productId/groups', async (request, reply) => {
    const { productId } = request.params as { productId: string }
    const result = groupSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    const product = await getProduct(productId, request.user.storeId)
    if (!product) return reply.status(404).send({ error: 'Not Found', message: 'Produto não encontrado', statusCode: 404 })

    const last = await app.prisma.addonGroup.findFirst({ where: { productId }, orderBy: { position: 'desc' } })

    const group = await app.prisma.addonGroup.create({
      data: {
        productId,
        name: result.data.name,
        min: result.data.min,
        max: result.data.max,
        required: result.data.required,
        position: (last?.position ?? -1) + 1,
      },
      include: { options: true },
    })

    return reply.status(201).send({ data: group })
  })

  // ─── PATCH /addons/groups/:groupId ───────────────────────────────
  app.patch('/groups/:groupId', async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const result = groupUpdateSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    const group = await getGroup(groupId, request.user.storeId)
    if (!group) return reply.status(404).send({ error: 'Not Found', message: 'Grupo não encontrado', statusCode: 404 })

    const updated = await app.prisma.addonGroup.update({
      where: { id: groupId },
      data: result.data,
      include: { options: { orderBy: { position: 'asc' } } },
    })

    return { data: updated }
  })

  // ─── DELETE /addons/groups/:groupId ──────────────────────────────
  app.delete('/groups/:groupId', async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const group = await getGroup(groupId, request.user.storeId)
    if (!group) return reply.status(404).send({ error: 'Not Found', message: 'Grupo não encontrado', statusCode: 404 })

    await app.prisma.addonGroup.delete({ where: { id: groupId } })
    return reply.status(204).send()
  })

  // ─── POST /addons/groups/:groupId/options ─────────────────────────
  app.post('/groups/:groupId/options', async (request, reply) => {
    const { groupId } = request.params as { groupId: string }
    const result = optionSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    const group = await getGroup(groupId, request.user.storeId)
    if (!group) return reply.status(404).send({ error: 'Not Found', message: 'Grupo não encontrado', statusCode: 404 })

    const last = await app.prisma.addonOption.findFirst({ where: { addonGroupId: groupId }, orderBy: { position: 'desc' } })

    const option = await app.prisma.addonOption.create({
      data: {
        addonGroupId: groupId,
        name: result.data.name,
        price: result.data.price,
        isActive: result.data.isActive,
        position: (last?.position ?? -1) + 1,
      },
    })

    return reply.status(201).send({ data: option })
  })

  // ─── PATCH /addons/options/:optionId ─────────────────────────────
  app.patch('/options/:optionId', async (request, reply) => {
    const { optionId } = request.params as { optionId: string }
    const result = optionUpdateSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Validation Error', message: result.error.issues[0]?.message, statusCode: 400 })
    }

    const option = await app.prisma.addonOption.findFirst({
      where: { id: optionId, group: { product: { storeId: request.user.storeId } } },
    })
    if (!option) return reply.status(404).send({ error: 'Not Found', message: 'Opção não encontrada', statusCode: 404 })

    const updated = await app.prisma.addonOption.update({ where: { id: optionId }, data: result.data })
    return { data: updated }
  })

  // ─── DELETE /addons/options/:optionId ────────────────────────────
  app.delete('/options/:optionId', async (request, reply) => {
    const { optionId } = request.params as { optionId: string }
    const option = await app.prisma.addonOption.findFirst({
      where: { id: optionId, group: { product: { storeId: request.user.storeId } } },
    })
    if (!option) return reply.status(404).send({ error: 'Not Found', message: 'Opção não encontrada', statusCode: 404 })

    await app.prisma.addonOption.delete({ where: { id: optionId } })
    return reply.status(204).send()
  })
}

export default addonRoutes
