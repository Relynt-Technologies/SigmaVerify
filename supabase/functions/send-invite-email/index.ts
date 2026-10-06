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
    const { employeeEmail, employeeName, companyName, inviteToken, appUrl } = await req.json()

    const verifyUrl = `${appUrl}/verify/${inviteToken}`

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Background Verification - relynt</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
          <!-- Header -->
          <tr>
            <td style="background:#063840;padding:32px 40px;">
              <table width="100%">
                <tr>
                  <td>
                    <div style="color:#6FC2CB;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px;">relynt</div>
                    <div style="color:#ffffff;font-size:22px;font-weight:700;">Background Verification</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#0f172a;font-size:16px;margin:0 0 16px;">Hi ${employeeName},</p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                <strong>${companyName}</strong> has initiated a background verification check for your onboarding.
                Please complete the verification by submitting the required documents using the link below.
              </p>
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:0 0 28px;">
                <p style="color:#166534;font-size:13px;margin:0;font-weight:500;">
                  ✓ Your documents are encrypted and stored securely<br>
                  ✓ Only authorized personnel can access your information<br>
                  ✓ The process takes approximately 5-10 minutes
                </p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${verifyUrl}" style="display:inline-block;background:#063840;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
                      Start Verification →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="color:#94a3b8;font-size:12px;margin:24px 0 0;text-align:center;">
                Or copy this link: <span style="color:#063840;">${verifyUrl}</span>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
                Powered by <strong style="color:#063840;">relynt</strong> · Secure Background Verification
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
        to: employeeEmail,
        subject: `Complete your background verification — ${companyName}`,
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
