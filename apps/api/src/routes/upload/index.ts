import type { FastifyPluginAsync } from 'fastify'
import { authenticate } from '../../middlewares/authenticate.js'
import { uploadImage } from '../../lib/storage.js'

const uploadRoutes: FastifyPluginAsync = async (app) => {
  // POST /upload/image — faz upload de imagem e retorna a URL pública
  app.post('/image', { preHandler: [authenticate] }, async (request, reply) => {
    try {
      const data = await request.file()
      if (!data) {
        return reply.status(400).send({ error: 'Bad Request', message: 'Nenhum arquivo enviado.', statusCode: 400 })
      }

      const url = await uploadImage(data, 'products')
      return reply.status(201).send({ data: { url } })
    } catch (err: any) {
      return reply.status(400).send({ error: 'Upload Error', message: err.message ?? 'Erro no upload.', statusCode: 400 })
    }
  })
}

export default uploadRoutes
