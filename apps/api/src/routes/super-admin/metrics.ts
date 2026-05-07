import type { FastifyPluginAsync } from 'fastify'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'

const superAdminMetricsRoutes: FastifyPluginAsync = async (app) => {
  // GET /super-admin/metrics
  app.get('/', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [
      totalStores,
      openStores,
      newStores,
      totalOrders,
      revenueResult,
      ordersPerDay,
      topStores,
    ] = await Promise.all([
      app.prisma.store.count(),
      app.prisma.store.count({ where: { isOpen: true } }),
      app.prisma.store.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      app.prisma.order.count(),
      app.prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
      // Pedidos agrupados por dia (últimos 30 dias)
      app.prisma.$queryRaw<{ day: string; count: bigint }[]>`
        SELECT DATE("createdAt")::text AS day, COUNT(*)::bigint AS count
        FROM "Order"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY day ASC
      `,
      // Top 5 lojas por pedidos
      app.prisma.store.findMany({
        take: 5,
        orderBy: { orders: { _count: 'desc' } },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          _count: { select: { orders: true } },
        },
      }),
    ])

    return reply.send({
      data: {
        totalStores,
        openStores,
        newStores,
        totalOrders,
        revenueTotal: revenueResult._sum.total ?? 0,
        ordersPerDay: ordersPerDay.map((r) => ({ day: r.day, count: Number(r.count) })),
        topStores,
      },
    })
  })
}

export default superAdminMetricsRoutes
