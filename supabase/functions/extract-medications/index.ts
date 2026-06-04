import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { image, mimeType } = await req.json()
    if (!image) throw new Error('ไม่พบข้อมูลรูปภาพ')

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
