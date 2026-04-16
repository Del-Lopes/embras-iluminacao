// ============================================================
// /api/cron/auto-publish — Fully autonomous daily pipeline
//
// Vercel Cron invokes this endpoint hourly (see vercel.json).
// Vercel automatically sends: Authorization: Bearer <CRON_SECRET>
//
// The handler checks settings + guards (enabled, active day,
// start hour, daily goal) before running any pipelines.
// If today's goal is already met it returns early.
// ============================================================

import { type NextRequest, NextResponse } from 'next/server'
import { runAutomation } from '@/lib/automation/cron-runner'

export const runtime    = 'nodejs'
export const maxDuration = 300 // 5 minutes — enough for full pipeline

export async function GET(req: NextRequest): Promise<NextResponse> {
  // ── Auth guard ─────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[cron/auto-publish] Unauthorized request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else if (process.env.NODE_ENV === 'production') {
    // In production, CRON_SECRET must be set
    console.error('[cron/auto-publish] CRON_SECRET env var not set — refusing request')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // ── Run automation ─────────────────────────────────────
  try {
    const result = await runAutomation()
    console.info('[cron/auto-publish] result:', JSON.stringify(result))
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error('[cron/auto-publish] fatal error:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
