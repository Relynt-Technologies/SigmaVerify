import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { hrEmail, hrName, employeeName, employeeId, appUrl } = await req.json()

    const reviewUrl = `${appUrl}/hr/employees/${employeeId}`

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <tr>
            <td style="background:#063840;padding:32px 40px;">
              <div style="color:#6FC2CB;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">relynt</div>
              <div style="color:#ffffff;font-size:22px;font-weight:700;">Documents Received</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#0f172a;font-size:16px;margin:0 0 16px;">Hi ${hrName},</p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                <strong>${employeeName}</strong> has submitted all required documents for background verification.
                The verification process will begin shortly.
              </p>
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin:0 0 28px;">
                <p style="color:#0c4a6e;font-size:14px;margin:0;font-weight:500;">
                  📋 5 documents submitted<br>
                  🔍 BGV team review in progress<br>
                  ⏱ Expected completion: 3-5 business days
                </p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${reviewUrl}" style="display:inline-block;background:#063840;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
                      View Employee Status →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
                Powered by <strong style="color:#063840;">relynt</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'Relynt <hello@relyntai.com>',
        to: hrEmail,
        subject: `Documents received from ${employeeName} — relynt`,
        html,
      }),
    })

    const data = await res.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: res.ok ? 200 : 400,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
