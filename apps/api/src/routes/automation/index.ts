import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate.js'
import { callAI, buildSystemPrompt } from '../../lib/ai-attendant.js'
import { evolutionSendText } from '../../lib/evolution.js'

const automationRoutes: FastifyPluginAsync = async (app) => {

  // ─── GET /automation/config ───────────────────────────────────────
  app.get('/config', { preHandler: [authenticate] }, async (request) => {
    const { storeId } = request.user

    let config = await app.prisma.automationConfig.findUnique({ where: { storeId } })
    if (!config) {
      config = await app.prisma.automationConfig.create({
        data: { storeId },
      })
    }

    return {
      data: {
        ...config,
        aiApiKey: config.aiApiKey ? '••••••••' : null,
      },
    }
  })

  // ─── PATCH /automation/config ─────────────────────────────────────
  app.patch('/config', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const schema = z.object({
      isEnabled: z.boolean().optional(),
      aiProvider: z.enum(['claude']).optional(),
      aiApiKey: z.string().optional(),
      aiModel: z.string().optional(),
      systemPrompt: z.string().optional(),
    })

    const body = schema.safeParse(request.body)
    if (!body.success) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })
    }

    const data: any = {}
    if (body.data.isEnabled !== undefined) data.isEnabled = body.data.isEnabled
    if (body.data.aiProvider) data.aiProvider = body.data.aiProvider
    if (body.data.aiModel) data.aiModel = body.data.aiModel
    if (body.data.systemPrompt !== undefined) data.systemPrompt = body.data.systemPrompt
    // Só atualiza a chave se não for a máscara
    if (body.data.aiApiKey && body.data.aiApiKey !== '••••••••') {
      data.aiApiKey = body.data.aiApiKey
    }

    const config = await app.prisma.automationConfig.upsert({
      where: { storeId },
      create: { storeId, ...data },
      update: data,
    })

    return { data: { ...config, aiApiKey: config.aiApiKey ? '••••••••' : null } }
  })

  // ─── GET /automation/conversations ────────────────────────────────
  app.get('/conversations', { preHandler: [authenticate] }, async (request) => {
    const { storeId } = request.user
    const { page = '1', search = '' } = request.query as { page?: string; search?: string }
    const take = 20
    const skip = (Number(page) - 1) * take

    const where: any = { storeId }
    if (search) {
      where.OR = [
        { customerPhone: { contains: search } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [conversations, total] = await Promise.all([
      app.prisma.conversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          _count: { select: { messages: true } },
        },
      }),
      app.prisma.conversation.count({ where }),
    ])

    return { data: conversations, total, page: Number(page), totalPages: Math.ceil(total / take) }
  })

  // ─── GET /automation/conversations/:id ────────────────────────────
  app.get('/conversations/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { id } = request.params as { id: string }

    const conversation = await app.prisma.conversation.findFirst({
      where: { id, storeId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!conversation) {
      return reply.status(404).send({ error: 'Not Found', message: 'Conversa não encontrada', statusCode: 404 })
    }

    return { data: conversation }
  })

  // ─── DELETE /automation/conversations/:id ─────────────────────────
  app.delete('/conversations/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { id } = request.params as { id: string }

    const conv = await app.prisma.conversation.findFirst({ where: { id, storeId } })
    if (!conv) {
      return reply.status(404).send({ error: 'Not Found', message: 'Conversa não encontrada', statusCode: 404 })
    }

    await app.prisma.conversation.update({ where: { id }, data: { status: 'CLOSED' } })
    return reply.status(204).send()
  })

  // ─── POST /automation/test ─────────────────────────────────────────
  app.post('/test', { preHandler: [authenticate] }, async (request, reply) => {
    const { storeId } = request.user
    const { message } = request.body as { message: string }

    if (!message?.trim()) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Mensagem obrigatória', statusCode: 400 })
    }

    const [config, store, storeData] = await Promise.all([
      app.prisma.automationConfig.findUnique({ where: { storeId } }),
      app.prisma.store.findUnique({ where: { id: storeId }, select: { slug: true, name: true, description: true, estimatedTime: true, minOrderValue: true } }),
      app.prisma.store.findUnique({
        where: { id: storeId },
        select: {
          schedules: { where: { isActive: true }, select: { dayOfWeek: true, openTime: true, closeTime: true } },
          paymentMethods: { where: { isActive: true }, select: { type: true, label: true } },
          deliveryAreas: { where: { isActive: true }, select: { name: true, type: true, fee: true, district: true, freeFrom: true } },
        },
      }),
    ])

    if (!config?.aiApiKey) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Configure a chave da IA antes de testar', statusCode: 400 })
    }

    const menu = await app.prisma.category.findMany({
      where: { storeId, isActive: true },
      orderBy: { position: 'asc' },
      include: {
        products: {
          where: { isActive: true },
          select: {
            name: true, description: true, price: true, tags: true,
            addonGroups: { include: { options: { where: { isActive: true } } } },
          },
        },
      },
    })

    const systemPrompt = buildSystemPrompt({
      storeName: store!.name,
      storeDescription: store!.description,
      estimatedTime: store!.estimatedTime,
      minOrderValue: Number(store!.minOrderValue),
      schedules: storeData!.schedules,
      paymentMethods: storeData!.paymentMethods,
      deliveryAreas: storeData!.deliveryAreas,
      menu,
      customPrompt: config.systemPrompt,
      storeSlug: store!.slug,
    })

    try {
      const response = await callAI(
        { aiProvider: config.aiProvider, aiApiKey: config.aiApiKey, aiModel: config.aiModel },
        systemPrompt,
        [{ role: 'user', content: message }],
      )
      return { data: { response } }
    } catch (err: any) {
      return reply.status(500).send({ error: 'AI Error', message: err.message ?? 'Erro na IA', statusCode: 500 })
    }
  })

  // ─── POST /automation/webhook/:storeSlug ──────────────────────────
  // Recebe mensagens da Evolution API
  app.post('/webhook/:storeSlug', async (request, reply) => {
    const { storeSlug } = request.params as { storeSlug: string }

    // Responde imediatamente para não dar timeout na Evolution API
    reply.status(200).send({ received: true })

    try {
      const payload = request.body as any

      // Extrair texto da mensagem (Evolution API v2)
      const messageText =
        payload?.data?.message?.conversation ||
        payload?.data?.message?.extendedTextMessage?.text ||
        payload?.message?.conversation ||
        payload?.message?.extendedTextMessage?.text

      if (!messageText) return

      // Extrair número do remetente
      const remoteJid: string =
        payload?.data?.key?.remoteJid ||
        payload?.key?.remoteJid ||
        ''

      // Ignorar mensagens de grupos
      if (remoteJid.includes('@g.us')) return

      const phone = remoteJid.replace('@s.whatsapp.net', '').replace(/\D/g, '')
      if (!phone) return

      // Buscar loja
      const store = await app.prisma.store.findUnique({
        where: { slug: storeSlug },
        select: {
          id: true, slug: true, name: true, description: true,
          estimatedTime: true, minOrderValue: true,
          evolutionApiUrl: true, evolutionApiKey: true, evolutionInstance: true,
          schedules: { where: { isActive: true }, select: { dayOfWeek: true, openTime: true, closeTime: true } },
          paymentMethods: { where: { isActive: true }, select: { type: true, label: true } },
          deliveryAreas: { where: { isActive: true }, select: { name: true, type: true, fee: true, district: true, freeFrom: true } },
          automationConfig: true,
        },
      })

      if (!store || !store.automationConfig?.isEnabled || !store.automationConfig?.aiApiKey) return

      // Ignorar mensagens do próprio bot
      if (remoteJid === store.evolutionInstance) return

      // Buscar ou criar conversa
      let conversation = await app.prisma.conversation.findUnique({
        where: { storeId_customerPhone: { storeId: store.id, customerPhone: phone } },
      })

      if (!conversation) {
        conversation = await app.prisma.conversation.create({
          data: { storeId: store.id, customerPhone: phone, status: 'ACTIVE' },
        })
      } else if (conversation.status === 'CLOSED') {
        await app.prisma.conversation.update({
          where: { id: conversation.id },
          data: { status: 'ACTIVE', updatedAt: new Date() },
        })
      }

      // Salvar mensagem do usuário
      await app.prisma.conversationMessage.create({
        data: { conversationId: conversation.id, role: 'user', content: messageText },
      })

      // Buscar histórico (últimas 20 mensagens)
      const history = await app.prisma.conversationMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: 'asc' },
        take: 20,
      })

      // Buscar cardápio
      const menu = await app.prisma.category.findMany({
        where: { storeId: store.id, isActive: true },
        orderBy: { position: 'asc' },
        include: {
          products: {
            where: { isActive: true },
            select: {
              id: true, name: true, description: true, price: true, tags: true,
              addonGroups: { include: { options: { where: { isActive: true } } } },
            },
          },
        },
      })

      // Montar system prompt
      const systemPrompt = buildSystemPrompt({
        storeName: store.name,
        storeDescription: store.description,
        estimatedTime: store.estimatedTime,
        minOrderValue: Number(store.minOrderValue),
        schedules: store.schedules,
        paymentMethods: store.paymentMethods,
        deliveryAreas: store.deliveryAreas,
        menu,
        customPrompt: store.automationConfig.systemPrompt,
        storeSlug: store.slug,
      })

      // Chamar IA
      const aiResponse = await callAI(
        {
          aiProvider: store.automationConfig.aiProvider,
          aiApiKey: store.automationConfig.aiApiKey,
          aiModel: store.automationConfig.aiModel,
        },
        systemPrompt,
        history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      )

      // Processar ação de pedido
      let responseText = aiResponse
      if (aiResponse.includes('ACTION:CREATE_ORDER:')) {
        try {
          const jsonStr = aiResponse.split('ACTION:CREATE_ORDER:')[1]?.trim()
          if (jsonStr) {
            const orderData = JSON.parse(jsonStr)
            const res = await fetch(`http://localhost:${process.env.PORT ?? 3333}/orders`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(orderData),
            })
            const orderResult = await res.json()

            if (res.ok && orderResult.data?.orderNumber) {
              const num = orderResult.data.orderNumber
              responseText = `✅ *Pedido #${num} criado com sucesso!*\n\nSeu pedido está sendo processado. Tempo estimado: *${store.estimatedTime} min*.\n\nObrigado por pedir na *${store.name}*! 🎉`

              // Atualizar nome do cliente na conversa se disponível
              if (orderData.customerName) {
                await app.prisma.conversation.update({
                  where: { id: conversation.id },
                  data: { customerName: orderData.customerName },
                })
              }
            } else {
              responseText = `Desculpe, houve um problema ao registrar seu pedido. Por favor, tente novamente ou entre em contato diretamente.`
            }
          }
        } catch {
          responseText = `Desculpe, houve um problema ao registrar seu pedido. Por favor, tente novamente.`
        }
      }

      // Salvar resposta da IA
      await app.prisma.conversationMessage.create({
        data: { conversationId: conversation.id, role: 'assistant', content: responseText },
      })

      // Atualizar timestamp da conversa
      await app.prisma.conversation.update({
        where: { id: conversation.id },
        data: { updatedAt: new Date() },
      })

      // Enviar resposta via Evolution API
      if (store.evolutionApiUrl && store.evolutionApiKey && store.evolutionInstance) {
        await evolutionSendText(
          { url: store.evolutionApiUrl, apiKey: store.evolutionApiKey, instance: store.evolutionInstance },
          phone,
          responseText,
        )
      }
    } catch (err) {
      app.log.error({ err }, 'Automation webhook error')
    }
  })
}

export default automationRoutes
