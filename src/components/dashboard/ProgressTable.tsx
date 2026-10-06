import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, FileText, Mail } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusBadge } from './StatusBadge'
import { formatDate } from '@/lib/utils'
import type { Employee } from '@/lib/types'

interface ProgressTableProps {
  employees: (Employee & { progress: number })[]
  loading?: boolean
  selectable?: boolean
  selectedIds?: string[]
  onToggleSelect?: (employee: Employee) => void
  onToggleAll?: () => void
  onResendInvite?: (employee: Employee) => void
  onInitiateBgv?: (employee: Employee) => void
}

function SelectAllCheckbox({ checked, indeterminate, onChange }: {
  checked: boolean
  indeterminate: boolean
  onChange: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      role="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label="Select all employees"
      className="size-4 accent-primary cursor-pointer"
    />
  )
}

export function ProgressTable({
  employees,
  loading,
  selectable,
  selectedIds = [],
  onToggleSelect,
  onToggleAll,
  onResendInvite,
  onInitiateBgv,
}: ProgressTableProps) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (!employees.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg font-medium">No employees yet</p>
        <p className="text-sm mt-1">Add employees to start background verification</p>
      </div>
    )
  }

  const selectableEmployees = selectable ? employees.filter(e => e.status === 'pending_initiation') : []
  const allSelected = selectableEmployees.length > 0 &&
    selectableEmployees.every(e => selectedIds.includes(e.id))
  const someSelected = selectableEmployees.some(e => selectedIds.includes(e.id))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {selectable && (
            <TableHead className="w-10">
              <SelectAllCheckbox
                checked={allSelected}
                indeterminate={!allSelected && someSelected}
                onChange={() => onToggleAll?.()}
              />
            </TableHead>
          )}
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-36">Progress</TableHead>
          <TableHead>Added</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map(employee => (
          <TableRow key={employee.id}>
            {selectable && (
              <TableCell className="w-10">
                {employee.status === 'pending_initiation' ? (
                  <input
                    type="checkbox"
                    role="checkbox"
                    checked={selectedIds.includes(employee.id)}
                    onChange={() => onToggleSelect?.(employee)}
                    aria-label={`Select ${employee.full_name}`}
                    className="size-4 accent-primary cursor-pointer"
                  />
                ) : null}
              </TableCell>
            )}
            <TableCell className="font-medium text-foreground">{employee.full_name}</TableCell>
            <TableCell className="text-muted-foreground text-sm">{employee.email}</TableCell>
            <TableCell>
              <StatusBadge status={employee.status} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Progress value={employee.progress} className="flex-1 h-1.5" />
                <span className="text-xs text-muted-foreground w-8">{employee.progress}%</span>
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">{formatDate(employee.created_at)}</TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-1">
                {employee.status === 'invited' && onResendInvite && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onResendInvite(employee)}
                    title="Resend invite"
                  >
                    <Mail className="w-3.5 h-3.5" />
                  </Button>
                )}
                {employee.status === 'pending_initiation' && onInitiateBgv && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8 text-xs px-3"
                    onClick={() => onInitiateBgv(employee)}
                  >
                    Initiate BGV
                  </Button>
                )}
                {employee.status === 'completed' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    title="View report"
                    onClick={() => navigate(`/hr/employees/${employee.id}`)}
                  >
                    <FileText className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/hr/employees/${employee.id}`)}
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
