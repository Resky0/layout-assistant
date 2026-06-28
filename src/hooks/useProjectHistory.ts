import { useCallback, useState } from 'react'
import type { FigureProjectV1 } from '../types'
import { touchProject } from '../lib/project'

interface HistoryState {
  past: FigureProjectV1[]
  present: FigureProjectV1
  future: FigureProjectV1[]
}

const HISTORY_LIMIT = 50

export function useProjectHistory(initialProject: FigureProjectV1) {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialProject,
    future: [],
  })

  const commit = useCallback(
    (updater: (project: FigureProjectV1) => FigureProjectV1) => {
      setHistory((current) => {
        const next = touchProject(updater(current.present))
        if (next === current.present) return current
        return {
          past: [...current.past, current.present].slice(-HISTORY_LIMIT),
          present: next,
          future: [],
        }
      })
    },
    [],
  )

  const replace = useCallback((project: FigureProjectV1) => {
    setHistory({ past: [], present: project, future: [] })
  }, [])

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1)
      if (!previous) return current
      return {
        past: current.past.slice(0, -1),
        present: touchProject(previous),
        future: [current.present, ...current.future].slice(0, HISTORY_LIMIT),
      }
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((current) => {
      const [next, ...remaining] = current.future
      if (!next) return current
      return {
        past: [...current.past, current.present].slice(-HISTORY_LIMIT),
        present: touchProject(next),
        future: remaining,
      }
    })
  }, [])

  return {
    project: history.present,
    commit,
    replace,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  }
}
