import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'

function getPeriodStart(period: string, from?: string): Date {
  if (period === 'custom' && from) return new Date(from)
  const now = new Date()
  if (period === 'today') {
    const d = new Date(now)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === '7d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === '30d') {
    const d = new Date(now)
    d.setDate(d.getDate() - 29)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // default: hoje
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!
}

const reportRoutes: FastifyPluginAsync = async (app) => {
  // ─── GET /reports/summary ─────────────────────────────────────────
  app.get('/summary', { preHandler: [authenticate] }, async (request) => {
    const { period = 'today', from, to } = request.query as {
      period?: string; from?: string; to?: string
    }
    const startDate = getPeriodStart(period, from)
    const endDate = to ? new Date(to + 'T23:59:59') : new Date()

    const [agg, cancelled, newCustomers, prevAgg] = await Promise.all([
      app.prisma.order.aggregate({
        where: {
          storeId: request.user.storeId,
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
        },
        _count: { id: true },
        _sum: { total: true, deliveryFee: true, discount: true, subtotal: true },
      }),
      app.prisma.order.count({
        where: {
          storeId: request.user.storeId,
          createdAt: { gte: startDate, lte: endDate },
          status: 'CANCELLED',
        },
      }),
      app.prisma.customer.count({
        where: {
          storeId: request.user.storeId,
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      // Período anterior para comparação (mesmo intervalo de dias)
      (() => {
        const diffMs = endDate.getTime() - startDate.getTime()
        const prevEnd = new Date(startDate.getTime() - 1)
        const prevStart = new Date(prevEnd.getTime() - diffMs)
        return app.prisma.order.aggregate({
          where: {
            storeId: request.user.storeId,
            createdAt: { gte: prevStart, lte: prevEnd },
            status: { not: 'CANCELLED' },
          },
          _count: { id: true },
          _sum: { total: true },
        })
      })(),
    ])

    const ordersCount = agg._count.id
    const revenue = Number(agg._sum.total ?? 0)
    const deliveryFees = Number(agg._sum.deliveryFee ?? 0)
    const discounts = Number(agg._sum.discount ?? 0)
    const avgTicket = ordersCount > 0 ? revenue / ordersCount : 0

    const prevRevenue = Number(prevAgg._sum.total ?? 0)
    const revenueGrowth = prevRevenue > 0
      ? ((revenue - prevRevenue) / prevRevenue) * 100
      : null

    return {
      data: {
        ordersCount,
        revenue,
        avgTicket,
        deliveryFees,
        discounts,
        cancelled,
        newCustomers,
        revenueGrowth,
      },
    }
  })

  // ─── GET /reports/sales ───────────────────────────────────────────
  app.get('/sales', { preHandler: [authenticate] }, async (request) => {
    const { period = '7d', from, to } = request.query as {
      period?: string; from?: string; to?: string
    }
    const startDate = getPeriodStart(period, from)
    const endDate = to ? new Date(to + 'T23:59:59') : new Date()

    const orders = await app.prisma.order.findMany({
      where: {
        storeId: request.user.storeId,
        createdAt: { gte: startDate, lte: endDate },
        status: { not: 'CANCELLED' },
      },
      select: { createdAt: true, total: true },
      orderBy: { createdAt: 'asc' },
    })

    // Agrupa por dia
    const byDay = new Map<string, { count: number; revenue: number }>()

    // Preenche todos os dias do intervalo com zero
    const cursor = new Date(startDate)
    while (cursor <= endDate) {
      byDay.set(formatDate(cursor), { count: 0, revenue: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    for (const o of orders) {
      const day = formatDate(o.createdAt)
      const entry = byDay.get(day) ?? { count: 0, revenue: 0 }
      entry.count += 1
      entry.revenue += Number(o.total)
      byDay.set(day, entry)
    }

    const data = Array.from(byDay.entries()).map(([date, v]) => ({
      date,
      count: v.count,
      revenue: v.revenue,
    }))

    return { data }
  })

  // ─── GET /reports/top-products ────────────────────────────────────
  app.get('/top-products', { preHandler: [authenticate] }, async (request) => {
    const { period = '30d', from, to, limit = '10' } = request.query as {
      period?: string; from?: string; to?: string; limit?: string
    }
    const startDate = getPeriodStart(period, from)
    const endDate = to ? new Date(to + 'T23:59:59') : new Date()

    const items = await app.prisma.orderItem.findMany({
      where: {
        order: {
          storeId: request.user.storeId,
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'CANCELLED' },
        },
      },
      select: { productId: true, name: true, quantity: true, price: true },
    })

    // Agrupa por produto
    const byProduct = new Map<string, { name: string; quantity: number; revenue: number }>()
    for (const item of items) {
      const existing = byProduct.get(item.productId) ?? { name: item.name, quantity: 0, revenue: 0 }
      existing.quantity += item.quantity
      existing.revenue += Number(item.price) * item.quantity
      byProduct.set(item.productId, existing)
    }

    const data = Array.from(byProduct.entries())
      .map(([productId, v]) => ({ productId, ...v }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, parseInt(limit))

    return { data }
  })

  // ─── GET /reports/orders (histórico — paginado) ───────────────────
  app.get('/orders', { preHandler: [authenticate] }, async (request) => {
    const { period = '30d', from, to, page = '1', status } = request.query as {
      period?: string; from?: string; to?: string; page?: string; status?: string
    }
    const startDate = getPeriodStart(period, from)
    const endDate = to ? new Date(to + 'T23:59:59') : new Date()
    const skip = (parseInt(page) - 1) * 50

    const [orders, total] = await Promise.all([
      app.prisma.order.findMany({
        where: {
          storeId: request.user.storeId,
          createdAt: { gte: startDate, lte: endDate },
          ...(status ? { status: status as never } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: 50,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          type: true,
          paymentMethod: true,
          subtotal: true,
          deliveryFee: true,
          discount: true,
          total: true,
          createdAt: true,
          customer: { select: { name: true, phone: true } },
        },
      }),
      app.prisma.order.count({
        where: {
          storeId: request.user.storeId,
          createdAt: { gte: startDate, lte: endDate },
          ...(status ? { status: status as never } : {}),
        },
      }),
    ])

    return {
      data: orders.map((o) => ({
        ...o,
        subtotal: Number(o.subtotal),
        deliveryFee: Number(o.deliveryFee),
        discount: Number(o.discount),
        total: Number(o.total),
      })),
      meta: { total, page: parseInt(page), pages: Math.ceil(total / 50) },
    }
  })

  // ─── GET /reports/daily-movements ────────────────────────────────
  app.get('/daily-movements', { preHandler: [authenticate] }, async (request) => {
    const { from, to } = request.query as { from?: string; to?: string }

    const startDate = from
      ? new Date(from + 'T00:00:00')
      : (() => { const d = new Date(); d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d })()
    const endDate = to ? new Date(to + 'T23:59:59') : new Date()

    const [orders, transactions] = await Promise.all([
      app.prisma.order.findMany({
        where: {
          storeId: request.user.storeId,
          status: { not: 'CANCELLED' },
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true, total: true, paymentMethod: true },
      }),
      app.prisma.cashTransaction.findMany({
        where: {
          storeId: request.user.storeId,
          createdAt: { gte: startDate, lte: endDate },
        },
        select: { createdAt: true, type: true, amount: true, description: true },
      }),
    ])

    // Build days map
    const byDay = new Map<string, {
      date: string
      ordersCount: number
      revenue: number
      byPayment: Record<string, number>
      deposits: number
      withdrawals: number
    }>()

    const cursor = new Date(startDate)
    while (cursor <= endDate) {
      const key = cursor.toISOString().split('T')[0]!
      byDay.set(key, { date: key, ordersCount: 0, revenue: 0, byPayment: {}, deposits: 0, withdrawals: 0 })
      cursor.setDate(cursor.getDate() + 1)
    }

    for (const o of orders) {
      const key = o.createdAt.toISOString().split('T')[0]!
      const day = byDay.get(key)
      if (!day) continue
      day.ordersCount += 1
      day.revenue += Number(o.total)
      const pm = o.paymentMethod ?? 'OTHER'
      day.byPayment[pm] = (day.byPayment[pm] ?? 0) + Number(o.total)
    }

    for (const t of transactions) {
      const key = t.createdAt.toISOString().split('T')[0]!
      const day = byDay.get(key)
      if (!day) continue
      if (t.type === 'DEPOSIT') day.deposits += Number(t.amount)
      else day.withdrawals += Number(t.amount)
    }

    const data = Array.from(byDay.values())
      .map(d => ({ ...d, net: d.revenue + d.deposits - d.withdrawals }))
      .reverse()

    return { data }
  })
}

export default reportRoutes
