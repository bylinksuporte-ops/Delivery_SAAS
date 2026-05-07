import type { FastifyRequest, FastifyReply } from 'fastify'
import type { JwtPayload } from '@delivery/types'

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Unauthorized', message: 'Token inválido ou expirado', statusCode: 401 })
  }
}

// Tipar o user decodificado como JwtPayload no request
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtPayload
  }
}
