import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, expect, it } from 'vitest'

import { StatusSection } from '@/components/chat/status-section'
import { $paneStates } from '@/store/panes'
import { $todosBySession, clearSessionTodos, restoreSessionTodosFromSnapshot } from '@/store/todos'

import { QueuePanel } from '../queue-panel'

import { ComposerStatusStack } from './index'

const noop = () => {}

const queue = (
  <QueuePanel
    busy
    editingId={null}
    entries={[{ attachments: [], id: 'queued', queuedAt: 1, text: 'Queued request' }]}
    onDelete={noop}
    onEdit={noop}
    onResume={noop}
    onSendNow={noop}
    parked={false}
  />
)

const stack = () => (
  <MemoryRouter>
    <ComposerStatusStack queue={queue} sessionId="owner" />
  </MemoryRouter>
)

afterEach(() => {
  cleanup()
  $paneStates.set({})
  $todosBySession.set({})
  clearSessionTodos('owner')
})

it('keeps a collapsed todos group collapsed after the section remounts', () => {
  $todosBySession.set({ owner: [{ id: 'todo', content: 'Visible todo', status: 'in_progress' }] })

  const first = render(stack())
  expect(screen.getByText('Visible todo')).toBeTruthy()

  fireEvent.click(screen.getByRole('button', { name: /Tasks 0\/1/ }))
  expect(screen.getByRole('button', { name: /Tasks 0\/1/ }).getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByText('Visible todo')).toBeNull()

  first.unmount()
  render(stack())

  expect(screen.getByRole('button', { name: /Tasks 0\/1/ }).getAttribute('aria-expanded')).toBe('false')
  expect(screen.queryByText('Visible todo')).toBeNull()
})

it('lets an explicit expand of the retained list outrank its collapsed default after a remount', () => {
  restoreSessionTodosFromSnapshot(
    'owner',
    {
      revision: 3,
      todos: [
        { id: 'one', content: 'Already done', status: 'completed' },
        { id: 'two', content: 'Still open', status: 'in_progress' }
      ]
    },
    false
  )

  const first = render(stack())
  const header = () => screen.getByRole('button', { name: /Previous tasks 1\/2/ })
  expect(header().getAttribute('aria-expanded')).toBe('false')

  fireEvent.click(header())
  expect(screen.getByText('Already done')).toBeTruthy()

  first.unmount()
  render(stack())

  expect(header().getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByText('Already done')).toBeTruthy()
})

it('starts from the defaults while the user has never toggled anything', () => {
  $todosBySession.set({ owner: [{ id: 'todo', content: 'Visible todo', status: 'in_progress' }] })
  render(stack())

  expect(screen.getByRole('button', { name: /Tasks 0\/1/ }).getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByText('Visible todo')).toBeTruthy()
})

it('persists nothing for a section rendered without a persistKey', () => {
  const bare = () => (
    <StatusSection defaultCollapsed={false} label="Bare section">
      <span>Bare body</span>
    </StatusSection>
  )

  const first = render(bare())
  expect(screen.getByRole('button', { name: /Bare section/ }).getAttribute('aria-expanded')).toBe('true')

  fireEvent.click(screen.getByRole('button', { name: /Bare section/ }))
  expect(screen.queryByText('Bare body')).toBeNull()

  first.unmount()
  render(bare())

  // Unkeyed sections keep the historical behaviour: a remount re-seeds the default.
  expect(screen.getByRole('button', { name: /Bare section/ }).getAttribute('aria-expanded')).toBe('true')
  expect(screen.getByText('Bare body')).toBeTruthy()
})
