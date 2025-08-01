import { IpcChannels } from 'src/shared/types/ipc-types'

export {}

declare global {
  interface Window {
    electron: {
      invoke: <T extends keyof IpcChannels>(
        channel: T,
        args: IpcChannels[T]['args']
      ) => Promise<IpcChannels[T]['return']>
      on: (channel: any, callback: (...args: any) => void) => void
      off: (channel: any, callback: (...args: any) => void) => void
    }
  }
}
