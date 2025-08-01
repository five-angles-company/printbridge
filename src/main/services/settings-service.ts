import { EventEmitter } from 'events'
import { eq } from 'drizzle-orm'
import { db } from '../../db'
import { settings } from '../../db/schema'
import { LoggerService } from './logger-service'
import { NewSettings } from '../../shared/types/db-types'
import { getMachineClientId } from '../utils/machine-client-id'

export class SettingsService extends EventEmitter {
  private isInitialized = false

  constructor(private readonly logger: LoggerService) {
    super()
  }

  /**
   * Initialize settings. Creates default if none exist.
   */
  async initialize(): Promise<void> {
    try {
      const current = await this.loadSettings()

      if (!current) {
        const clientId = getMachineClientId() // or use full UUID
        this.logger.warn(`No settings found. Creating defaults with clientId: ${clientId}`)

        await this.createSettings({
          serverUrl: 'https://example.com',
          apiKey: 'default-api-key',
          clientId,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      } else {
        this.logger.info('Settings loaded successfully.')
      }

      this.isInitialized = true
    } catch (error) {
      this.logger.error('Failed to initialize settings:', error)
      throw error
    }
  }

  async stop(): Promise<void> {
    this.isInitialized = false
    this.logger.info('Settings service stopped.')
  }

  async loadSettings() {
    return await db.query.settings.findFirst({
      with: {
        barcodePrinter: true,
        receiptPrinter: true,
        regularPrinter: true
      }
    })
  }

  async createSettings(data: NewSettings): Promise<void> {
    const now = Date.now()
    const existing = await db.select().from(settings).limit(1).get()

    if (existing) {
      await this.updateSettings(data)
    } else {
      await db.insert(settings).values({
        ...data,
        createdAt: now,
        updatedAt: now
      })

      this.logger.info('Settings created.')
      this.emit('settings:created')
    }
  }

  async updateSettings(data: NewSettings): Promise<void> {
    const now = Date.now()
    const existing = await db.select().from(settings).limit(1).get()

    if (!existing) {
      throw new Error('No settings exist to update.')
    }

    await db
      .update(settings)
      .set({ ...data, updatedAt: now })
      .where(eq(settings.id, existing.id))

    this.logger.info('Settings updated.')
    this.emit('settings:updated')
  }

  get initialized(): boolean {
    return this.isInitialized
  }
}
