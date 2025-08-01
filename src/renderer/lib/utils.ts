import { clsx, type ClassValue } from 'clsx'
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
