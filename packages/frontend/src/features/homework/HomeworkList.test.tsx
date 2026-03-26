import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import HomeworkList from './HomeworkList'

describe('HomeworkList', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders date-only due dates without timezone drift', () => {
    render(
      <HomeworkList
        items={[
          {
            id: 'homework-1',
            title: 'Chapter Review',
            classId: 'class-1',
            className: 'Algebra II',
            dueDate: '2026-03-30',
            statusLabel: 'Published',
          },
        ]}
      />,
    )

    expect(screen.getByText('Algebra II · Due Mar 30, 2026')).toBeInTheDocument()
  })
})