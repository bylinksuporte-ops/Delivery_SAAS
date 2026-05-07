import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticateSuperAdmin } from '../../middlewares/authenticate-super-admin.js'

// Config global armazenada em memória (pode ser migrada para banco futuramente)
let globalConfig = {
  defaultAiModel: 'claude-haiku-4-5-20251001',
  maintenanceMode: false,
  maintenanceMessage: 'Sistema em manutenção. Voltamos em breve!',
  allowNewRegistrations: true,
  maxStoresPerPlan: { basic: 1, pro: 3, enterprise: -1 },
  platformName: 'Delivery SaaS',
  supportEmail: '',
  supportWhatsapp: '',
}

const superAdminConfigRoutes: FastifyPluginAsync = async (app) => {

  app.get('/', { preHandler: [authenticateSuperAdmin] }, async (_request, reply) => {
    return reply.send({ data: globalConfig })
  })

  app.patch('/', { preHandler: [authenticateSuperAdmin] }, async (request, reply) => {
    const schema = z.object({
      defaultAiModel: z.string().optional(),
      maintenanceMode: z.boolean().optional(),
      maintenanceMessage: z.string().optional(),
      allowNewRegistrations: z.boolean().optional(),
      platformName: z.string().optional(),
      supportEmail: z.string().email().optional().or(z.literal('')),
      supportWhatsapp: z.string().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: body.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })
    }

    globalConfig = { ...globalConfig, ...body.data }
    return reply.send({ data: globalConfig })
  })
}

export default superAdminConfigRoutes
