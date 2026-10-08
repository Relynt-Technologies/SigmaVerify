import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DocumentUploader } from '@/components/forms/DocumentUploader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import type { DocType } from '@/lib/types'

interface FormEmployee {
  id: string
  full_name: string
  email: string
  phone: string | null
  status: string
}

const STEPS = [
  { label: 'Identity', docType: 'pan' as DocType, title: 'PAN Card', description: 'Upload a clear image of your PAN card', acceptImages: true, acceptPdf: false },
  { label: 'Court Record', docType: 'aadhaar_court' as DocType, title: 'Aadhaar Card (Court Record Check)', description: 'Upload your Aadhaar card for court record verification', acceptImages: true, acceptPdf: false },
  { label: 'Address', docType: 'aadhaar_address' as DocType, title: 'Aadhaar Card (Address Verification)', description: 'Upload your Aadhaar card for address verification', acceptImages: true, acceptPdf: false, hasAddress: true },
  { label: 'Employment', docType: 'experience_letter' as DocType, title: 'Experience Letter', description: 'Upload your most recent experience letter (PDF)', acceptImages: false, acceptPdf: true },
  { label: 'Education', docType: 'education_certificate' as DocType, title: 'Education Certificate', description: 'Upload your highest degree certificate', acceptImages: true, acceptPdf: true },
]

export default function PublicForm() {
  const { token } = useParams<{ token: string }>()
  const [employee, setEmployee] = useState<FormEmployee | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1) // -1 = consent screen
  const [consented, setConsented] = useState(false)
  const [files, setFiles] = useState<Record<DocType, File | null>>({
    pan: null, aadhaar_court: null, aadhaar_address: null,
    experience_letter: null, education_certificate: null,
  })
  const [address, setAddress] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!token) return
    supabase
      .rpc('get_employee_by_token', { p_token: token })
      .then(({ data, error }) => {
        if (error || !data?.length) {
          setError('Invalid or expired verification link.')
        } else {
          const emp = data[0] as FormEmployee
          if (emp.status !== 'invited') {
            setSubmitted(true)
          } else {
            setEmployee(emp)
          }
        }
        setLoading(false)
      })
  }, [token])

  const currentStepData = STEPS[Math.max(currentStep, 0)]

  const canProceed = () => {
    const file = files[currentStepData.docType]
    if (!file) return false
    if (currentStepData.hasAddress && !address.trim()) return false
    return true
  }

  const uploadFile = async (file: File, employeeId: string, docType: DocType): Promise<string> => {
    const ext = file.name.split('.').pop()
    const path = `${employeeId}/${docType}.${ext}`

    const buffer = await file.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    let binary = ''
    const chunkSize = 8192
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    const base64 = btoa(binary)

    const { data, error } = await supabase.functions.invoke('upload-document', {
      body: { filePath: path, fileBase64: base64, contentType: file.type },
    })
    if (error) throw error
    return data.path
  }

  const handleSubmit = async () => {
    if (!employee || !consented) return
    setUploading(true)

    try {
      const uploadedDocs: { doc_type: DocType; file_path: string }[] = []

      for (const step of STEPS) {
        const file = files[step.docType]
        if (!file) throw new Error(`Missing document: ${step.title}`)

        const path = await uploadFile(file, employee.id, step.docType)
        uploadedDocs.push({ doc_type: step.docType, file_path: path })
      }

      const { data: result } = await supabase.rpc('submit_employee_documents', {
        p_token: token,
        p_documents: uploadedDocs,
      })

      if (result?.error) throw new Error(result.error)

      // Notify HR via edge function
      const { data: hrData } = await supabase
        .from('employees')
        .select('hr_id, profiles:hr_id(full_name, email)')
        .eq('id', employee.id)
        .single()

      if (hrData) {
        const hrProfile = (hrData as Record<string, unknown>).profiles as { full_name: string; email: string } | null
        if (hrProfile) {
          await supabase.functions.invoke('send-docs-received', {
            body: {
              hrEmail: hrProfile.email,
              hrName: hrProfile.full_name,
              employeeName: employee.full_name,
              employeeId: employee.id,
              appUrl: window.location.origin,
            },
          })
        }
      }

      setSubmitted(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed. Please try again.')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#063840]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 bg-red-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <img src="/relynt_logo.svg" alt="Relynt" className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-semibold text-foreground mb-2">Invalid Link</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-border p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-[#34C270]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-[#34C270]" />
          </div>
          <h1 className="text-xl font-bold text-foreground mb-2">Documents Submitted!</h1>
          <p className="text-sm text-muted-foreground">
            Your documents have been submitted successfully. We'll notify you once the verification is complete.
          </p>
          <div className="mt-6 p-4 bg-muted/40 rounded-lg text-xs text-muted-foreground">
            Expected completion: <strong>3-5 business days</strong>
          </div>
        </div>
      </div>
    )
  }

  if (!employee) return null

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header */}
      <div className="bg-[#063840] text-white py-5 px-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <img src="/relynt_logo.svg" alt="Relynt" className="w-8 h-8 rounded-lg" />
          <div>
            <div className="font-semibold text-base">Background Verification</div>
            <div className="text-[#6FC2CB]/80 text-xs">Secure · Confidential · relynt</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground">Hi, {employee.full_name.split(' ')[0]}!</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Please complete the background verification by uploading the required documents.
          </p>
        </div>

        {/* Progress bar */}
        {currentStep >= 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex-1 flex flex-col items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i < currentStep ? 'bg-[#34C270] text-white'
                  : i === currentStep ? 'bg-[#063840] text-white'
                  : 'bg-muted text-muted-foreground'
                }`}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                <div className={`text-xs mt-1 hidden sm:block ${i === currentStep ? 'text-[#063840] font-medium' : 'text-muted-foreground'}`}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
          <div className="h-1 bg-muted rounded-full">
            <div
              className="h-1 bg-[#063840] rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
        )}

        {currentStep < 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
          <div>
            <div className="text-xs font-medium text-[#6FC2CB] uppercase tracking-wider mb-1">
              Consent Required
            </div>
            <h2 className="text-lg font-semibold text-foreground">Data collection & purpose</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Before uploading any documents, please review what we capture and why.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#063840]" />
                <h3 className="text-sm font-semibold text-foreground">Data we will capture</h3>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
                <li>
                  <span className="font-medium text-foreground">Identity documents</span> — copies of your
                  PAN card and Aadhaar card
                </li>
                <li>
                  <span className="font-medium text-foreground">Contact & address details</span> — your
                  name, email, phone number, and permanent address
                </li>
                <li>
                  <span className="font-medium text-foreground">Employment & education records</span> —
                  your experience letter and education certificate
                </li>
                <li>
                  <span className="font-medium text-foreground">Uploaded files</span> — the documents you
                  submit, stored exactly as provided
                </li>
              </ul>
            </div>

            <div className="border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-foreground">Why we capture it</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Solely to complete your background verification — confirming your identity, court records,
                address, employment history, and education qualifications. Your data is encrypted, visible
                only to authorized verification personnel, and is not used for any other purpose.
              </p>
            </div>
          </div>

          <label htmlFor="consent" className="flex items-start gap-3 cursor-pointer">
            <input
              id="consent"
              type="checkbox"
              checked={consented}
              onChange={e => setConsented(e.target.checked)}
              className="size-4 accent-primary cursor-pointer mt-0.5"
            />
            <span className="text-sm text-foreground">I consent and proceed</span>
          </label>

          <div className="flex items-center justify-end pt-2">
            <Button onClick={() => setCurrentStep(0)} disabled={!consented}>
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
        ) : (
        <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-5">
          <div>
            <div className="text-xs font-medium text-[#6FC2CB] uppercase tracking-wider mb-1">
              Step {currentStep + 1} of {STEPS.length}
            </div>
            <h2 className="text-lg font-semibold text-foreground">{currentStepData.title}</h2>
          </div>

          <DocumentUploader
            label={currentStepData.title}
            description={currentStepData.description}
            acceptImages={currentStepData.acceptImages}
            acceptPdf={currentStepData.acceptPdf}
            value={files[currentStepData.docType]}
            onChange={file => setFiles(prev => ({ ...prev, [currentStepData.docType]: file }))}
          />

          {currentStepData.hasAddress && (
            <div className="space-y-1.5">
              <Label>Permanent Address</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#063840]"
                placeholder="Enter your complete permanent address..."
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(s => s - 1)}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button onClick={() => setCurrentStep(s => s + 1)} disabled={!canProceed()}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleSubmit}
                disabled={!canProceed() || uploading}
                loading={uploading}
              >
                Submit Documents
              </Button>
            )}
          </div>
        </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-4">
          Your documents are encrypted and stored securely. Only authorized personnel can access them.
        </p>
      </div>
    </div>
  )
}
