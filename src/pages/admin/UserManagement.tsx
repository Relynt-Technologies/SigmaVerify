import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CheckCircle2, Ban, Search, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { formatDate } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Profile, SubscriptionStatus, UserRole } from '@/lib/types'

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export default function UserManagement() {
  const { profile: currentProfile } = useAuth()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null)

  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editRole, setEditRole] = useState<UserRole>('hr')
  const [editStatus, setEditStatus] = useState<SubscriptionStatus>('pending')
  const [editSeatsTotal, setEditSeatsTotal] = useState(0)
  const [editSeatsUsed, setEditSeatsUsed] = useState(0)

  const [seatsProfile, setSeatsProfile] = useState<Profile | null>(null)
  const [seatsToAdd, setSeatsToAdd] = useState(5)

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['admin-all-profiles'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubscriptionStatus }) => {
      const { error } = await supabase.from('profiles').update({ subscription_status: status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, { status }) => {
      toast.success(`Account ${status === 'active' ? 'approved' : 'suspended'}`)
      queryClient.invalidateQueries({ queryKey: ['admin-all-profiles'] })
    },
    onError: () => toast.error('Update failed'),
  })

  const updateUser = useMutation({
    mutationFn: async (values: {
      id: string
      full_name: string
      email: string
      company_name: string
      role: UserRole
      subscription_status: SubscriptionStatus
      bgv_seats_total: number
      bgv_seats_used: number
    }) => {
      const { error } = await supabase.rpc('admin_update_profile', {
        target_user_id: values.id,
        p_full_name: values.full_name,
        p_email: values.email,
        p_company_name: values.company_name,
        p_role: values.role,
        p_subscription_status: values.subscription_status,
        p_bgv_seats_total: values.bgv_seats_total,
        p_bgv_seats_used: values.bgv_seats_used,
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('User updated successfully')
      setEditingProfile(null)
      queryClient.invalidateQueries({ queryKey: ['admin-all-profiles'] })
    },
    onError: (err) => toast.error(err.message || 'Failed to update user'),
  })

  const updateRole = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Role updated')
      queryClient.invalidateQueries({ queryKey: ['admin-all-profiles'] })
    },
    onError: () => toast.error('Failed to update role'),
  })

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_delete_user', { target_user_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('User deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['admin-all-profiles'] })
    },
    onError: (err) => toast.error(`Failed to delete user: ${err.message}`),
  })

  const addSeats = useMutation({
    mutationFn: async ({ id, additional }: { id: string, additional: number }) => {
      if (additional < 5 || additional % 5 !== 0) {
        throw new Error('Seats must be added in multiples of 5 (min 5).')
      }
      const { data: profileData, error: fetchErr } = await supabase
        .from('profiles')
        .select('bgv_seats_total')
        .eq('id', id)
        .single()
        
      if (fetchErr) throw fetchErr

      const { error } = await supabase
        .from('profiles')
        .update({ bgv_seats_total: profileData.bgv_seats_total + additional })
        .eq('id', id)
        
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Seats added successfully')
      setSeatsProfile(null)
      setSeatsToAdd(5)
      queryClient.invalidateQueries({ queryKey: ['admin-all-profiles'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add seats'),
  })

  const filtered = profiles.filter(p =>
    p.id !== currentProfile?.id && (
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.company_name ?? '').toLowerCase().includes(search.toLowerCase())
    )
  )

  return (
    <PageWrapper title="User Management">
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-border">
          <div className="flex items-center justify-between gap-4 p-5 border-b border-border">
            <h2 className="font-semibold text-foreground">All Users</h2>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
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
                    <TableHead>User</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Seats</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(profile => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 shrink-0 rounded-full bg-accent/20 text-primary flex items-center justify-center text-xs font-semibold">
                            {getInitials(profile.full_name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{profile.full_name}</div>
                            <div className="text-xs text-muted-foreground truncate">{profile.email ?? '—'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{profile.company_name ?? '—'}</TableCell>
                      <TableCell>
                        <Select
                          value={profile.role}
                          onValueChange={(val: UserRole) => updateRole.mutate({ id: profile.id, role: val })}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="hr">HR</SelectItem>
                            <SelectItem value="bgv_team">BGV Team</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">{formatDate(profile.created_at)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {profile.bgv_seats_used ?? 0} / {profile.bgv_seats_total ?? 0}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          profile.subscription_status === 'active' ? 'bg-green-100 text-green-800'
                          : profile.subscription_status === 'suspended' ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {profile.subscription_status}
                        </span>
                      </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {profile.subscription_status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Approve
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Approve account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will give <strong>{profile.full_name}</strong> full access to relynt.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateStatus.mutate({ id: profile.id, status: 'active' })}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  Approve
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {profile.subscription_status === 'active' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Ban className="w-3.5 h-3.5 mr-1" />
                                Suspend
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Suspend account?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will revoke <strong>{profile.full_name}'s</strong> access to the platform.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateStatus.mutate({ id: profile.id, status: 'suspended' })}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Suspend
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {profile.subscription_status === 'suspended' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => updateStatus.mutate({ id: profile.id, status: 'active' })}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Reactivate
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSeatsProfile(profile)
                            setSeatsToAdd(5)
                          }}
                        >
                          Seats
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingProfile(profile)
                            setEditName(profile.full_name)
                            setEditEmail(profile.email || '')
                            setEditCompany(profile.company_name || '')
                            setEditRole(profile.role)
                            setEditStatus(profile.subscription_status)
                            setEditSeatsTotal(profile.bgv_seats_total ?? 0)
                            setEditSeatsUsed(profile.bgv_seats_used ?? 0)
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete user entirely?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will completely delete <strong>{profile.full_name}</strong> and all associated data. This action is irreversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteUser.mutate(profile.id)} 
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete forever
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={!!editingProfile} onOpenChange={(val) => !val && setEditingProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input value={editCompany} onChange={e => setEditCompany(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>System Role</Label>
              <Select value={editRole} onValueChange={(val: UserRole) => setEditRole(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hr">HR</SelectItem>
                  <SelectItem value="bgv_team">BGV Team</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Account Status</Label>
              <Select value={editStatus} onValueChange={(val: SubscriptionStatus) => setEditStatus(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BGV Seats Total</Label>
                <Input
                  type="number"
                  min={0}
                  value={editSeatsTotal}
                  onChange={e => setEditSeatsTotal(Math.max(0, Number(e.target.value)))}
                />
              </div>
              <div className="space-y-2">
                <Label>BGV Seats Used</Label>
                <Input
                  type="number"
                  min={0}
                  value={editSeatsUsed}
                  onChange={e => setEditSeatsUsed(Math.max(0, Number(e.target.value)))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(null)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (editingProfile) {
                  updateUser.mutate({
                    id: editingProfile.id,
                    full_name: editName,
                    email: editEmail,
                    company_name: editCompany,
                    role: editRole,
                    subscription_status: editStatus,
                    bgv_seats_total: editSeatsTotal,
                    bgv_seats_used: editSeatsUsed,
                  })
                }
              }}
              loading={updateUser.isPending}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!seatsProfile} onOpenChange={(val) => !val && setSeatsProfile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage BGV Seats for {seatsProfile?.company_name || seatsProfile?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>Current Seats Used: <strong>{seatsProfile?.bgv_seats_used ?? 0}</strong></p>
              <p>Current Seats Total: <strong>{seatsProfile?.bgv_seats_total ?? 0}</strong></p>
            </div>
            <div className="space-y-2">
              <Label>Add Seats (Multiples of 5)</Label>
              <Input 
                type="number" 
                min={5} 
                step={5} 
                value={seatsToAdd} 
                onChange={e => setSeatsToAdd(Number(e.target.value))} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSeatsProfile(null)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (seatsProfile) {
                  addSeats.mutate({ id: seatsProfile.id, additional: seatsToAdd })
                }
              }}
              loading={addSeats.isPending}
            >
              Add Seats
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  )
}
