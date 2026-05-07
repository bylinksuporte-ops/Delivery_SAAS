'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import {
  useAddonGroups,
  useCreateAddonGroup,
  useDeleteAddonGroup,
  useCreateAddonOption,
  useDeleteAddonOption,
  type Product,
  type AddonGroup,
} from '@/hooks/use-cardapio'

interface Props {
  product: Product
  onClose: () => void
}

export function AddonPanel({ product, onClose }: Props) {
  const { data: groups = [], isLoading } = useAddonGroups(product.id)
  const createGroup = useCreateAddonGroup()
  const deleteGroup = useDeleteAddonGroup()
  const createOption = useCreateAddonOption()
  const deleteOption = useDeleteAddonOption()

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupMin, setNewGroupMin] = useState('0')
  const [newGroupMax, setNewGroupMax] = useState('1')
  const [newGroupRequired, setNewGroupRequired] = useState(false)
  const [addingGroup, setAddingGroup] = useState(false)

  // Estado para adicionar opção por grupo
  const [newOptionName, setNewOptionName] = useState<Record<string, string>>({})
  const [newOptionPrice, setNewOptionPrice] = useState<Record<string, string>>({})

  function toggleGroup(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const group = await createGroup.mutateAsync({
      productId: product.id,
      name: newGroupName.trim(),
      min: parseInt(newGroupMin) || 0,
      max: parseInt(newGroupMax) || 1,
      required: newGroupRequired,
    })
    setNewGroupName(''); setNewGroupMin('0'); setNewGroupMax('1'); setNewGroupRequired(false)
    setAddingGroup(false)
    // Expande automaticamente o novo grupo
    setExpanded((prev) => ({ ...prev, [group.id]: true }))
  }

  async function handleCreateOption(group: AddonGroup, e: React.FormEvent) {
    e.preventDefault()
    const name = newOptionName[group.id]?.trim()
    if (!name) return
    const price = parseFloat((newOptionPrice[group.id] ?? '0').replace(',', '.')) || 0
    await createOption.mutateAsync({ groupId: group.id, productId: product.id, name, price })
    setNewOptionName((prev) => ({ ...prev, [group.id]: '' }))
    setNewOptionPrice((prev) => ({ ...prev, [group.id]: '' }))
  }

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={`Complementos — ${product.name}`}
      size="lg"
    >
      <div className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}
          </div>
        ) : (
          <>
            {groups.length === 0 && !addingGroup && (
              <div className="rounded-lg border border-dashed p-8 text-center space-y-2">
                <p className="text-sm text-muted-foreground">Nenhum grupo de complementos ainda.</p>
                <p className="text-xs text-muted-foreground">Ex: Tamanho, Sabores, Adicionais</p>
              </div>
            )}

            {/* Grupos existentes */}
            {groups.map((group) => (
              <div key={group.id} className="rounded-lg border overflow-hidden">
                {/* Header do grupo */}
                <div
                  className="flex items-center gap-3 px-4 py-3 bg-muted/40 cursor-pointer"
                  onClick={() => toggleGroup(group.id)}
                >
                  {expanded[group.id]
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{group.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {group.required ? 'Obrigatório' : 'Opcional'} · mín {group.min} · máx {group.max}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{group.options.length} opções</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteGroup.mutate({ id: group.id, productId: product.id }) }}
                    className="ml-2 flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Opções do grupo */}
                {expanded[group.id] && (
                  <div className="p-3 space-y-2">
                    {group.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2">
                        <span className="flex-1 text-sm">{option.name}</span>
                        <span className="text-sm font-medium text-primary">
                          {option.price > 0
                            ? `+${Number(option.price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                            : 'Grátis'}
                        </span>
                        <button
                          onClick={() => deleteOption.mutate({ id: option.id, productId: product.id })}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {/* Adicionar opção */}
                    <form
                      onSubmit={(e) => handleCreateOption(group, e)}
                      className="flex items-end gap-2 pt-1"
                    >
                      <div className="flex-1">
                        <Input
                          placeholder="Nome da opção (Ex: Médio)"
                          value={newOptionName[group.id] ?? ''}
                          onChange={(e) => setNewOptionName((p) => ({ ...p, [group.id]: e.target.value }))}
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          placeholder="Preço (+R$)"
                          value={newOptionPrice[group.id] ?? ''}
                          onChange={(e) => setNewOptionPrice((p) => ({ ...p, [group.id]: e.target.value }))}
                        />
                      </div>
                      <Button type="submit" size="sm" variant="secondary" loading={createOption.isPending}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            ))}

            {/* Formulário novo grupo */}
            {addingGroup ? (
              <form onSubmit={handleCreateGroup} className="rounded-lg border p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">Novo grupo de complementos</p>
                <Input
                  label="Nome do grupo"
                  placeholder="Ex: Tamanho, Sabores, Adicionais"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  autoFocus
                  required
                />
                <div className="grid grid-cols-3 gap-3">
                  <Input label="Mínimo" type="number" min="0" value={newGroupMin} onChange={(e) => setNewGroupMin(e.target.value)} />
                  <Input label="Máximo" type="number" min="1" value={newGroupMax} onChange={(e) => setNewGroupMax(e.target.value)} />
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-foreground">Obrigatório?</span>
                    <div className="flex items-center h-10 gap-2">
                      <input
                        type="checkbox"
                        checked={newGroupRequired}
                        onChange={(e) => setNewGroupRequired(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-muted-foreground">{newGroupRequired ? 'Sim' : 'Não'}</span>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setAddingGroup(false)}>Cancelar</Button>
                  <Button type="submit" size="sm" loading={createGroup.isPending}>Criar grupo</Button>
                </div>
              </form>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setAddingGroup(true)} className="w-full">
                <Plus className="mr-1.5 h-4 w-4" /> Adicionar grupo de complementos
              </Button>
            )}
          </>
        )}

        <div className="flex justify-end pt-2 border-t">
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </Modal>
  )
}
