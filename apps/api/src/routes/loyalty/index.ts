import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate.js'

const loyaltyRoutes: FastifyPluginAsync = async (app) => {

  // GET /loyalty/config
  app.get('/config', { preHandler: [authenticate] }, async (request) => {
    const { storeId } = request.user
    let config = await app.prisma.loyaltyConfig.findUnique({ where: { storeId } })
    if (!config) {
      config = await app.prisma.loyaltyConfig.create({ data: { storeId } })
    }
    return { data: config }
  })

  // PATCH /loyalty/config
  app.patch('/config', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const schema = z.object({
      isEnabled: z.boolean().optional(),
      pointsPerReal: z.number().min(0.1).optional(),
      pointsToReal: z.number().min(1).optional(),
      minRedeemPoints: z.number().int().min(1).optional(),
      expirationDays: z.number().int().min(1).optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const config = await app.prisma.loyaltyConfig.upsert({
      where: { storeId },
      create: { storeId, ...body.data },
      update: body.data,
    })
    return { data: config }
  })

  // GET /loyalty/customers — ranking de clientes com pontos
  app.get('/customers', { preHandler: [authenticate] }, async (request) => {
    const { storeId } = request.user
    const { page = '1' } = request.query as { page?: string }
    const take = 30
    const skip = (Number(page) - 1) * take

    const [loyalties, total] = await Promise.all([
      app.prisma.customerLoyalty.findMany({
        where: { storeId },
        orderBy: { points: 'desc' },
        skip, take,
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      app.prisma.customerLoyalty.count({ where: { storeId } }),
    ])

    return { data: loyalties, total, page: Number(page), totalPages: Math.ceil(total / take) }
  })

  // POST /loyalty/add — adicionar pontos manualmente
  app.post('/add', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const schema = z.object({ customerId: z.string().uuid(), points: z.number().int().min(1) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const customer = await app.prisma.customer.findFirst({
      where: { id: body.data.customerId, storeId },
    })
    if (!customer) return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })

    const loyalty = await app.prisma.customerLoyalty.upsert({
      where: { storeId_customerId: { storeId, customerId: body.data.customerId } },
      create: { storeId, customerId: body.data.customerId, points: body.data.points, totalEarned: body.data.points },
      update: {
        points: { increment: body.data.points },
        totalEarned: { increment: body.data.points },
        updatedAt: new Date(),
      },
    })
    return reply.status(201).send({ data: loyalty })
  })

  // POST /loyalty/redeem — resgatar pontos
  app.post('/redeem', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const schema = z.object({ customerId: z.string().uuid(), points: z.number().int().min(1) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const customer = await app.prisma.customer.findFirst({
      where: { id: body.data.customerId, storeId },
    })
    if (!customer) return reply.status(404).send({ error: 'Not Found', message: 'Cliente não encontrado', statusCode: 404 })

    const existing = await app.prisma.customerLoyalty.findUnique({
      where: { storeId_customerId: { storeId, customerId: body.data.customerId } },
    })
    if (!existing || existing.points < body.data.points) {
      return reply.status(422).send({ error: 'Insufficient', message: 'Pontos insuficientes', statusCode: 422 })
    }

    const config = await app.prisma.loyaltyConfig.findUnique({ where: { storeId } })
    if (!config || body.data.points < config.minRedeemPoints) {
      return reply.status(422).send({ error: 'Insufficient', message: `Mínimo de ${config?.minRedeemPoints ?? 100} pontos para resgatar`, statusCode: 422 })
    }

    const loyalty = await app.prisma.customerLoyalty.update({
      where: { storeId_customerId: { storeId, customerId: body.data.customerId } },
      data: { points: { decrement: body.data.points }, totalRedeemed: { increment: body.data.points }, updatedAt: new Date() },
    })

    const discount = (body.data.points / Number(config.pointsToReal))
    return { data: { loyalty, discountValue: discount } }
  })
}

export default loyaltyRoutes
