import { Document, Page, Text, View, Image, Link, StyleSheet, Svg, Rect, Defs, Stop, LinearGradient } from '@react-pdf/renderer'
import { DOC_TYPE_LABELS } from '@/lib/types'
import type { Employee, DocType, VerificationStatus } from '@/lib/types'

const logoSrc = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjY1IiBoZWlnaHQ9IjI2NSIgdmlld0JveD0iMCAwIDI2NSAyNjUiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyNjUiIGhlaWdodD0iMjY1IiByeD0iMzUiIGZpbGw9IiM0REM1Q0QiLz4KPHBhdGggZD0iTTEzMC4zMzYgMTMzSDgyLjc5OTRDNzguODE0NyAxMzMgNzYuNDMxIDEzNy40MzMgNzguNjI4NSAxNDAuNzU3TDEzMS41MTcgMjIwLjc1N0MxMzIuNDQzIDIyMi4xNTggMTM0LjAxIDIyMyAxMzUuNjg4IDIyM0gxODQuMTE0QzE4OC4xMTYgMjIzIDE5MC40OTcgMjE4LjUzMiAxODguMjY0IDIxNS4yMTFMMTM0LjQ4NiAxMzUuMjExQzEzMy41NTcgMTMzLjgyOSAxMzIuMDAxIDEzMyAxMzAuMzM2IDEzM1oiIGZpbGw9IiMwMDM5NDEiLz4KPHBhdGggZD0iTTE0Ny41IDEzM0MxNzIuOTA1IDEzMyAxOTMuNSAxMTIuNDA1IDE5My41IDg3QzE5My41IDYxLjU5NDkgMTcyLjkwNSA0MSAxNDcuNSA0MUg4Mi4xODgzQzc4LjIyNjIgNDEgNzUuODM4MiA0NS4zODg0IDc3Ljk4OTggNDguNzE1M0wxMzEuMDIyIDEzMC43MTVDMTMxLjk0NCAxMzIuMTQgMTMzLjUyNCAxMzMgMTM1LjIyMSAxMzNIMTQ3LjVaIiBmaWxsPSIjMDAzOTQxIi8+Cjwvc3ZnPgo='

const C = {
  p: '#003941',
  s: '#4DC5CD',
  ink: '#1c2a2c',
  mute: '#5b6b6e',
  line: '#dce9ea',
  bg: '#f3f9f9',
  clear: '#1c9c5e',
  clearbg: '#e6f7ee',
  disc: '#d64545',
  discbg: '#fdecec',
  gray: '#6b7678',
  graybg: '#eef2f2',
  except: '#2266cc',
  exceptbg: '#e7f0fc',
}

const REG = 'Helvetica'
const BOLD = 'Helvetica-Bold'

const PAGE_W = 595.28
const PAGE_H = 841.89
const CONTENT_W = 515.28

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: REG, backgroundColor: '#ffffff', color: C.ink },
  foot: { position: 'absolute', left: 40, right: 40, bottom: 16, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  footTxt: { fontSize: 7.5, color: C.mute },

  /* inner header */
  hdrtop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { flexDirection: 'row', alignItems: 'center' },
  logoTile: { width: 24, height: 24, borderRadius: 6, overflow: 'hidden', marginRight: 7 },
  logoImg: { width: 24, height: 24 },
  brandName: { fontFamily: BOLD, fontSize: 13, color: C.p },
  iso: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: C.s, alignItems: 'center', justifyContent: 'center' },
  isoTxt: { fontFamily: BOLD, fontSize: 6.5, color: C.p, textAlign: 'center', lineHeight: 1.3 },
  clientRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 },
  company: { fontFamily: BOLD, fontSize: 15, color: C.p, flex: 1, paddingRight: 10 },
  refBox: { alignItems: 'flex-end' },
  refLbl: { fontSize: 7.5, color: C.mute },
  refVal: { fontFamily: BOLD, fontSize: 9.5, color: C.p },
  accent: { height: 4, borderRadius: 2, marginTop: 8, marginBottom: 16 },

  /* cover */
  coverPage: { padding: 0, backgroundColor: '#001f24' },
  coverGrad: { flex: 1, padding: 0 },
  topbar: { flexDirection: 'row', justifyContent: 'flex-end', padding: 20, paddingBottom: 0 },
  topbarTxt: { fontSize: 8, color: 'rgba(255,255,255,0.75)' },
  topbarBrand: { fontFamily: BOLD, fontSize: 8, color: '#ffffff' },
  coverMid: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  monogram: { width: 96, height: 96, borderRadius: 20, backgroundColor: C.s, alignItems: 'center', justifyContent: 'center' },
  monogramTxt: { fontFamily: BOLD, fontSize: 44, color: C.p },
  coverH1: { fontFamily: BOLD, fontSize: 30, color: '#ffffff', textAlign: 'center', marginTop: 18 },
  coverTag: { fontFamily: BOLD, fontSize: 13, color: C.s, textAlign: 'center', marginTop: 3 },
  coverSub: { fontSize: 11, color: '#dff5f6', textAlign: 'center', marginTop: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10, margin: 3 },
  chipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#59e08a', marginRight: 6 },
  chipTxt: { fontSize: 8, color: '#ffffff' },
  coverFoot: { backgroundColor: 'rgba(0,0,0,0.28)', paddingVertical: 12, paddingHorizontal: 30 },
  coverFootTxt: { fontSize: 7.5, color: '#dff5f6', textAlign: 'center', lineHeight: 1.4 },

  /* generic card */
  card: { borderWidth: 1, borderColor: C.line, borderRadius: 10, marginBottom: 12 },
  cardH: { backgroundColor: C.bg, color: C.p, fontFamily: BOLD, fontSize: 9.5, paddingVertical: 8, paddingHorizontal: 12, textAlign: 'center', borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  kvRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 12 },
  kvBrd: { borderTopWidth: 1, borderTopColor: C.line },
  kvKey: { width: '40%', fontSize: 9, color: C.mute },
  kvVal: { flex: 1, fontSize: 9, color: C.ink },
  statusbar: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.bg, paddingVertical: 7, paddingHorizontal: 12, borderTopWidth: 1, borderTopColor: C.line, borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
  statusbarTxt: { fontSize: 8, color: C.mute },

  /* check label */
  checklbl: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 14, marginBottom: 12 },
  checkNum: { fontFamily: BOLD, fontSize: 8, color: C.s },
  checkTitle: { fontFamily: BOLD, fontSize: 14, color: C.p, marginTop: 2 },

  /* pills / badges */
  pill: { borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' },
  pillTxt: { fontFamily: BOLD, fontSize: 7.5 },
  badge: { borderRadius: 10, paddingVertical: 3, paddingHorizontal: 8, alignSelf: 'flex-start' },
  badgeTxt: { fontFamily: BOLD, fontSize: 8 },

  /* summary */
  row2: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  colL: { width: '48%' },
  colR: { width: '48%' },
  candCard: { borderWidth: 1, borderColor: C.line, borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.s, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarTxt: { fontFamily: BOLD, fontSize: 15, color: '#ffffff' },
  candName: { fontFamily: BOLD, fontSize: 13, color: C.p },
  candMeta: { fontSize: 8.5, color: C.mute, marginTop: 2 },
  metaCard: { borderWidth: 1, borderColor: C.line, borderRadius: 10, overflow: 'hidden' },
  metaCardH: { backgroundColor: C.bg, color: C.p, fontFamily: BOLD, fontSize: 9.5, paddingVertical: 8, textAlign: 'center' },
  sectitle: { fontFamily: BOLD, fontSize: 11.5, color: C.p, marginTop: 14, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.line },
  sumGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  sumcard: { width: '48%', borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 8, marginBottom: 8 },
  sumTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sumTitle: { fontFamily: BOLD, fontSize: 9.5, color: C.ink, flex: 1, paddingRight: 6 },
  sumMeta: { fontSize: 8, color: C.mute, marginTop: 4, lineHeight: 1.35 },
  legendRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 5 },
  legendBrd: { borderTopWidth: 1, borderTopColor: C.line },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 9, marginTop: 2 },
  legendTitle: { fontFamily: BOLD, fontSize: 9, color: C.ink },
  legendDesc: { fontSize: 8, color: C.mute, marginTop: 1, lineHeight: 1.35 },

  /* documents */
  docPrev: { backgroundColor: '#fafdfd', borderTopWidth: 1, borderTopColor: C.line, alignItems: 'center' },
  docImgFull: { width: '100%', objectFit: 'contain', backgroundColor: '#fafdfd' },
  pdfBox: { width: '100%', height: 120, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', padding: 12 },
  pdfBoxTitle: { fontFamily: BOLD, fontSize: 10, color: C.ink },
  pdfBoxSub: { fontSize: 8.5, color: C.mute, marginTop: 4, textAlign: 'center' },
  docLinkBar: { backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 8, alignItems: 'center', borderBottomLeftRadius: 9, borderBottomRightRadius: 9 },
  docLinkFull: { fontSize: 9, color: '#2563eb', textAlign: 'center', textDecoration: 'underline' },

  /* disclaimer */
  watermark: { position: 'absolute', top: 340, left: 0, right: 0, textAlign: 'center', fontFamily: BOLD, fontSize: 38, color: 'rgba(0,57,65,0.06)' },
  discP: { fontSize: 9, textAlign: 'justify', marginBottom: 9, lineHeight: 1.45, color: C.ink },
  discNote: { fontSize: 8.5, fontStyle: 'italic', color: C.mute, marginTop: 14 },
})

const HUMAN: Record<VerificationStatus, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  verified: 'Verified',
  failed: 'Failed',
}

const RESULT: Record<VerificationStatus, { text: string; color: string }> = {
  pending: { text: 'Pending', color: C.gray },
  in_progress: { text: 'In Progress', color: C.except },
  verified: { text: 'Matched', color: C.clear },
  failed: { text: 'Discrepancy', color: C.disc },
}

const SEVERITY: Record<VerificationStatus, { text: string; color: string; bg: string }> = {
  pending: { text: 'No Response', color: C.gray, bg: C.graybg },
  in_progress: { text: 'In Progress', color: C.except, bg: C.exceptbg },
  verified: { text: 'Clear', color: C.clear, bg: C.clearbg },
  failed: { text: 'Discrepancy', color: C.disc, bg: C.discbg },
}

interface CheckDef {
  num: number
  title: string
  docs: { docType: DocType; cardTitle: string }[]
}

const CHECKS: CheckDef[] = [
  {
    num: 1,
    title: 'National Identity Check Report',
    docs: [
      { docType: 'pan', cardTitle: 'PAN Verification' },
      { docType: 'aadhaar_court', cardTitle: 'Aadhaar – Court Record Check' },
    ],
  },
  {
    num: 2,
    title: 'Digital Address Verification Report',
    docs: [{ docType: 'aadhaar_address', cardTitle: 'Aadhaar – Address Verification' }],
  },
  {
    num: 3,
    title: 'Employment Check Report',
    docs: [{ docType: 'experience_letter', cardTitle: 'Experience Letter Verification' }],
  },
  {
    num: 4,
    title: 'Education Verification Report',
    docs: [{ docType: 'education_certificate', cardTitle: 'Education Certificate Verification' }],
  },
]

const LEGEND = [
  { color: C.disc, title: 'Discrepancy', desc: 'The information provided does not match the verified details.' },
  { color: '#e08a1e', title: 'Minor Discrepancy', desc: 'There is a small difference, but it does not significantly impact verification.' },
  { color: C.gray, title: 'No Response Received', desc: 'The verification source did not respond to the request.' },
  { color: '#c9a200', title: 'Insufficient Data', desc: 'The provided information is not enough to complete verification.' },
  { color: C.except, title: 'Completed with Exception', desc: 'Verification is mostly clear, but some details remain unknown.' },
  { color: C.clear, title: 'Clear', desc: 'All details have been verified with no issues.' },
  { color: '#6a3fb5', title: 'Inconclusive', desc: 'Contains both clear and discrepant information, making the result uncertain.' },
]

interface ReportVerification {
  docType: DocType
  status: VerificationStatus
  notes: string
  verifiedAt?: string | null
}

interface ReportDocument {
  docType: DocType
  signedUrl: string
  isImage: boolean
}

interface BGVReportProps {
  employee: Employee
  verifications: ReportVerification[]
  documents: ReportDocument[]
  verifiedBy: string
  verdict: 'CLEAR' | 'DISCREPANCY FOUND'
  generatedAt: string
  clientName?: string
  refNo?: string
  caseStart?: string | null
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

const fmtDateTime = (iso: string) => {
  const d = new Date(iso)
  return `${fmtDate(iso)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

function Header({ clientName, refNo }: { clientName: string; refNo: string }) {
  return (
    <View>
      <View style={styles.hdrtop}>
        <View style={styles.brand}>
          <View style={styles.logoTile}>
            <Image src={logoSrc} style={styles.logoImg} />
          </View>
          <Text style={styles.brandName}>Relynt</Text>
        </View>
        <View style={styles.iso}>
          <Text style={styles.isoTxt}>ISO{'\n'}27001{'\n'}CERTIFIED</Text>
        </View>
      </View>
      <View style={styles.clientRow}>
        <Text style={styles.company}>{clientName}</Text>
        <View style={styles.refBox}>
          <Text style={styles.refLbl}>Ref No.</Text>
          <Text style={styles.refVal}>{refNo}</Text>
        </View>
      </View>
      <Svg width={CONTENT_W} height={4} style={styles.accent}>
        <Defs>
          <LinearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
            <Stop stopColor={C.p} offset="0" />
            <Stop stopColor={C.s} offset="1" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={CONTENT_W} height={4} fill="url(#accent)" />
      </Svg>
    </View>
  )
}

function Footer({ clientName, refNo }: { clientName: string; refNo: string }) {
  return (
    <View style={styles.foot} fixed>
      <Text style={styles.footTxt}>For {clientName} / Ref - {refNo}</Text>
    </View>
  )
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillTxt, { color }]}>{label}</Text>
    </View>
  )
}

function KvCard({
  title,
  rows,
  status,
  timestamp,
}: {
  title: string
  rows: { k: string; v: string; color?: string }[]
  status: VerificationStatus
  timestamp: string
}) {
  const sev = SEVERITY[status]
  return (
    <View style={styles.card}>
      <Text style={styles.cardH}>{title}</Text>
      {rows.map((r, i) => (
        <View key={r.k} style={[styles.kvRow, ...(i > 0 ? [styles.kvBrd] : [])]}>
          <Text style={styles.kvKey}>{r.k}</Text>
          <Text style={r.color ? [styles.kvVal, { color: r.color, fontFamily: BOLD }] : styles.kvVal}>{r.v}</Text>
        </View>
      ))}
      <View style={styles.statusbar}>
        <Text style={styles.statusbarTxt}>
          Severity: <Text style={{ fontFamily: BOLD, color: sev.color }}>{sev.text}</Text>
        </Text>
        <Text style={styles.statusbarTxt}>Timestamp: {timestamp}</Text>
      </View>
    </View>
  )
}

export function BGVReport({
  employee,
  verifications,
  documents,
  verifiedBy,
  verdict,
  generatedAt,
  clientName = 'Client Organization',
  refNo = 'SV-00000000',
  caseStart,
}: BGVReportProps) {
  const isClear = verdict === 'CLEAR'
  const getV = (dt: DocType) => verifications.find(v => v.docType === dt)

  const initials = employee.full_name
    .split(/\s+/)
    .map(w => w.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const caseStartDt = caseStart ?? employee.submitted_at ?? generatedAt

  const checkSummary = (check: CheckDef) => {
    const vs = check.docs.map(d => getV(d.docType)).filter(Boolean) as ReportVerification[]
    if (!vs.length) return { pill: 'Pending', pillColor: C.gray, pillBg: C.graybg, sev: 'No Response', sevColor: C.gray }
    if (vs.every(v => v.status === 'verified')) return { pill: 'Completed', pillColor: C.clear, pillBg: C.clearbg, sev: 'Clear', sevColor: C.clear }
    if (vs.some(v => v.status === 'pending' || v.status === 'in_progress')) {
      return { pill: 'In Progress', pillColor: C.except, pillBg: C.exceptbg, sev: 'In Progress', sevColor: C.except }
    }
    return { pill: 'Completed', pillColor: C.disc, pillBg: C.discbg, sev: 'Discrepancy', sevColor: C.disc }
  }

  const presentChecks = CHECKS.filter(c => c.docs.some(d => getV(d.docType)))
  const chips = ['Identity Verified', 'Address Verified', 'Employment Verified', 'Education Verified']

  const docPreview = (doc: ReportDocument) => (
    <View key={`prev-${doc.docType}`} style={styles.card} wrap={false}>
      <Text style={styles.cardH}>Submitted Document — {DOC_TYPE_LABELS[doc.docType]}</Text>
      {doc.isImage ? (
        <View style={styles.docPrev}>
          <Image src={doc.signedUrl} style={styles.docImgFull} />
        </View>
      ) : (
        <View style={styles.docPrev}>
          <View style={styles.pdfBox}>
            <Text style={styles.pdfBoxTitle}>PDF Document</Text>
            <Text style={styles.pdfBoxSub}>Preview not available — open the document using the link below.</Text>
          </View>
        </View>
      )}
      <View style={styles.docLinkBar}>
        <Link src={doc.signedUrl} style={styles.docLinkFull}>View Document</Link>
      </View>
    </View>
  )

  return (
    <Document title={`BGV Report – ${employee.full_name}`} author="Relynt">
      {/* ============ PAGE 1 : COVER ============ */}
      <Page size="A4" style={styles.coverPage}>
        <View style={{ position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H }}>
          <Svg width={PAGE_W} height={PAGE_H}>
            <Defs>
              <LinearGradient id="cover" x1="0" y1="0" x2="1" y2="1">
                <Stop stopColor="#001f24" offset="0" />
                <Stop stopColor={C.p} offset="0.5" />
                <Stop stopColor="#0a5a66" offset="1" />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width={PAGE_W} height={PAGE_H} fill="url(#cover)" />
          </Svg>
        </View>
        <View style={styles.coverGrad}>
          <View style={styles.topbar}>
            <Text style={styles.topbarTxt}>Powered By <Text style={styles.topbarBrand}>Relynt</Text></Text>
          </View>
          <View style={styles.coverMid}>
            <View style={styles.monogram}>
              <Text style={styles.monogramTxt}>R</Text>
            </View>
            <Text style={styles.coverH1}>Relynt Verify</Text>
            <Text style={styles.coverTag}>Trust You Can Rely On</Text>
            <Text style={styles.coverSub}>Background Verification Report</Text>
            <View style={styles.chips}>
              {chips.map(c => (
                <View key={c} style={styles.chip}>
                  <View style={styles.chipDot} />
                  <Text style={styles.chipTxt}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
          <View style={styles.coverFoot}>
            <Text style={styles.coverFootTxt}>
              System-generated report for authorized recipients only. This document contains confidential information
              and must be handled in accordance with applicable data protection laws.
            </Text>
          </View>
        </View>
      </Page>

      {/* ============ PAGE 2 : SUMMARY ============ */}
      <Page size="A4" style={styles.page}>
        <Header clientName={clientName} refNo={refNo} />

        <View style={styles.row2}>
          <View style={styles.colL}>
            <View style={styles.candCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.candName}>{employee.full_name}</Text>
                <Text style={styles.candMeta}>{employee.phone ?? employee.email}</Text>
                <View style={[styles.badge, { backgroundColor: C.clearbg, marginTop: 6 }]}>
                  <Text style={[styles.badgeTxt, { color: C.clear }]}>BGV Report</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={styles.colR}>
            <View style={styles.metaCard}>
              <Text style={styles.metaCardH}>Background Verification Report</Text>
              {[
                { k: 'Case Start Date', v: fmtDate(caseStartDt), color: undefined },
                { k: 'Case End Date', v: fmtDate(generatedAt), color: undefined },
                { k: 'Report Severity', v: isClear ? 'Clear' : 'Discrepancy', color: isClear ? C.clear : C.disc },
                { k: 'Report Status', v: 'Completed', color: undefined },
              ].map((r, i) => (
                <View key={r.k} style={[styles.kvRow, ...(i > 0 ? [styles.kvBrd] : [])]}>
                  <Text style={styles.kvKey}>{r.k}</Text>
                  <Text style={r.color ? [styles.kvVal, { color: r.color, fontFamily: BOLD }] : styles.kvVal}>{r.v}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.sectitle}>Executive Summary</Text>
        <View style={styles.sumGrid}>
          {presentChecks.map(check => {
            const s = checkSummary(check)
            return (
              <View key={check.num} style={styles.sumcard} wrap={false}>
                <View style={styles.sumTop}>
                  <Text style={styles.sumTitle}>{check.title}</Text>
                  <Pill label={s.pill} color={s.pillColor} bg={s.pillBg} />
                </View>
                <Text style={styles.sumMeta}>
                  Severity: <Text style={{ fontFamily: BOLD, color: s.sevColor }}>{s.sev}</Text>
                  {'   ·   '}Verified By: {verifiedBy}
                </Text>
              </View>
            )
          })}
        </View>

        <Text style={styles.sectitle}>Severity Representation</Text>
        <View>
          {LEGEND.map((l, i) => (
            <View key={l.title} style={[styles.legendRow, ...(i > 0 ? [styles.legendBrd] : [])]}>
              <View style={[styles.legendDot, { backgroundColor: l.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.legendTitle}>{l.title}</Text>
                <Text style={styles.legendDesc}>{l.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Footer clientName={clientName} refNo={refNo} />
      </Page>

      {/* ============ CHECK PAGES ============ */}
      {presentChecks.map(check => (
        <Page key={check.num} size="A4" style={styles.page}>
          <Header clientName={clientName} refNo={refNo} />
          <View style={styles.checklbl}>
            <Text style={styles.checkNum}>CHECK {check.num}</Text>
            <Text style={styles.checkTitle}>{check.title}</Text>
          </View>

          {check.docs.map(({ docType, cardTitle }) => {
            const v = getV(docType)
            if (!v) return null
            const done = v.status === 'verified' || v.status === 'failed'
            const result = RESULT[v.status]
            return (
              <KvCard
                key={docType}
                title={cardTitle}
                status={v.status}
                timestamp={fmtDateTime(v.verifiedAt ?? generatedAt)}
                rows={[
                  { k: 'Document', v: DOC_TYPE_LABELS[docType] },
                  { k: 'Status', v: HUMAN[v.status], color: result.color },
                  { k: 'Result', v: result.text, color: result.color },
                  { k: 'Remarks', v: v.notes || '—' },
                  { k: 'Verified By', v: done ? verifiedBy : '—' },
                  { k: 'Verified On', v: done && v.verifiedAt ? fmtDate(v.verifiedAt) : '—' },
                ]}
              />
            )
          })}

          {check.docs.map(({ docType }) => {
            const doc = documents.find(d => d.docType === docType)
            return doc ? docPreview(doc) : null
          })}

          <Footer clientName={clientName} refNo={refNo} />
        </Page>
      ))}

      {/* ============ DISCLAIMER ============ */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.watermark}>BGV REPORT</Text>
        <View>
          <Header clientName={clientName} refNo={refNo} />
          <Text style={styles.sectitle}>Disclaimer &amp; Limitations of Research</Text>
          <Text style={styles.discP}>
            The client should take into consideration the following points before making a decision on the basis of
            this report:
          </Text>
          <Text style={styles.discP}>
            The report must be used in accordance with applicable data protection laws. Except where required by law,
            no information provided in this report may be revealed directly or indirectly to any unauthorized third
            party or person.
          </Text>
          <Text style={styles.discP}>
            Relynt does not provide an opinion about the individual or the entity researched, nor should it be
            considered a definitive pronouncement on the subject or as a recommendation. The information provided
            herein shall not be construed to constitute a legal opinion. Final verification of an individual's
            identity and fair use of these consumer reports is the user's responsibility. Client management shall be
            fully and solely responsible for applying independent judgment, concerning the findings provided in this
            report, to make appropriate decisions about the future course of action, if any. Relynt shall not be
            responsible for the employment decision or any other consequences resulting from decisions based on
            information included in this report.
          </Text>
          <Text style={styles.discP}>
            Relynt has simply compiled the information, including public records and/or data, in a structured way for
            the client's review. Although every effort has been made to assure accuracy and exhaustiveness, Relynt
            cannot act as the guarantor of the information's accuracy or completeness.
          </Text>
          <Text style={styles.discP}>
            The records contained in this report are compiled from various databases that are updated at defined,
            undefined, or infrequent intervals, and therefore may or may not have the most current information. The
            desktop search is limited to information available in the public domain in the English language only.
          </Text>
          <Text style={styles.discP}>
            These databases are not owned or updated by Relynt, and therefore Relynt has no control over the
            frequency of their updates. Relynt works with exact and/or partial matches, subject to the constraints of
            identifiable data points on the various databases it uses. The absence of a match does not mean there is
            no litigation or regulatory action involving the entity or the individual.
          </Text>
          <Text style={styles.discP}>
            Where a criminal record check is conducted through online databases, police records or law firms, there is
            a possibility of not finding criminal records in the name of the individual where address verification
            (current, previous or permanent) was either not initiated for any reason — including non-disclosure of an
            address by the candidate — or is discrepant, in which case the individual may never have resided at the
            address.
          </Text>
          <Text style={styles.discNote}>This is a system-generated report; manual signing is not required.</Text>
        </View>
        <Footer clientName={clientName} refNo={refNo} />
      </Page>
    </Document>
  )
}
