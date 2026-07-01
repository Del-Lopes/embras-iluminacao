'use client'

import Link from 'next/link'
import { FileText, Package } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

// Top-of-sidebar toggle between the two isolated admin areas: Blog and
// Produtos. The areas share the same panel chrome but operate on
// independent tables/routes. Active area is derived from the pathname by
// the parent Sidebar and passed in.
type Props = {
  area: 'blog' | 'products'
}

export const AreaSwitcher = ({ area }: Props) => (
  <div className="area-switcher" role="tablist" aria-label="Área do painel">
    <Link
      href="/admin/products"
      role="tab"
      aria-selected={area === 'products'}
      className={cn('area-switcher-btn', area === 'products' && 'area-switcher-btn--active')}
    >
      <Package size={14} strokeWidth={1.5} />
      <span>Produtos</span>
    </Link>
    <Link
      href="/admin/dashboard"
      role="tab"
      aria-selected={area === 'blog'}
      className={cn('area-switcher-btn', area === 'blog' && 'area-switcher-btn--active')}
    >
      <FileText size={14} strokeWidth={1.5} />
      <span>Blog</span>
    </Link>
  </div>
)
