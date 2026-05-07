import { io, type Socket } from 'socket.io-client'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export function createSocket(token: string): Socket {
  return io(API_URL, {
    auth: { token },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  })
}

// Toca um bip-bip usando Web Audio API (sem arquivo externo)
export function playNewOrderSound() {
  try {
    const ctx = new AudioContext()

    function beep(startTime: number, freq: number, dur: number) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.35, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur)
      osc.start(startTime)
      osc.stop(startTime + dur)
    }

    beep(ctx.currentTime, 880, 0.15)
    beep(ctx.currentTime + 0.2, 1100, 0.15)
    beep(ctx.currentTime + 0.4, 1320, 0.2)
  } catch {
    // AudioContext bloqueado pelo browser sem interação do usuário
  }
}
