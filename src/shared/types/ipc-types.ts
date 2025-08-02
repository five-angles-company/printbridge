import {
  NewPrinter,
  Printer,
  PrinterWithSettings,
  SettingsWithPrinters,
  UpdateSettings
} from './db-types'

export type IpcChannels = {
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

  'printers:print-html': {
    args: {
      printerName: string
      html?: string
    }
    return: object
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
}
