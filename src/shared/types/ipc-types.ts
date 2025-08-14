import {
  NewPrinter,
  Printer,
  PrinterWithSettings,
  PrintJobWithPrinter,
  SettingsWithPrinters,
  UpdateSettings
} from './db-types'

export type IpcChannels = {
  'dashboard:get': {
    args: object
    return: {
      stats: {
        totalPrinters: number
        totalJobs: number
        successRate: number
      }
      jobs: PrintJobWithPrinter[]
    }
  }
  'printer:print': {
    args: { printerName: string; data: string }
    return: { success: boolean; jobId: number }
  }

  'app:getVersion': {
    args?: object
    return: string
  }

  'printers:list': {
    args: object
    return: {
      name: string
      description?: string
      isDefault: boolean
    }[]
  }

  'printers:get': {
    args: object
    return: PrinterWithSettings[]
  }

  'printers:status': {
    args: string // printer name
    return: {
      online: boolean
    }
  }

  'printers:create': {
    args: NewPrinter
    return: Printer
  }

  'printers:delete': {
    args: number // printer id
    return: object
  }

  'printers:update-settings': {
    args: {
      printerId: number
      settings: Record<string, any>
    }
    return: object
  }

  'printers:test': {
    args: {
      printerId: number
      type: 'label' | 'receipt' | 'a4'
    }
    return: void
  }

  'settings:get': {
    args: object
    return: {
      settings: SettingsWithPrinters
      printers: Printer[]
    }
  }
  'settings:update': {
    args: UpdateSettings
    return: object
  }
  'update:check': {
    args?: object
    return: void
  }
  'update:download': {
    args?: object
    return: void
  }
  'update:install': {
    args?: object
    return: void
  }
}
