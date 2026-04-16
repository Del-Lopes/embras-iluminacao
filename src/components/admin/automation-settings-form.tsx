'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { toast } from 'sonner'
import { saveAutomationSettingsAction, type SaveSettingsResult } from '@/server/automation.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AutomationSettings } from '@/lib/db/schema'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const initialState: SaveSettingsResult | null = null

export function AutomationSettingsForm({ settings }: { settings: AutomationSettings }) {
  const [state, formAction, isPending] = useActionState(
    saveAutomationSettingsAction,
    initialState,
  )

  // Controlled state for live slot-time preview
  const [startHour,     setStartHour]     = useState(settings.cron_start_hour)
  const [startMinute,   setStartMinute]   = useState(settings.cron_start_minute ?? 0)
  const [intervalHours, setIntervalHours] = useState(settings.post_interval_hours ?? 4)
  const [newsPerDay,    setNewsPerDay]     = useState(settings.news_posts_per_day)
  const [salesPerDay,   setSalesPerDay]   = useState(settings.sales_posts_per_day)

  // Slot preview
  const numSlots   = Math.max(newsPerDay, salesPerDay)
  const scheduleInvalid = numSlots > 1 && (startHour + (numSlots - 1) * intervalHours) >= 24
  const slotTimes  = Array.from({ length: numSlots }, (_, i) => {
    const h  = startHour + i * intervalHours
    const hh = String(h).padStart(2, '0')
    const mm = String(startMinute).padStart(2, '0')
    return { time: `${hh}:${mm}`, published: i === 0 }
  })

  const success = state && 'success' in state
  const error   = state && 'error' in state ? state.error : null

  useEffect(() => {
    if (success) toast.success('Configurações salvas com sucesso.')
    else if (error) toast.error(error)
  }, [state])

  return (
    <form action={formAction} className="space-y-8">

      {/* ── Feedback ──────────────────────────────────────── */}
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-600 dark:text-green-400">
          Configurações salvas com sucesso.
        </p>
      )}

      {/* ── Enable / Disable ──────────────────────────────── */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="is_enabled"
          name="is_enabled"
          defaultChecked={settings.is_enabled}
          className="h-4 w-4 rounded border border-(--color-border) accent-(--color-accent)"
        />
        <Label htmlFor="is_enabled" className="text-sm font-medium cursor-pointer">
          Automação ativa
        </Label>
      </div>

      {/* ── Start time ────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label>Horário de início (Brasília)</Label>
        <div className="flex items-center gap-2">
          <Input
            id="cron_start_hour"
            name="cron_start_hour"
            type="number"
            min={0}
            max={23}
            value={startHour}
            onChange={(e) => setStartHour(Math.min(23, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="w-20 text-center"
            required
          />
          <span className="text-sm text-(--color-muted)">h</span>
          <Input
            id="cron_start_minute"
            name="cron_start_minute"
            type="number"
            min={0}
            max={59}
            value={startMinute}
            onChange={(e) => setStartMinute(Math.min(59, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="w-20 text-center"
            required
          />
          <span className="text-sm text-(--color-muted)">min</span>
        </div>
        <p className="text-xs text-(--color-muted)">
          O primeiro post é publicado neste horário; os demais são agendados com o intervalo abaixo.
        </p>
      </div>

      {/* ── Interval between slots ────────────────────────── */}
      <div className="space-y-1.5">
        <Label htmlFor="post_interval_hours">Intervalo entre posts (horas inteiras)</Label>
        <Input
          id="post_interval_hours"
          name="post_interval_hours"
          type="number"
          min={1}
          max={23}
          value={intervalHours}
          onChange={(e) => setIntervalHours(Math.min(23, Math.max(1, parseInt(e.target.value, 10) || 1)))}
          className="max-w-[100px]"
          required
        />
        <p className="text-xs text-(--color-muted)">
          Mínimo 1h. Cada slot publica 1 post de notícia + 1 artigo de venda (quando disponíveis).
        </p>
      </div>

      {/* ── Active days ───────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Dias ativos</Label>
        <div className="flex flex-wrap gap-3">
          {DAY_LABELS.map((label, idx) => (
            <label
              key={idx}
              className="flex items-center gap-1.5 text-sm cursor-pointer select-none text-(--color-accent)"
            >
              <input
                type="checkbox"
                name={`day_${idx}`}
                defaultChecked={settings.active_days.includes(idx)}
                className="h-4 w-4 rounded border border-(--color-border) accent-(--color-accent)"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* ── Post counts ───────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <Label htmlFor="news_posts_per_day">Postagens de notícias por dia</Label>
          <Input
            id="news_posts_per_day"
            name="news_posts_per_day"
            type="number"
            min={0}
            max={20}
            value={newsPerDay}
            onChange={(e) => setNewsPerDay(Math.min(20, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="max-w-[100px]"
            required
          />
          <p className="text-xs text-(--color-muted)">
            Temas: Iluminação, Arquitetura, Design de Interiores
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="sales_posts_per_day">Artigos de venda por dia</Label>
          <Input
            id="sales_posts_per_day"
            name="sales_posts_per_day"
            type="number"
            min={0}
            max={20}
            value={salesPerDay}
            onChange={(e) => setSalesPerDay(Math.min(20, Math.max(0, parseInt(e.target.value, 10) || 0)))}
            className="max-w-[100px]"
            required
          />
          <p className="text-xs text-(--color-muted)">
            Produto × cidade (Sudeste prioritário, expansão nacional automática)
          </p>
        </div>
      </div>

      {/* ── Slot preview ──────────────────────────────────── */}
      {numSlots > 0 && (
        <div className={`rounded-md border px-4 py-3 text-sm space-y-2 ${
          scheduleInvalid
            ? 'border-red-500/40 bg-red-500/10'
            : 'border-(--color-border) bg-(--color-bg)'
        }`}>
          <p className="font-medium text-(--color-accent)">
            Horários calculados ({numSlots} slot{numSlots > 1 ? 's' : ''}):
          </p>
          <div className="flex flex-wrap gap-2">
            {slotTimes.map((s, i) => (
              <span
                key={i}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono border ${
                  s.published
                    ? 'border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400'
                    : 'border-(--color-border) text-(--color-muted)'
                }`}
              >
                {s.time}
                <span className="opacity-70">{s.published ? '· publicado' : '· agendado'}</span>
              </span>
            ))}
          </div>
          {scheduleInvalid && (
            <p className="text-red-600 dark:text-red-400 text-xs">
              Agendamento inválido: o último slot ultrapassa meia-noite. Reduza o número de posts ou o intervalo.
            </p>
          )}
        </div>
      )}

      {/* ── Disclaimer ────────────────────────────────────── */}
      <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        <strong>Atenção:</strong> Para planos gratuitos de IA (API) não é recomendado ultrapassar{' '}
        <strong>10 postagens ao dia no total</strong>, pois pode exceder o limite diário do plano.
      </div>

      {/* ── Submit ────────────────────────────────────────── */}
      <Button type="submit" disabled={isPending || scheduleInvalid}>
        {isPending ? 'Salvando…' : 'Salvar configurações'}
      </Button>
    </form>
  )
}
