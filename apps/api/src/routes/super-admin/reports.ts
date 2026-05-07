import type { FastifyPluginAsync } from 'fastify'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'

const superAdminReportsRoutes: FastifyPluginAsync = async (app) => {

  // GET /super-admin/reports — relatórios financeiros por loja
  app.get('/', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const { period = '30d' } = request.query as { period?: string }

    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Receita por loja no período
    const revenueByStore = await app.prisma.order.groupBy({
      by: ['storeId'],
      where: { status: { not: 'CANCELLED' }, createdAt: { gte: since } },
      _sum: { total: true },
      _count: true,
      orderBy: { _sum: { total: 'desc' } },
    })

    // Enriquecer com nome/slug
    const storeIds = revenueByStore.map(r => r.storeId)
    const stores = await app.prisma.store.findMany({
      where: { id: { in: storeIds } },
      select: { id: true, name: true, slug: true, logoUrl: true, status: true, createdAt: true },
    })
    const storeMap = Object.fromEntries(stores.map(s => [s.id, s]))

    const storeRevenue = revenueByStore.map(r => ({
      storeId: r.storeId,
      store: storeMap[r.storeId],
      revenue: Number(r._sum.total ?? 0),
      orders: r._count,
    }))

    // Lojas sem pedidos no período (inativas)
    const allStores = await app.prisma.store.findMany({
      where: { id: { notIn: storeIds }, status: 'ACTIVE' },
      select: { id: true, name: true, slug: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    // Receita total no período vs período anterior
    const prevSince = new Date(since)
    prevSince.setDate(prevSince.getDate() - days)
    const [currentRevenue, prevRevenue] = await Promise.all([
      app.prisma.order.aggregate({ where: { status: { not: 'CANCELLED' }, createdAt: { gte: since } }, _sum: { total: true }, _count: true }),
      app.prisma.order.aggregate({ where: { status: { not: 'CANCELLED' }, createdAt: { gte: prevSince, lt: since } }, _sum: { total: true }, _count: true }),
    ])

    // Novas lojas no período
    const newStores = await app.prisma.store.count({ where: { createdAt: { gte: since } } })
    const totalStores = await app.prisma.store.count()
    const suspendedStores = await app.prisma.store.count({ where: { status: 'SUSPENDED' } })

    // Receita por dia (últimos N dias)
    const revenueByDay = await app.prisma.$queryRaw<{ day: string; revenue: number; orders: bigint }[]>`
      SELECT DATE("createdAt")::text AS day,
             SUM(total)::float AS revenue,
             COUNT(*)::bigint AS orders
      FROM "Order"
      WHERE status != 'CANCELLED'
        AND "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `

    const currentRev = Number(currentRevenue._sum.total ?? 0)
    const prevRev = Number(prevRevenue._sum.total ?? 0)
    const growth = prevRev > 0 ? ((currentRev - prevRev) / prevRev) * 100 : null

    return reply.send({
      data: {
        period,
        summary: {
          totalRevenue: currentRev,
          totalOrders: currentRevenue._count,
          revenueGrowth: growth,
          newStores,
          totalStores,
          suspendedStores,
          activeStores: totalStores - suspendedStores,
        },
        storeRevenue,
        inactiveStores: allStores,
        revenueByDay: revenueByDay.map(r => ({ day: r.day, revenue: r.revenue, orders: Number(r.orders) })),
      },
    })
  })
}

export default superAdminReportsRoutes
