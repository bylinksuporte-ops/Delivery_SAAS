import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { authenticate } from '../../middlewares/authenticate.js'

const raffleRoutes: FastifyPluginAsync = async (app) => {

  // GET /raffles — listar sorteios da loja (autenticado)
  app.get('/', { preHandler: [authenticate] }, async (request) => {
    const raffles = await app.prisma.raffle.findMany({
      where: { storeId: request.user.storeId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { entries: true } } },
    })
    return { data: raffles }
  })

  // POST /raffles — criar sorteio
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      title: z.string().min(2),
      description: z.string().optional(),
      prize: z.string().min(2),
      imageUrl: z.string().url().optional(),
      drawAt: z.string().datetime().optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: body.error.issues[0]?.message ?? 'Dados inválidos', statusCode: 400 })

    const raffle = await app.prisma.raffle.create({
      data: { storeId: request.user.storeId, ...body.data, drawAt: body.data.drawAt ? new Date(body.data.drawAt) : null },
    })
    return reply.status(201).send({ data: raffle })
  })

  // PATCH /raffles/:id — editar sorteio
  app.patch('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      prize: z.string().optional(),
      imageUrl: z.string().url().optional().or(z.literal('')),
      status: z.enum(['OPEN', 'CLOSED']).optional(),
      drawAt: z.string().datetime().optional(),
    })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const raffle = await app.prisma.raffle.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!raffle) return reply.status(404).send({ error: 'Not Found', message: 'Sorteio não encontrado', statusCode: 404 })

    const updated = await app.prisma.raffle.update({ where: { id }, data: { ...body.data, drawAt: body.data.drawAt ? new Date(body.data.drawAt) : undefined } })
    return { data: updated }
  })

  // DELETE /raffles/:id
  app.delete('/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const raffle = await app.prisma.raffle.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!raffle) return reply.status(404).send({ error: 'Not Found', message: 'Sorteio não encontrado', statusCode: 404 })
    await app.prisma.raffle.delete({ where: { id } })
    return reply.status(204).send()
  })

  // POST /raffles/:id/draw — sortear vencedor
  app.post('/:id/draw', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const raffle = await app.prisma.raffle.findFirst({
      where: { id, storeId: request.user.storeId },
      include: { entries: true },
    })
    if (!raffle) return reply.status(404).send({ error: 'Not Found', message: 'Sorteio não encontrado', statusCode: 404 })
    if (raffle.status !== 'OPEN') return reply.status(422).send({ error: 'Unavailable', message: 'Apenas sorteios abertos podem ser sorteados', statusCode: 422 })
    if (raffle.entries.length === 0) return reply.status(422).send({ error: 'Empty', message: 'Nenhum participante inscrito', statusCode: 422 })

    const winner = raffle.entries[Math.floor(Math.random() * raffle.entries.length)]!
    const updated = await app.prisma.raffle.update({
      where: { id },
      data: { status: 'DRAWN', winnerId: winner.id, drawAt: new Date() },
    })
    return { data: { raffle: updated, winner } }
  })

  // GET /raffles/:id/entries — participantes
  app.get('/:id/entries', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const raffle = await app.prisma.raffle.findFirst({ where: { id, storeId: request.user.storeId } })
    if (!raffle) return reply.status(404).send({ error: 'Not Found', message: 'Sorteio não encontrado', statusCode: 404 })
    const entries = await app.prisma.raffleEntry.findMany({ where: { raffleId: id }, orderBy: { createdAt: 'desc' } })
    return { data: entries }
  })

  // POST /raffles/:id/enter — participar (público)
  app.post('/:id/enter', async (request, reply) => {
    const { id } = request.params as { id: string }
    const schema = z.object({ name: z.string().min(2), phone: z.string().min(8) })
    const body = schema.safeParse(request.body)
    if (!body.success) return reply.status(400).send({ error: 'Bad Request', message: 'Dados inválidos', statusCode: 400 })

    const raffle = await app.prisma.raffle.findUnique({ where: { id }, select: { id: true, storeId: true, status: true } })
    if (!raffle || raffle.status !== 'OPEN') return reply.status(422).send({ error: 'Unavailable', message: 'Sorteio não está aberto', statusCode: 422 })

    // Impede participação duplicada do mesmo telefone
    const alreadyEntered = await app.prisma.raffleEntry.findFirst({
      where: { raffleId: id, phone: body.data.phone },
    })
    if (alreadyEntered) {
      return reply.status(409).send({ error: 'Conflict', message: 'Este telefone já está participando deste sorteio', statusCode: 409 })
    }

    // Busca ou cria cliente
    let customer = await app.prisma.customer.findUnique({
      where: { storeId_phone: { storeId: raffle.storeId, phone: body.data.phone } },
    })
    if (!customer) {
      customer = await app.prisma.customer.create({
        data: { storeId: raffle.storeId, name: body.data.name, phone: body.data.phone },
      })
    }

    const entry = await app.prisma.raffleEntry.create({
      data: { raffleId: id, name: body.data.name, phone: body.data.phone, customerId: customer.id },
    })
    return reply.status(201).send({ data: entry })
  })
}

export default raffleRoutes
