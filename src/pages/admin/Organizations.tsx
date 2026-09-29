import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Search, Building2, Users, CheckCircle2, Ban, MailCheck, ShieldCheck, ShieldOff, MailWarning } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDate } from '@/lib/utils'
import type { Profile, SubscriptionStatus } from '@/lib/types'

interface OrgProfile extends Profile {
  employee_count: number
}

const addOrgSchema = z
  .object({
    company_name: z.string().trim().min(2, 'Organization name is required'),
    full_name: z.string().trim().min(2, 'HR name is required'),
    email: z.string().trim().email('Valid email required'),
    bgv_seats_total: z
      .number({ error: 'Seats must be a number' })
      .int('Seats must be a whole number')
      .min(0, 'Seats cannot be negative'),
    password: z.string().min(8, 'At least 8 characters'),
    confirm_password: z.string().min(1, 'Confirm the password'),
  })
  .refine(v => v.password === v.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  })
type AddOrgFormData = z.infer<typeof addOrgSchema>

const badgeBase = 'inline-flex w-fit items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium'

function EmailVerificationBadge({ org }: { org: OrgProfile }) {
  if (org.email_verified_override) {
    return (
      <span className={`${badgeBase} bg-amber-100 text-amber-800`}>
        <ShieldCheck className="w-3 h-3" />
        Verified by admin
      </span>
    )
  }
  if (org.email_verified) {
    return (
      <span className={`${badgeBase} bg-green-100 text-green-800`}>
        <MailCheck className="w-3 h-3" />
        Verified
      </span>
    )
  }
  return (
    <span className={`${badgeBase} bg-red-100 text-red-800`}>
      <MailWarning className="w-3 h-3" />
      Not verified
    </span>
  )
}

export default function Organizations() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [addOrgOpen, setAddOrgOpen] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<AddOrgFormData>({
    resolver: zodResolver(addOrgSchema),
    defaultValues: {
      company_name: '',
      full_name: '',
      email: '',
      bgv_seats_total: 0,
      password: '',
      confirm_password: '',
    },
  })

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ['admin-orgs'],
    queryFn: async (): Promise<OrgProfile[]> => {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'hr')
        .order('created_at', { ascending: false })
      if (profileError) throw profileError

      const { data: counts, error: countError } = await supabase
        .from('employees')
        .select('hr_id')
      if (countError) throw countError

      const countMap: Record<string, number> = {}
      for (const emp of counts ?? []) {
        countMap[emp.hr_id] = (countMap[emp.hr_id] ?? 0) + 1
      }

      return (profiles ?? []).map(p => ({
        ...p,
        employee_count: countMap[p.id] ?? 0,
      }))
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubscriptionStatus }) => {
      const { error } = await supabase.from('profiles').update({ subscription_status: status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      toast.success(`Org ${status === 'active' ? 'approved' : 'suspended'}`)
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
    },
    onError: () => toast.error('Update failed'),
  })

  const setEmailVerified = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase.rpc('admin_set_email_verified', {
        target_user_id: id,
        verified,
      })
      if (error) throw error
    },
    onSuccess: (_, { verified }) => {
      toast.success(verified ? 'Email verification overridden' : 'Override revoked')
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-profiles'] })
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  })

  const addOrg = useMutation({
    mutationFn: async (values: AddOrgFormData) => {
      // Not invokeFunction: that helper swallows the body, and this form needs
      // to show "an organization with that name already exists", not a generic
      // "edge function error".
      const { data, error } = await supabase.functions.invoke('admin-create-org', {
        body: {
          companyName: values.company_name,
          hrName: values.full_name,
          email: values.email,
          seats: values.bgv_seats_total,
          password: values.password,
        },
      })

      if (error) {
        let message = error.message
        try {
          const payload = await error.context?.json()
          if (payload?.error) message = payload.error
        } catch {
          // non-JSON error body, keep the generic message
        }
        throw new Error(message)
      }

      return data as { profileId: string; email: string }
    },
    onSuccess: (_, values) => {
      toast.success(`${values.company_name} created — approve it to let them in`)
      setAddOrgOpen(false)
      reset()
      queryClient.invalidateQueries({ queryKey: ['admin-orgs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-all-profiles'] })
    },
    onError: (err) => toast.error(err.message),
  })

  const filtered = orgs.filter(o => {
    const q = search.toLowerCase()
    return (
      o.company_name?.toLowerCase().includes(q) ||
      o.full_name.toLowerCase().includes(q) ||
      (o.email?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <PageWrapper title="Organizations">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">All Organizations</h2>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search organizations..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => setAddOrgOpen(true)}>
                <Building2 className="w-3.5 h-3.5" />
                Add Org
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Seats</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(org => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <button
                          onClick={() => navigate(`/admin/orgs/${org.id}`)}
                          className="font-medium text-[#063840] hover:underline text-left"
                        >
                          {org.company_name ?? '—'}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{org.full_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-foreground">{org.email ?? '—'}</span>
                        <EmailVerificationBadge org={org} />
                        {org.email_verified_override && !org.email_verified_at && (
                          <span className="text-[11px] text-muted-foreground">
                            Confirmation link never opened
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{formatDate(org.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        {org.employee_count}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {org.bgv_seats_used ?? 0} / {org.bgv_seats_total ?? 0}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        org.subscription_status === 'active' ? 'bg-green-100 text-green-800'
                        : org.subscription_status === 'suspended' ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {org.subscription_status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {org.email_verified_override ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-amber-600 hover:text-amber-700"
                              >
                                <ShieldOff className="w-3.5 h-3.5 mr-1" />
                                Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revoke email verification override?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  <strong>{org.company_name}</strong> goes back to whatever they had before the
                                  override. If the email was never confirmed, they will not be able to sign in
                                  again until they do.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => setEmailVerified.mutate({ id: org.id, verified: false })}
                                  className="bg-amber-600 hover:bg-amber-700"
                                >
                                  Revoke override
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : !org.email_verified ? (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <MailWarning className="w-3.5 h-3.5 mr-1" />
                                Mark verified
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Override email verification?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This confirms <strong>{org.email ?? org.company_name}</strong> on their behalf so
                                  they can sign in. Use it when the confirmation email is undeliverable. Revoking
                                  later restores whatever they had before. This action is written to the audit log.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => setEmailVerified.mutate({ id: org.id, verified: true })}
                                >
                                  Mark as verified
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        ) : null}
                        {org.subscription_status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve organization?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will activate <strong>{org.company_name}</strong> and give them full access.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateStatus.mutate({ id: org.id, status: 'active' })}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {org.subscription_status === 'active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Suspend
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Suspend organization?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will revoke <strong>{org.company_name}'s</strong> access to the platform.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateStatus.mutate({ id: org.id, status: 'suspended' })}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Suspend
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {org.subscription_status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateStatus.mutate({ id: org.id, status: 'active' })}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No organizations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
      <Dialog
        open={addOrgOpen}
        onOpenChange={(val) => {
          setAddOrgOpen(val)
          if (!val) reset()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Organization</DialogTitle>
            <DialogDescription>
              Registers a new organization and its HR login. The account is created as pending — approve it
              from this page to let them in.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(v => addOrg.mutate(v))} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="company_name">Organization Name *</Label>
              <Input id="company_name" placeholder="Acme Corp" {...register('company_name')} />
              {errors.company_name && <p className="text-xs text-red-500">{errors.company_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="full_name">HR Name *</Label>
              <Input id="full_name" placeholder="Rahul Kumar" {...register('full_name')} />
              {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Contact Email *</Label>
              <Input id="email" type="email" placeholder="hr@acme.com" {...register('email')} />
              <p className="text-xs text-muted-foreground">This is the HR login. Must be unique.</p>
              {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bgv_seats_total">BGV Seats *</Label>
              <Input
                id="bgv_seats_total"
                type="number"
                min={0}
                step={1}
                {...register('bgv_seats_total', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">How many background checks they can run.</p>
              {errors.bgv_seats_total && (
                <p className="text-xs text-red-500">{errors.bgv_seats_total.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" placeholder="Min 8 characters" {...register('password')} />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Confirm Password *</Label>
                <Input id="confirm_password" type="password" {...register('confirm_password')} />
                {errors.confirm_password && (
                  <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOrgOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting || addOrg.isPending}>
                Create Organization
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
