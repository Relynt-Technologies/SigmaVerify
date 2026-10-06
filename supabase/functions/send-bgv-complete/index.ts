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
    const {
      hrEmail, hrName, employeeName, verdict, reportUrl,
      employeeEmail, appUrl
    } = await req.json()

    const isClear = verdict === 'CLEAR'
    const verdictColor = isClear ? '#166534' : '#991b1b'
    const verdictBg = isClear ? '#f0fdf4' : '#fef2f2'
    const verdictBorder = isClear ? '#bbf7d0' : '#fecaca'

    // Email to HR
    const hrHtml = `
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
              <div style="color:#ffffff;font-size:22px;font-weight:700;">BGV Report Ready</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#0f172a;font-size:16px;margin:0 0 16px;">Hi ${hrName},</p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                The background verification for <strong>${employeeName}</strong> is complete.
              </p>
              <div style="background:${verdictBg};border:1px solid ${verdictBorder};border-radius:8px;padding:20px;margin:0 0 28px;text-align:center;">
                <p style="color:${verdictColor};font-size:20px;font-weight:700;margin:0;">
                  ${isClear ? '✓ CLEAR' : '⚠ DISCREPANCY FOUND'}
                </p>
                <p style="color:${verdictColor};font-size:13px;margin:8px 0 0;">
                  ${isClear
        ? 'All verification checks passed successfully.'
        : 'One or more verification checks require attention.'}
                </p>
              </div>
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${reportUrl}" style="display:inline-block;background:#063840;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;">
                      Download Full Report →
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

    // Email to Employee (no document details, just verdict)
    const employeeHtml = `
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
              <div style="color:#ffffff;font-size:22px;font-weight:700;">Your BGV is Complete</div>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="color:#0f172a;font-size:16px;margin:0 0 16px;">Hello,</p>
              <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Your background verification has been completed.
              </p>
              <div style="background:${verdictBg};border:1px solid ${verdictBorder};border-radius:8px;padding:20px;margin:0 0 24px;text-align:center;">
                <p style="color:${verdictColor};font-size:18px;font-weight:700;margin:0;">
                  ${isClear ? '✓ Verification Successful' : '⚠ Verification Completed with Notes'}
                </p>
                <p style="color:${verdictColor};font-size:13px;margin:8px 0 0;">
                  ${isClear
        ? 'Your documents have been verified successfully.'
        : 'Please contact your HR team for more information.'}
                </p>
              </div>
              <p style="color:#94a3b8;font-size:13px;margin:0;text-align:center;">
                For queries, please contact your HR department.
              </p>
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

    const resendKey = Deno.env.get('RESEND_API_KEY')

    const [hrRes, empRes] = await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Relynt <hello@relyntai.com>',
          to: hrEmail,
          subject: `BGV Complete — ${employeeName} | ${verdict}`,
          html: hrHtml,
        }),
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
        body: JSON.stringify({
          from: 'Relynt <hello@relyntai.com>',
          to: employeeEmail,
          subject: 'Your background verification is complete — relynt',
          html: employeeHtml,
        }),
      }),
    ])

    return new Response(JSON.stringify({ hr: await hrRes.json(), employee: await empRes.json() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
