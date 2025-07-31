import { contextBridge, ipcRenderer } from 'electron'

// The actual implementation
const api = {
  invoke: (channel: string, args: unknown) => ipcRenderer.invoke(channel, args),
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_, ...args) => callback(...args))
  },

  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  }
}

// Expose to the renderer
contextBridge.exposeInMainWorld('electron', api)
