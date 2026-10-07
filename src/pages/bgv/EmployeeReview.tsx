import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, Save, FileText, ExternalLink } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { supabase, getSignedUrl, invokeFunction } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/utils'
import { DOC_TYPE_LABELS, ALL_DOC_TYPES } from '@/lib/types'
import type { Employee, Verification, EmployeeDocument, VerificationStatus, DocType } from '@/lib/types'
import { BGVReport } from './BGVReport'

interface ReviewData {
  employee: Employee | null
  verifications: Verification[]
  documents: EmployeeDocument[]
}

export default function EmployeeReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const [localVerifs, setLocalVerifs] = useState<Record<string, { status: VerificationStatus; notes: string }>>({})
  const [generatingReport, setGeneratingReport] = useState(false)
  const [docSignedUrls, setDocSignedUrls] = useState<Record<string, string>>({})

  const { data, isLoading } = useQuery<ReviewData>({
    queryKey: ['bgv-review', id],
    queryFn: async (): Promise<ReviewData> => {
      const [empRes, verRes, docRes] = await Promise.all([
        supabase.from('employees').select('*').eq('id', id!).single(),
        supabase.from('verifications').select('*').eq('employee_id', id!),
        supabase.from('employee_documents').select('*').eq('employee_id', id!),
      ])
      return {
        employee: empRes.data as Employee | null,
        verifications: (verRes.data ?? []) as Verification[],
        documents: (docRes.data ?? []) as EmployeeDocument[],
      }
    },
    enabled: !!id,
  })

  // Initialize local state from fetched verifications
  useEffect(() => {
    if (!data?.verifications) return
    const init: Record<string, { status: VerificationStatus; notes: string }> = {}
    data.verifications.forEach((v: Verification) => {
      init[v.doc_type] = { status: v.status, notes: v.notes ?? '' }
    })
    setLocalVerifs(init)
  }, [data?.verifications])

  // Fetch signed URLs for document previews
  useEffect(() => {
    if (!data?.documents?.length) return
    let cancelled = false
    ;(async () => {
      const entries = await Promise.all(
        data.documents.map(async d => {
          const url = await getSignedUrl('employee-docs', d.file_path, 86400)
          return [d.doc_type, url ?? ''] as [string, string]
        })
      )
      if (!cancelled) setDocSignedUrls(Object.fromEntries(entries))
    })()
    return () => { cancelled = true }
  }, [data?.documents])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = Object.entries(localVerifs).map(([docType, val]) =>
        supabase.from('verifications').update({
          status: val.status,
          notes: val.notes || null,
          verified_by: profile!.id,
          verified_at: new Date().toISOString(),
        }).eq('employee_id', id!).eq('doc_type', docType)
      )
      await Promise.all(updates)

      if (data?.employee?.status === 'docs_submitted') {
        await supabase.from('employees').update({ status: 'under_review' }).eq('id', id!)
      }
    },
    onSuccess: () => {
      toast.success('Progress saved')
      queryClient.invalidateQueries({ queryKey: ['bgv-review', id] })
      queryClient.invalidateQueries({ queryKey: ['bgv-queue'] })
    },
    onError: () => toast.error('Failed to save'),
  })

  const generateReport = async () => {
    if (!data?.employee || !profile) return
    setGeneratingReport(true)

    try {
      const verifiedAtByType: Record<string, string | null> = {}
      data.verifications.forEach(v => { verifiedAtByType[v.doc_type] = v.verified_at })

      const allVerifs = ALL_DOC_TYPES.map(dt => ({
        docType: dt,
        status: localVerifs[dt]?.status ?? ('pending' as VerificationStatus),
        notes: localVerifs[dt]?.notes ?? '',
        verifiedAt: verifiedAtByType[dt] ?? null,
      }))

      const verdict = allVerifs.every(v => v.status === 'verified') ? 'CLEAR' as const : 'DISCREPANCY FOUND' as const

      const docUrlPromises = data.documents.map(async d => {
        const url = await getSignedUrl('employee-docs', d.file_path, 604800)
        return {
          docType: d.doc_type as DocType,
          signedUrl: url || '',
          isImage: /\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(d.file_path),
        }
      })
      const documents = (await Promise.all(docUrlPromises)).filter(d => d.signedUrl)

      const blob = await pdf(
        <BGVReport
          employee={data.employee}
          verifications={allVerifs}
          documents={documents}
          verifiedBy={profile.full_name}
          verdict={verdict}
          generatedAt={new Date().toISOString()}
          clientName={profile.company_name ?? 'Client Organization'}
          refNo={`SV-${data.employee.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`}
          caseStart={data.employee.submitted_at}
        />
      ).toBlob()

      const path = `${data.employee.id}/report.pdf`
      const file = new File([blob], 'report.pdf', { type: 'application/pdf' })

      await supabase.storage.from('reports').upload(path, file, { upsert: true })

      const { data: existing } = await supabase.from('reports').select('id').eq('employee_id', id!).maybeSingle()
      if (existing) {
        await supabase.from('reports').update({
          report_url: path,
          generated_at: new Date().toISOString(),
        }).eq('employee_id', id!)
      } else {
        await supabase.from('reports').insert({
          employee_id: id!,
          report_url: path,
          generated_at: new Date().toISOString(),
        })
      }

      const finalStatus = verdict === 'CLEAR' ? 'completed' : 'failed'

      if (!isRegenerate) {
        await supabase.from('employees').update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
        }).eq('id', id!)
      }

      const reportUrl = await getSignedUrl('reports', path, 86400)

      if (!isRegenerate) {
        const { data: hrData } = await supabase
          .from('employees')
          .select('hr_id, profiles:hr_id(full_name, email)')
          .eq('id', id!)
          .single()

        if (hrData && reportUrl) {
          const hrProfile = (hrData as Record<string, unknown>).profiles as { full_name: string; email: string } | null
          if (hrProfile) {
            await invokeFunction('send-bgv-complete', {
              hrEmail: hrProfile.email,
              hrName: hrProfile.full_name,
              employeeName: data.employee.full_name,
              employeeEmail: data.employee.email,
              verdict,
              reportUrl,
              appUrl: window.location.origin,
            })

            await supabase.from('reports').update({
              sent_to_hr_at: new Date().toISOString(),
              sent_to_employee_at: new Date().toISOString(),
            }).eq('employee_id', id!)
          }
        }
      }

      toast.success(isRegenerate ? 'Report regenerated successfully' : 'Report generated and emails sent')
      queryClient.invalidateQueries({ queryKey: ['bgv-review', id] })
      queryClient.invalidateQueries({ queryKey: ['bgv-queue'] })
    } catch (err) {
      toast.error('Failed to generate report')
      console.error(err)
    } finally {
      setGeneratingReport(false)
    }
  }

  const allResolved = ALL_DOC_TYPES.every(dt => {
    const s = localVerifs[dt]?.status
    return s === 'verified' || s === 'failed'
  })
  const isRegenerate = data?.employee?.status === 'completed' || data?.employee?.status === 'failed'

  if (isLoading) {
    return (
      <PageWrapper title="Review Employee">
        <div className="max-w-3xl mx-auto space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    )
  }

  const employee = data?.employee
  const documents = data?.documents ?? []

  if (!employee) return null

  return (
    <PageWrapper title="Review Employee">
      <div className="max-w-3xl mx-auto space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </button>

        {/* Employee header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#063840]/10 rounded-xl flex items-center justify-center">
                  <span className="text-[#063840] text-lg font-bold">{employee.full_name.charAt(0)}</span>
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">{employee.full_name}</h2>
                  <div className="text-sm text-muted-foreground">{employee.email}</div>
                  <div className="text-xs text-muted-foreground">Submitted: {formatDate(employee.submitted_at)}</div>
                </div>
              </div>
              <StatusBadge status={employee.status} />
            </div>
          </CardContent>
        </Card>

        {/* Document verifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Document Verification</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => saveMutation.mutate()}
                  loading={saveMutation.isPending}
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  Save Progress
                </Button>
                {allResolved && (!isRegenerate || profile?.role === 'admin') && (
                  <Button
                    size="sm"
                    variant="success"
                    onClick={generateReport}
                    loading={generatingReport}
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" />
                    {isRegenerate ? 'Regenerate Report' : 'Generate Report'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {ALL_DOC_TYPES.map(docType => {
              const doc = documents.find((d: EmployeeDocument) => d.doc_type === docType)
              const local = localVerifs[docType] ?? { status: 'pending' as VerificationStatus, notes: '' }

              return (
                <div key={docType} className="p-4 rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-foreground">{DOC_TYPE_LABELS[docType]}</h3>
                    <div className="flex items-center gap-2">
                      {doc && (
                        <button
                          className="flex items-center gap-1.5 text-xs text-[#063840] hover:underline"
                          onClick={async () => {
                            const url = await getSignedUrl('employee-docs', doc.file_path)
                            if (url) window.open(url, '_blank')
                          }}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Open
                        </button>
                      )}
                    </div>
                  </div>
                  {doc && docSignedUrls[doc.doc_type] ? (
                    <div className="mb-3 rounded-lg overflow-hidden border border-border bg-white">
                      {/\.(png|jpe?g|gif|webp|bmp|tiff?)$/i.test(doc.file_path) ? (
                        <img
                          src={docSignedUrls[doc.doc_type]}
                          alt={DOC_TYPE_LABELS[doc.doc_type]}
                          className="w-full max-h-64 object-contain"
                        />
                      ) : (
                        <iframe
                          src={docSignedUrls[doc.doc_type]}
                          className="w-full h-64"
                          title={DOC_TYPE_LABELS[doc.doc_type]}
                        />
                      )}
                    </div>
                  ) : !doc ? (
                    <span className="text-xs text-muted-foreground italic mb-3 block">No document uploaded</span>
                  ) : null}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Status</div>
                      <Select
                        value={local.status}
                        onValueChange={val => setLocalVerifs(prev => ({
                          ...prev,
                          [docType]: { ...prev[docType], status: val as VerificationStatus },
                        }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="verified">Verified</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Notes</div>
                      <Textarea
                        className="h-9 min-h-9 resize-none text-sm py-1.5"
                        placeholder="Add notes..."
                        value={local.notes}
                        onChange={e => setLocalVerifs(prev => ({
                          ...prev,
                          [docType]: { ...prev[docType], notes: e.target.value },
                        }))}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  )
}
