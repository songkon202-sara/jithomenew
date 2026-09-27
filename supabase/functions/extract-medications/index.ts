import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MAX_IMAGE_B64 = 7_000_000 // ~5 MB รูปภาพ

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // ต้อง login และเป็นบัญชี active (admin/staff/อสม.) — กันคนนอกใช้โควตา API
    const sbUser = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    })
    const { data: { user } } = await sbUser.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: 'กรุณาเข้าสู่ระบบ' }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 401 })
    const { data: role } = await sbUser.rpc('jh_role')
    if (!['admin', 'staff', 'aosomo'].includes(role)) {
      return new Response(JSON.stringify({ error: 'ไม่มีสิทธิ์' }), { headers: { ...cors, 'Content-Type': 'application/json' }, status: 403 })
    }

    const { image, mimeType } = await req.json()
    if (!image || typeof image !== 'string') throw new Error('ไม่พบข้อมูลรูปภาพ')
    if (image.length > MAX_IMAGE_B64) throw new Error('รูปภาพใหญ่เกินไป (สูงสุด ~5 MB)')
    if (mimeType && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) throw new Error('ชนิดไฟล์ไม่รองรับ')

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mimeType || 'image/jpeg', data: image },
            },
            {
              type: 'text',
              text: 'นี่คือรูปภาพฉลากยา ใบสั่งยา หรือเอกสารยา กรุณาอ่านรายการชื่อยาและขนาดยาทั้งหมดจากรูปนี้ แสดงเฉพาะชื่อยาและขนาด คั่นด้วย comma เช่น "Risperidone 2mg, Haloperidol 5mg, Biperiden 2mg" ไม่ต้องมีคำอธิบายหรือข้อความอื่น ถ้าไม่พบรายการยาให้ตอบว่า "ไม่พบรายการยา"',
            },
          ],
        }],
      }),
    })

    const result = await resp.json()
    if (!resp.ok) throw new Error(result.error?.message || 'Anthropic API error')

    const medications = result.content?.[0]?.text?.trim() || 'ไม่พบรายการยา'

    return new Response(
      JSON.stringify({ medications }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { headers: { ...cors, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
