import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { message, groupId, token: tokenOverride } = await req.json()

    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data } = await sb
      .from('app_settings')
      .select('setting_key,setting_value')
      .in('setting_key', ['line_token', 'line_group_id'])

    const cfg = Object.fromEntries((data || []).map((d: any) => [d.setting_key, d.setting_value]))
    const token  = tokenOverride || cfg.line_token
    const target = groupId || cfg.line_group_id

    if (!token)  throw new Error('ยังไม่ได้ตั้งค่า LINE Token')
    if (!target) throw new Error('ยังไม่ได้ตั้งค่า LINE Group ID')

    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: target, messages: [{ type: 'text', text: message }] }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(JSON.stringify(err))
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
