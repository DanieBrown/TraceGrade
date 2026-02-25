export interface HomeworkListItem {
  id: string
  title: string
  dueDate: string | null
  statusLabel: string
  classId: string
  className: string
}

export interface RawHomeworkItem {
  id?: string | null
  homeworkId?: string | null
  title?: string | null
  name?: string | null
  dueDate?: string | null
  due_date?: string | null
  status?: string | null
  label?: string | null
  classId?: string | null
  class_id?: string | null
  className?: string | null
  class_name?: string | null
}
