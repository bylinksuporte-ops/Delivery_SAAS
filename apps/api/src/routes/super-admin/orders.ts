import type { FastifyPluginAsync } from 'fastify'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'

const superAdminOrdersRoutes: FastifyPluginAsync = async (app) => {
  // GET /super-admin/orders
  app.get('/', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { page = '1', storeId, status, from, to } = request.query as {
      page?: string; storeId?: string; status?: string; from?: string; to?: string
    }
    const take = 20
    const skip = (Number(page) - 1) * take

    const where: any = {}
    if (storeId) where.storeId = storeId
    if (status) where.status = status
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = toDate
      }
    }

    const [orders, total] = await Promise.all([
      app.prisma.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          type: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
          store: { select: { id: true, name: true, slug: true } },
          customer: { select: { name: true } },
        },
      }),
      app.prisma.order.count({ where }),
    ])

    return reply.send({
      data: orders,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / take),
    })
  })
}

export default superAdminOrdersRoutes
