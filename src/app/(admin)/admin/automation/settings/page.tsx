import { requireAdmin } from '@/lib/auth/guards'
import { getAutomationSettings } from '@/server/automation.actions'
import { AutomationSettingsForm } from '@/components/admin/automation-settings-form'

export const metadata = { title: 'Automação — Configurações | Embras Admin' }

export default async function AutomationSettingsPage() {
  await requireAdmin()

  const settings = await getAutomationSettings()

  if (!settings) {
    return (
      <div className="dashboard-page">
        <header className="dashboard-header">
          <h1 className="dashboard-title">Configurações de Automação</h1>
        </header>
        <p className="text-sm text-red-500">
          Tabela <code>automation_settings</code> não encontrada.
          Execute a migration <code>002_automation_settings.sql</code> no Supabase SQL Editor.
        </p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Configurações de Automação</h1>
          <p className="dashboard-subtitle">
            Controle o agendamento e volume do sistema de postagem não assistida.
          </p>
        </div>
      </header>

      <div className="editor-section max-w-2xl">
        <AutomationSettingsForm settings={settings} />
      </div>
    </div>
  )
}
