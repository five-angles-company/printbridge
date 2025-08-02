import { Printer, Wifi, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'

function Header() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    window.electron.on('api:connected', () => {
      setIsConnected(true)
    })
    window.electron.on('api:disconnected', () => {
      setIsConnected(false)
    })

    return () => {
      window.electron.off('api:connected', () => {})
      window.electron.off('api:disconnected', () => {})
    }
  }, [])
  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-sm">
            <Printer className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Printer Bridge</h1>
            <p className="text-sm text-slate-500">Pharmacy Print Management</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}
          >
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
