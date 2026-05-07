'use client'

import { Header } from '@/components/layout/header'
import { CategoryList } from '@/components/cardapio/category-list'

export default function CardapioPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Cardápio" />
      <main className="flex-1 overflow-y-auto p-6">
        <CategoryList />
      </main>
    </div>
  )
}
