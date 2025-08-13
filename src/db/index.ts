import { app } from 'electron'
import path from 'path'
import fs from 'fs'
import * as schema from './schema'
import { drizzle } from 'drizzle-orm/libsql'
import { createClient } from '@libsql/client'

const userDataPath = app.getPath('userData')
const dbPath = path.join(userDataPath, 'sqlite.db')

const seedDbPath = path.join(__dirname, '../../resources', 'seed.db')
if (!fs.existsSync(dbPath)) {
  if (!fs.existsSync(seedDbPath)) {
    throw new Error('Seed DB not found!')
  }
  fs.copyFileSync(seedDbPath, dbPath)
}

const client = createClient({
  url: `file:${dbPath}`
})

export const db = drizzle({ client, schema })
