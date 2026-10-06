import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { UserPlus, Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const phoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone required')
  .regex(/^\+?[\d\s()-]{7,20}$/, 'Enter a valid phone number')

const manualSchema = z.object({
  full_name: z.string().min(2, 'Name required'),
  email: z.string().email('Valid email required'),
  phone: phoneSchema,
})
type ManualFormData = z.infer<typeof manualSchema>

interface BulkEmployee { full_name: string; email: string; phone: string; error?: string }

export default function AddEmployee() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [bulkEmployees, setBulkEmployees] = useState<BulkEmployee[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ManualFormData>({
    resolver: zodResolver(manualSchema),
  })

  const addAndInvite = async (employees: BulkEmployee[]) => {
    const results = await Promise.all(employees.map(async emp => {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          hr_id: profile!.id,
          full_name: emp.full_name,
          email: emp.email,
          phone: emp.phone,
          status: 'pending_initiation',
        })
        .select()
        .single()

      if (error || !data) return { ok: false, name: emp.full_name }

      await supabase.from('audit_logs').insert({
        actor_id: profile!.id,
        action: 'employee_added',
        entity_type: 'employee',
        entity_id: data.id,
        metadata: { email: data.email, status: 'pending_initiation' },
      })

      return { ok: true, name: emp.full_name }
    }))

    return results
  }

  const manualMutation = useMutation({
    mutationFn: (data: ManualFormData) => addAndInvite([data]),
    onSuccess: () => {
      toast.success('Employee added successfully')
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/hr/dashboard')
    },
    onError: () => toast.error('Failed to add employee'),
  })

  const bulkMutation = useMutation({
    mutationFn: () => addAndInvite(bulkEmployees.filter(e => !e.error)),
    onSuccess: (results) => {
      const ok = results.filter(r => r.ok).length
      toast.success(`${ok} employee(s) added successfully`)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/hr/dashboard')
    },
    onError: () => toast.error('Bulk add failed'),
  })

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      const data = new Uint8Array(ev.target!.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet)

      const parsed: BulkEmployee[] = rows.map(row => {
        const name = String(row['Name'] ?? row['Full Name'] ?? row['full_name'] ?? '').trim()
        const email = String(row['Email'] ?? row['email'] ?? '').trim()
        const phone = String(row['Phone'] ?? row['phone'] ?? '').trim()

        if (!name) return { full_name: name, email, phone, error: 'Name missing' }
        if (!email || !z.string().email().safeParse(email).success)
          return { full_name: name, email, phone, error: 'Invalid email' }
        if (!phone || !phoneSchema.safeParse(phone).success)
          return { full_name: name, email, phone, error: 'Phone missing or invalid' }

        return { full_name: name, email, phone }
      })

      setBulkEmployees(parsed)
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  return (
    <PageWrapper title="Add Employee">
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <Tabs defaultValue="manual">
          <TabsList className="w-full">
            <TabsTrigger value="manual" className="flex-1 gap-1.5">
              <UserPlus className="w-3.5 h-3.5" /> Manual
            </TabsTrigger>
            <TabsTrigger value="excel" className="flex-1 gap-1.5">
              <Upload className="w-3.5 h-3.5" /> Excel Upload
            </TabsTrigger>
            <TabsTrigger value="resume" disabled className="flex-1 gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Resume Parse
              <span className="text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                Soon
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Manual */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Add Employee Manually</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(data => manualMutation.mutate(data))} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Full Name *</Label>
                    <Input placeholder="Rahul Kumar" {...register('full_name')} />
                    {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email *</Label>
                    <Input type="email" placeholder="rahul@email.com" {...register('email')} />
                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Phone *</Label>
                    <Input placeholder="+91 98765 43210" {...register('phone')} />
                    {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" loading={isSubmitting || manualMutation.isPending}>
                    Add Employee
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Excel */}
          <TabsContent value="excel">
            <Card>
              <CardHeader>
                <CardTitle>Upload Excel File</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a .xlsx file with columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Phone</strong>
                </p>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleExcelUpload} />
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Excel File
                </Button>

                {bulkEmployees.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-foreground">
                      {bulkEmployees.filter(e => !e.error).length} valid / {bulkEmployees.length} total
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                      {bulkEmployees.map((emp, i) => (
                        <div
                          key={i}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                            emp.error ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'
                          }`}
                        >
                          {emp.error
                            ? <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            : <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          <span className="flex-1 truncate">{emp.full_name || '(No name)'} · {emp.email}</span>
                          {emp.error && <span className="text-xs opacity-70">{emp.error}</span>}
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      loading={bulkMutation.isPending}
                      disabled={!bulkEmployees.some(e => !e.error)}
                      onClick={() => bulkMutation.mutate()}
                    >
                      Add {bulkEmployees.filter(e => !e.error).length} Employees
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resume — coming soon */}
          <TabsContent value="resume">
            <Card>
              <CardContent className="py-12">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                      <FileText className="w-10 h-10 text-primary" />
                    </div>
                    <span className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                      <Sparkles className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold text-foreground">Coming Soon</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Upload a PDF resume and let AI extract the candidate's details automatically.
                      This feature is on its way.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    In development
                  </span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PageWrapper>
  )
}
