import { clsx, type ClassValue } from 'clsx'
import { Barcode, FileText, Receipt, PrinterIcon } from 'lucide-react'
import { IpcChannels } from 'src/shared/types/ipc-types'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function invokeIpc<T extends keyof IpcChannels>(
  channel: T,
  args?: IpcChannels[T]['args']
): Promise<IpcChannels[T]['return']> {
  return window.electron.invoke(channel, args)
}
export function getPrinterIcon(type: string) {
  switch (type) {
    case 'receipt':
      return Receipt
    case 'a4':
      return FileText
    case 'label':
      return Barcode
    default:
      return PrinterIcon
  }
}

export function getStatusColor(online: boolean) {
  if (online) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
  return 'bg-red-100 text-red-700 border-red-200'
}
