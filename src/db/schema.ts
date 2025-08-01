import { sqliteTable, integer, text, real } from 'drizzle-orm/sqlite-core'
import { relations } from 'drizzle-orm'

export const printers = sqliteTable('printers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  online: integer('online', { mode: 'boolean' }).notNull().default(false),
  type: text('type', { enum: ['receipt', 'a4', 'label'] }).notNull()
})

export const printerSettings = sqliteTable('printer_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  printerId: integer('printer_id')
    .references(() => printers.id, { onDelete: 'cascade' })
    .unique() // one settings record per printer
    .notNull(),
  settings: text('settings').notNull() // stored as a JSON object
})

export const printJobs = sqliteTable('print_jobs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  printerId: integer('printer_id')
    .references(() => printers.id, { onDelete: 'restrict' })
    .notNull(),
  name: text('name').notNull(),
  type: text('type', { enum: ['receipt', 'a4', 'label'] }).notNull(),
  status: text('status', { enum: ['pending', 'completed', 'failed'] })
    .notNull()
    .default('pending'),
  createdAt: real('created_at').notNull(),
  completedAt: real('completed_at'),
  data: text('data').default('{}'),
  error: text('error')
})

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  barcodePrinter: integer('barcode_printer_id').references(() => printers.id, {
    onDelete: 'restrict'
  }),
  receiptPrinter: integer('receipt_printer_id').references(() => printers.id, {
    onDelete: 'restrict'
  }),
  regularPrinter: integer('regular_printer_id').references(() => printers.id, {
    onDelete: 'restrict'
  }),
  serverUrl: text('server_url').notNull(),
  apiKey: text('api_key').notNull(),
  clientId: text('client_id').notNull(),
  createdAt: real('created_at').notNull(),
  updatedAt: real('updated_at').notNull()
})

export const printersRelations = relations(printers, ({ many, one }) => ({
  printJobs: many(printJobs),
  printerSettings: one(printerSettings)
}))

export const printerSettingsRelations = relations(printerSettings, ({ one }) => ({
  printer: one(printers, {
    fields: [printerSettings.printerId],
    references: [printers.id]
  })
}))

export const printJobsRelations = relations(printJobs, ({ one }) => ({
  printer: one(printers, {
    fields: [printJobs.printerId],
    references: [printers.id]
  })
}))

export const settingsRelations = relations(settings, ({ one }) => ({
  barcodePrinter: one(printers, {
    fields: [settings.barcodePrinter],
    references: [printers.id],
    relationName: 'barcodePrinter'
  }),
  receiptPrinter: one(printers, {
    fields: [settings.receiptPrinter],
    references: [printers.id],
    relationName: 'receiptPrinter'
  }),
  regularPrinter: one(printers, {
    fields: [settings.regularPrinter],
    references: [printers.id],
    relationName: 'regularPrinter'
  })
}))
