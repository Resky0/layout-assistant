import { openDB } from 'idb'
import type { FigureProjectV1, StoredFigureProjectV1 } from '../types'
import { fromStoredProject, toStoredProject } from './project'

const DATABASE_NAME = 'layout-assistant'
const STORE_NAME = 'projects'
const ACTIVE_KEY = 'active-project'

async function getDatabase() {
  return openDB(DATABASE_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME)
      }
    },
  })
}

export async function saveActiveProject(project: FigureProjectV1) {
  const database = await getDatabase()
  await database.put(STORE_NAME, toStoredProject(project), ACTIVE_KEY)
}

export async function loadActiveProject(): Promise<FigureProjectV1 | null> {
  const database = await getDatabase()
  const stored = await database.get(
    STORE_NAME,
    ACTIVE_KEY,
  ) as StoredFigureProjectV1 | undefined
  if (!stored || stored.schemaVersion !== 1) return null
  return fromStoredProject(stored)
}

export async function clearActiveProject() {
  const database = await getDatabase()
  await database.delete(STORE_NAME, ACTIVE_KEY)
}
