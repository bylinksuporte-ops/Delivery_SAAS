import Anthropic from '@anthropic-ai/sdk'

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AIConfig {
  aiProvider: string
  aiApiKey: string
  aiModel: string
}

/**
 * Chama a IA com o histórico de conversa e retorna a resposta.
 * Usa prompt caching no system prompt para reduzir custo.
 */
export async function callAI(
  config: AIConfig,
  systemPrompt: string,
  messages: AIMessage[],
): Promise<string> {
  if (config.aiProvider === 'claude') {
    const client = new Anthropic({ apiKey: config.aiApiKey })

    const response = await client.messages.create({
      model: config.aiModel,
      max_tokens: 1024,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          // @ts-ignore — cache_control é suportado mas não tipado em todas as versões
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    })

    const block = response.content[0]
    if (block?.type === 'text') return block.text
    return 'Desculpe, não consegui processar sua mensagem.'
  }

  throw new Error(`Provedor de IA não suportado: ${config.aiProvider}`)
}

/**
 * Monta o system prompt com o contexto completo da loja.
 */
export function buildSystemPrompt(params: {
  storeName: string
  storeDescription: string | null
  estimatedTime: number
  minOrderValue: number
  schedules: { dayOfWeek: number; openTime: string; closeTime: string }[]
  paymentMethods: { type: string; label: string }[]
  deliveryAreas: { name?: string | null; type: string; fee: number; district?: string | null; freeFrom?: number | null }[]
  menu: { name: string; products: { name: string; description: string | null; price: number; tags: string[]; addonGroups: { name: string; required: boolean; options: { name: string; price: number }[] }[] }[] }[]
  customPrompt: string | null
  storeSlug: string
}): string {
  const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

  const scheduleText = params.schedules.length > 0
    ? params.schedules.map((s) => `${DAY_NAMES[s.dayOfWeek]}: ${s.openTime}–${s.closeTime}`).join(', ')
    : 'Horários não cadastrados'

  const paymentText = params.paymentMethods.map((p) => p.label).join(', ') || 'Consultar'

  const areasText = params.deliveryAreas.length > 0
    ? params.deliveryAreas.map((a) => {
        const free = a.freeFrom ? ` (grátis acima de R$ ${Number(a.freeFrom).toFixed(2)})` : ''
        const name = a.district ?? a.name ?? a.type
        return `${name}: R$ ${Number(a.fee).toFixed(2)}${free}`
      }).join('\n')
    : 'Consultar'

  const menuText = params.menu.map((cat) => {
    const products = cat.products.map((p) => {
      let text = `  - ${p.name}: R$ ${Number(p.price).toFixed(2)}`
      if (p.description) text += ` (${p.description})`
      if (p.addonGroups.length > 0) {
        for (const g of p.addonGroups) {
          text += `\n    ${g.required ? '[Obrigatório]' : '[Opcional]'} ${g.name}: ${g.options.map((o) => `${o.name}${Number(o.price) > 0 ? ` +R$${Number(o.price).toFixed(2)}` : ''}`).join(', ')}`
        }
      }
      return text
    }).join('\n')
    return `**${cat.name}**\n${products}`
  }).join('\n\n')

  return `Você é um atendente virtual da loja "${params.storeName}". Seu papel é atender clientes via WhatsApp, tirar pedidos e ser simpático.

## INFORMAÇÕES DA LOJA
- Nome: ${params.storeName}
${params.storeDescription ? `- Descrição: ${params.storeDescription}` : ''}
- Tempo estimado de entrega: ${params.estimatedTime} minutos
- Pedido mínimo: R$ ${Number(params.minOrderValue).toFixed(2)}
- Horários: ${scheduleText}
- Formas de pagamento: ${paymentText}

## TAXAS DE ENTREGA
${areasText}

## CARDÁPIO COMPLETO
${menuText}

## COMO FUNCIONA O ATENDIMENTO
1. Cumprimente o cliente pelo nome se souber
2. Apresente as opções do cardápio quando solicitado
3. Colete os itens desejados com quantidade e complementos
4. Colete o nome e telefone se não tiver
5. Para DELIVERY: colete o endereço completo (rua, número, bairro, cidade)
6. Confirme o pedido com resumo e total
7. Quando o cliente confirmar o pedido, responda EXATAMENTE assim:

ACTION:CREATE_ORDER:{"storeSlug":"${params.storeSlug}","type":"DELIVERY","customerName":"NOME","customerPhone":"TELEFONE","paymentMethod":"TIPO_PAGAMENTO","items":[{"productId":"ID","name":"NOME","price":0.00,"quantity":1,"addons":[]}],"address":{"street":"RUA","number":"NUM","district":"BAIRRO","city":"CIDADE","state":"UF"}}

Para pedido de RETIRADA use "type":"PICKUP" e não inclua address.

## REGRAS IMPORTANTES
- Sempre responda em português brasileiro
- Seja simpático, use emojis com moderação
- Se o cliente perguntar algo que não está no cardápio, diga que não temos
- Nunca invente produtos ou preços
- Se não entender a mensagem, peça para repetir
- Para consultar status de pedido já feito, diga que pode acompanhar pelo link enviado
${params.customPrompt ? `\n## INSTRUÇÕES ESPECIAIS DO DONO DA LOJA\n${params.customPrompt}` : ''}`
}
