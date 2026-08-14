import type { LeadFileType } from '@/lib/db/schema'

// Rótulos legíveis dos tipos de arquivo de download (usados no popup de lead,
// na aba pública e na listagem de leads do admin).
export const LEAD_FILE_LABEL: Record<LeadFileType, string> = {
  datasheet: 'Data Sheet',
  ies: 'IES / 3D',
  certificates: 'Certificados',
}
