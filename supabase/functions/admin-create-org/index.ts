import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  // ─── AUTH ────────────────────────────────────────────────────────────────────
  // Every other function in this repo is unauthenticated. This one runs with the
  // service role and can create users, so the caller must present a session and
  // that session must belong to an admin.
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace('Bearer ', '').trim()
  if (!token) return json({ error: 'Not authorized' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: callerData, error: callerError } = await admin.auth.getUser(token)
  if (callerError || !callerData.user) return json({ error: 'Not authorized' }, 401)

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', callerData.user.id)
    .single()

  if (callerProfile?.role !== 'admin') return json({ error: 'Not authorized' }, 403)

  // ─── VALIDATE ────────────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }

  const companyName = String(body.companyName ?? '').trim()
  const hrName = String(body.hrName ?? '').trim()
  const email = String(body.email ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const seats = Number(body.seats ?? 0)

  if (companyName.length < 2) return json({ error: 'Organization name is required' }, 400)
  if (hrName.length < 2) return json({ error: 'HR name is required' }, 400)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Valid email required' }, 400)
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400)
  if (!Number.isInteger(seats) || seats < 0) return json({ error: 'Seats must be zero or more' }, 400)

  // ─── UNIQUENESS ──────────────────────────────────────────────────────────────
  // Friendly pre-check. idx_profiles_hr_company_name is the real guarantee; this
  // just turns a trigger error into a readable message.
  const { data: nameClash } = await admin
    .from('profiles')
    .select('id')
    .eq('role', 'hr')
    .ilike('company_name', companyName)
    .limit(1)

  if (nameClash && nameClash.length > 0) {
    return json({ error: `An organization named "${companyName}" already exists` }, 409)
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────
  // email_confirm is deliberate: the account is created on someone's behalf, so
  // the confirmation link would never be opened. It still lands as 'pending' and
  // cannot be used until an admin approves it from /admin/orgs.
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: hrName,
      company_name: companyName,
      role: 'hr',
    },
  })

  if (createError || !created?.user) {
    const raw = createError?.message ?? 'Could not create user'
    if (/already been registered|already exists/i.test(raw)) {
      return json({ error: `${email} is already registered` }, 409)
    }
    // The handle_new_user trigger can still trip the unique index on company_name.
    if (/company_name|profiles_/i.test(raw)) {
      return json({ error: `An organization named "${companyName}" already exists` }, 409)
    }
    return json({ error: raw }, 400)
  }

  const userId = created.user.id

  // handle_new_user already made the profile from user_metadata. Seat
  // allocation is the only thing left, and subscription_status stays 'pending'.
  const { error: profileError } = await admin
    .from('profiles')
    .update({ bgv_seats_total: seats })
    .eq('id', userId)

  if (profileError) {
    // Don't leave a half-provisioned org behind.
    await admin.auth.admin.deleteUser(userId)
    return json({ error: profileError.message }, 500)
  }

  await admin.from('audit_logs').insert({
    actor_id: callerData.user.id,
    action: 'org_created',
    entity_type: 'profile',
    entity_id: userId,
    metadata: {
      company_name: companyName,
      email,
      hr_name: hrName,
      bgv_seats_total: seats,
      created_by: 'admin',
    },
  })

  return json({ profileId: userId, email }, 201)
})
