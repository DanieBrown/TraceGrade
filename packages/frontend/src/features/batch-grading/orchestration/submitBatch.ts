import {
  enqueueSubmissionGrading,
  uploadMappedSubmissions,
} from '../data/batchGradingApi'
import type { BatchFileMapping, BatchTrackingRow, RosterStudent } from '../domain/batchTypes'

const MAX_UPLOAD_CONCURRENCY = 4

interface StudentGroup {
  studentId: string
  mappings: BatchFileMapping[]
}

export interface SubmitBatchInput {
  assignmentId: string
  mappings: BatchFileMapping[]
  roster: RosterStudent[]
}

export interface SubmitBatchResult {
  rows: BatchTrackingRow[]
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

function toStudentGroupMap(mappings: BatchFileMapping[]): Map<string, BatchFileMapping[]> {
  const grouped = new Map<string, BatchFileMapping[]>()

  for (const mapping of mappings) {
    if (!mapping.studentId) {
      continue
    }

    const existing = grouped.get(mapping.studentId) ?? []
    grouped.set(mapping.studentId, [...existing, mapping])
  }

  return grouped
}

function createStudentGroupList(mappings: BatchFileMapping[]): StudentGroup[] {
  return [...toStudentGroupMap(mappings).entries()].map(([studentId, groupedMappings]) => ({
    studentId,
    mappings: groupedMappings,
  }))
}

function createFailedRow(
  mapping: BatchFileMapping,
  studentName: string,
  errorMessage: string,
): BatchTrackingRow {
  return {
    localFileId: mapping.localFileId,
    fileName: mapping.fileName,
    studentId: mapping.studentId ?? '',
    studentName,
    submissionId: null,
    status: 'failed',
    score: null,
    flaggedForReview: false,
    errorMessage,
  }
}

async function mapGroupToRows(
  group: StudentGroup,
  assignmentId: string,
  studentName: string,
): Promise<BatchTrackingRow[]> {
  const files = group.mappings
    .map((mapping) => mapping.file)
    .filter((file): file is File => file instanceof File)

  if (files.length !== group.mappings.length) {
    return group.mappings.map((mapping) =>
      createFailedRow(mapping, studentName, 'Unable to submit: original file is no longer available.'),
    )
  }

  try {
    const createdSubmissions = await uploadMappedSubmissions(assignmentId, group.studentId, files)
    const rows: BatchTrackingRow[] = []

    for (let index = 0; index < group.mappings.length; index += 1) {
      const mapping = group.mappings[index]
      const createdSubmission = createdSubmissions[index]

      if (!createdSubmission) {
        rows.push(
          createFailedRow(
            mapping,
            studentName,
            'Upload completed with missing response data for this file.',
          ),
        )
        continue
      }

      try {
        await enqueueSubmissionGrading(createdSubmission.submissionId)
        rows.push({
          localFileId: mapping.localFileId,
          fileName: mapping.fileName,
          studentId: group.studentId,
          studentName,
          submissionId: createdSubmission.submissionId,
          status: 'queued',
          score: null,
          flaggedForReview: false,
          errorMessage: null,
        })
      } catch (error) {
        rows.push(
          createFailedRow(
            mapping,
            studentName,
            toErrorMessage(error, 'Failed to enqueue grading for this submission.'),
          ),
        )
      }
    }

    return rows
  } catch (error) {
    const message = toErrorMessage(error, 'Failed to upload mapped files for this student.')
    return group.mappings.map((mapping) => createFailedRow(mapping, studentName, message))
  }
}

async function runWithConcurrency<TInput, TOutput>(
  input: TInput[],
  concurrency: number,
  worker: (value: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results: TOutput[] = []

  let nextIndex = 0
  const workerCount = Math.min(Math.max(concurrency, 1), input.length)

  const runners = Array.from({ length: workerCount }, async () => {
    while (nextIndex < input.length) {
      const currentIndex = nextIndex
      nextIndex += 1

      const result = await worker(input[currentIndex])
      results[currentIndex] = result
    }
  })

  await Promise.all(runners)
  return results
}

export async function submitBatch(input: SubmitBatchInput): Promise<SubmitBatchResult> {
  const rosterById = new Map(input.roster.map((student) => [student.id, student]))
  const groups = createStudentGroupList(input.mappings)

  if (groups.length === 0) {
    return { rows: [] }
  }

  const groupedRows = await runWithConcurrency(groups, MAX_UPLOAD_CONCURRENCY, (group) =>
    mapGroupToRows(
      group,
      input.assignmentId,
      rosterById.get(group.studentId)?.fullName ?? 'Unknown student',
    ),
  )

  return {
    rows: groupedRows.flat(),
  }
}
