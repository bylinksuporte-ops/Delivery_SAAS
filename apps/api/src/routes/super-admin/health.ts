import type { FastifyPluginAsync } from 'fastify'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'

const superAdminHealthRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [authenticateSuperAdmin] }, async (_request, reply) => {
    const checks = await Promise.allSettled([
      // Banco de dados
      app.prisma.$queryRaw`SELECT 1`.then(() => ({ name: 'PostgreSQL', status: 'ok', latency: 0 })),

      // Redis
      (async () => {
        const start = Date.now()
        try {
          const { getCache } = await import('../../lib/cache.js')
          const cache = getCache()
          if (!cache) return { name: 'Redis', status: 'not_configured', latency: null }
          await cache.ping()
          return { name: 'Redis', status: 'ok', latency: Date.now() - start }
        } catch {
          return { name: 'Redis', status: 'error', latency: null }
        }
      })(),

      // API própria (health interno)
      (async () => {
        return { name: 'API', status: 'ok', latency: 0 }
      })(),

      // Asaas (verifica se há lojas configuradas)
      (async () => {
        const count = await app.prisma.store.count({ where: { asaasApiKey: { not: null } } })
        return { name: 'Asaas (PIX)', status: 'configured', details: `${count} loja(s) configurada(s)` }
      })(),

      // Evolution API
      (async () => {
        const count = await app.prisma.store.count({ where: { evolutionApiUrl: { not: null } } })
        return { name: 'Evolution API (WhatsApp)', status: 'configured', details: `${count} loja(s) configurada(s)` }
      })(),

      // Automação IA
      (async () => {
        const count = await app.prisma.automationConfig.count({ where: { isEnabled: true, aiApiKey: { not: null } } })
        return { name: 'Atendente IA', status: 'configured', details: `${count} loja(s) com IA ativa` }
      })(),
    ])

    const services = checks.map((result, i) => {
      if (result.status === 'fulfilled') return result.value
      return { name: ['PostgreSQL', 'Redis', 'API', 'Asaas', 'Evolution API', 'Atendente IA'][i], status: 'error', error: String(result.reason) }
    })

    // Estatísticas gerais
    const [totalStores, activeStores, totalOrders, totalUsers] = await Promise.all([
      app.prisma.store.count(),
      app.prisma.store.count({ where: { status: 'ACTIVE' } }),
      app.prisma.order.count(),
      app.prisma.user.count(),
    ])

    const overall = services.every(s => s.status !== 'error') ? 'healthy' : 'degraded'

    return reply.send({
      data: {
        overall,
        checkedAt: new Date().toISOString(),
        services,
        stats: { totalStores, activeStores, totalOrders, totalUsers },
      },
    })
  })
}

export default superAdminHealthRoutes
