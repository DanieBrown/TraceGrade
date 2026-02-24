import api from '../../lib/api'
import type { ApiResponse } from '../../lib/apiTypes'
import type {
  GradebookCell,
  GradebookClassOption,
  GradebookColumn,
  GradebookStudentRow,
  GradebookViewModel,
  RawGradebookCell,
  RawGradebookClassOption,
  RawGradebookColumn,
  RawGradebookPayload,
  RawGradebookStudentRow,
} from './gradesTypes'

const CLASSES_ENDPOINT = '/classes'
const GRADEBOOK_ENDPOINT_SUFFIX = '/gradebook'
const DEFAULT_CLASS_LABEL = 'Untitled Class'
const DEFAULT_COLUMN_LABEL = 'Untitled Column'
const DEFAULT_STUDENT_NAME = 'Unnamed Student'
const MISSING_GRADE_DISPLAY = '—'
const DECIMAL_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/

export class NonRetryableGradesError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NonRetryableGradesError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toTrimmedString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  return normalized.length > 0 ? normalized : null
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim()
  if (normalized.length === 0 || !DECIMAL_NUMBER_PATTERN.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function toDisplayScore(value: number | null): string {
  if (value === null) {
    return MISSING_GRADE_DISPLAY
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '')
}

function extractListFromRecord(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const maybeArray = record[key]
    if (Array.isArray(maybeArray)) {
      return maybeArray
    }
  }

  const data = record.data
  if (Array.isArray(data)) {
    return data
  }

  if (!isRecord(data)) {
    return []
  }

  for (const key of keys) {
    const maybeArray = data[key]
    if (Array.isArray(maybeArray)) {
      return maybeArray
    }
  }

  return []
}

function extractClasses(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (!isRecord(payload)) {
    return []
  }

  return extractListFromRecord(payload, ['items', 'classes', 'content'])
}

function toClassOption(raw: unknown): GradebookClassOption | null {
  if (!isRecord(raw)) {
    return null
  }

  const rawClass = raw as RawGradebookClassOption
  const id =
    toTrimmedString(rawClass.id) ??
    toTrimmedString(rawClass.classId) ??
    toTrimmedString(rawClass.value)

  if (!id) {
    return null
  }

  const label =
    toTrimmedString(rawClass.label) ??
    toTrimmedString(rawClass.classLabel) ??
    toTrimmedString(rawClass.name) ??
    toTrimmedString(rawClass.title) ??
    toTrimmedString(rawClass.className) ??
    DEFAULT_CLASS_LABEL

  return { id, label }
}

function extractGradebookRecord(payload: unknown): Record<string, unknown> | null {
  if (!isRecord(payload)) {
    return null
  }

  if (Array.isArray(payload.rows) || Array.isArray(payload.columns) || Array.isArray(payload.students)) {
    return payload
  }

  const directData = payload.data
  if (!isRecord(directData)) {
    return payload
  }

  return directData
}

function toGradebookColumn(raw: unknown, index: number): GradebookColumn {
  if (!isRecord(raw)) {
    return {
      id: `column-${index + 1}`,
      label: `${DEFAULT_COLUMN_LABEL} ${index + 1}`,
      categoryLabel: null,
      maxPoints: null,
    }
  }

  const rawColumn = raw as RawGradebookColumn
  const id =
    toTrimmedString(rawColumn.id) ??
    toTrimmedString(rawColumn.columnId) ??
    toTrimmedString(rawColumn.assignmentId) ??
    toTrimmedString(rawColumn.categoryId) ??
    `column-${index + 1}`

  const label =
    toTrimmedString(rawColumn.label) ??
    toTrimmedString(rawColumn.title) ??
    toTrimmedString(rawColumn.name) ??
    toTrimmedString(rawColumn.assignmentLabel) ??
    toTrimmedString(rawColumn.assignmentName) ??
    `${DEFAULT_COLUMN_LABEL} ${index + 1}`

  const categoryLabel =
    toTrimmedString(rawColumn.categoryLabel) ??
    toTrimmedString(rawColumn.categoryName) ??
    toTrimmedString(rawColumn.category) ??
    null

  const maxPoints =
    toNullableNumber(rawColumn.maxPoints) ??
    toNullableNumber(rawColumn.pointsPossible) ??
    toNullableNumber(rawColumn.maxScore) ??
    null

  return {
    id,
    label,
    categoryLabel,
    maxPoints,
  }
}

function toCell(raw: unknown, fallbackColumnId: string): GradebookCell {
  if (!isRecord(raw)) {
    return {
      columnId: fallbackColumnId,
      score: null,
      displayValue: MISSING_GRADE_DISPLAY,
    }
  }

  const rawCell = raw as RawGradebookCell
  const columnId =
    toTrimmedString(rawCell.columnId) ??
    toTrimmedString(rawCell.assignmentId) ??
    toTrimmedString(rawCell.id) ??
    fallbackColumnId

  const score =
    toNullableNumber(rawCell.score) ??
    toNullableNumber(rawCell.value) ??
    toNullableNumber(rawCell.grade) ??
    toNullableNumber(rawCell.percentage)

  return {
    columnId,
    score,
    displayValue: toDisplayScore(score),
  }
}

function toCellMap(rawRow: RawGradebookStudentRow): Map<string, GradebookCell> {
  const cellMap = new Map<string, GradebookCell>()

  const cellList = Array.isArray(rawRow.cells)
    ? rawRow.cells
    : Array.isArray(rawRow.grades)
      ? rawRow.grades
      : []

  for (const rawCell of cellList) {
    const normalizedCell = toCell(rawCell, '')
    if (normalizedCell.columnId) {
      cellMap.set(normalizedCell.columnId, normalizedCell)
    }
  }

  if (isRecord(rawRow.scores)) {
    for (const [columnId, score] of Object.entries(rawRow.scores)) {
      const normalizedColumnId = toTrimmedString(columnId)
      if (!normalizedColumnId) {
        continue
      }

      const parsedScore = toNullableNumber(score)
      cellMap.set(normalizedColumnId, {
        columnId: normalizedColumnId,
        score: parsedScore,
        displayValue: toDisplayScore(parsedScore),
      })
    }
  }

  return cellMap
}

function toStudentName(rawRow: RawGradebookStudentRow): string {
  const explicitName =
    toTrimmedString(rawRow.studentName) ??
    toTrimmedString(rawRow.fullName) ??
    toTrimmedString(rawRow.name)

  if (explicitName) {
    return explicitName
  }

  const firstName = toTrimmedString(rawRow.firstName)
  const lastName = toTrimmedString(rawRow.lastName)
  const combinedName = [firstName, lastName].filter(Boolean).join(' ')

  return combinedName || DEFAULT_STUDENT_NAME
}

function toRow(raw: unknown, index: number, columns: GradebookColumn[]): GradebookStudentRow | null {
  if (!isRecord(raw)) {
    return null
  }

  const rawRow = raw as RawGradebookStudentRow
  const studentId =
    toTrimmedString(rawRow.studentId) ??
    toTrimmedString(rawRow.id) ??
    toTrimmedString(rawRow.userId) ??
    `student-${index + 1}`

  const cellMap = toCellMap(rawRow)
  const cells = columns.map((column) => {
    const existingCell = cellMap.get(column.id)
    if (existingCell) {
      return existingCell
    }

    return {
      columnId: column.id,
      score: null,
      displayValue: MISSING_GRADE_DISPLAY,
    }
  })

  return {
    studentId,
    studentName: toStudentName(rawRow),
    cells,
  }
}

export function toGradebookViewModel(raw: unknown): GradebookViewModel {
  const payload = extractGradebookRecord(raw)

  if (!payload) {
    return {
      classId: '',
      classLabel: DEFAULT_CLASS_LABEL,
      columns: [],
      rows: [],
    }
  }

  const rawPayload = payload as RawGradebookPayload

  const classId = toTrimmedString(rawPayload.classId) ?? ''
  const classLabel =
    toTrimmedString(rawPayload.classLabel) ??
    toTrimmedString(rawPayload.className) ??
    toTrimmedString(rawPayload.name) ??
    toTrimmedString(rawPayload.title) ??
    DEFAULT_CLASS_LABEL

  const rawColumns = extractListFromRecord(payload, ['columns', 'assignments', 'categories', 'headers'])
  const columns = rawColumns.map((rawColumn, index) => toGradebookColumn(rawColumn, index))

  const rawRows = extractListFromRecord(payload, ['rows', 'students', 'entries'])
  const rows = rawRows
    .map((rawRow, index) => toRow(rawRow, index, columns))
    .filter((row): row is GradebookStudentRow => row !== null)

  return {
    classId,
    classLabel,
    columns,
    rows,
  }
}

export async function fetchClassesForGradebook(): Promise<GradebookClassOption[]> {
  const response = await api.get<ApiResponse<unknown> | unknown>(CLASSES_ENDPOINT)
  const rawClasses = extractClasses(response.data)

  return rawClasses
    .map((rawClass) => toClassOption(rawClass))
    .filter((option): option is GradebookClassOption => option !== null)
}

export async function fetchClassGradebook(classId: string): Promise<GradebookViewModel> {
  const normalizedClassId = classId.trim()

  if (!normalizedClassId) {
    throw new NonRetryableGradesError('Grades cannot be loaded because class selection is missing.')
  }

  const endpoint = `${CLASSES_ENDPOINT}/${encodeURIComponent(normalizedClassId)}${GRADEBOOK_ENDPOINT_SUFFIX}`
  const response = await api.get<ApiResponse<unknown> | unknown>(endpoint)
  const normalized = toGradebookViewModel(response.data)

  return {
    ...normalized,
    classId: normalized.classId || normalizedClassId,
  }
}

export function isGradebookEmpty(viewModel: GradebookViewModel): boolean {
  return viewModel.columns.length === 0 || viewModel.rows.length === 0
}

export function getGradesLoadErrorDetails(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof NonRetryableGradesError) {
    return {
      message: error.message,
      retryable: false,
    }
  }

  return {
    message: 'There was a problem connecting to the server.',
    retryable: true,
  }
}
