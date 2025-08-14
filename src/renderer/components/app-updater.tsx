import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

interface UpdateInfo {
  version: string
  size?: number
  releaseDate?: string
  releaseName?: string
}

function AppUpdater() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isChecking, setIsChecking] = useState(false)
  const [status, setStatus] = useState('Idle')

  useEffect(() => {
    const handleAvailable = (info: UpdateInfo) => {
      setIsChecking(false)
      setUpdateInfo(info)
      setStatus(`Update v${info.version} available`)
    }
    const handleNoUpdate = () => {
      setIsChecking(false)
      setUpdateInfo(null)
      setStatus('App is up to date')
    }
    const handleProgress = (percent: number) => {
      setIsDownloading(true)
      setDownloadProgress(percent)
      setStatus(`Downloading update… ${percent}%`)
    }
    const handleDownloaded = (info: UpdateInfo) => {
      setIsDownloading(false)
      setDownloadProgress(100)
      setUpdateInfo(info)
      setStatus('Update ready to install')
    }

    window.electron.on('update:available', handleAvailable)
    window.electron.on('update:none', handleNoUpdate)
    window.electron.on('update:progress', handleProgress)
    window.electron.on('update:downloaded', handleDownloaded)

    return () => {
      window.electron.off('update:available', handleAvailable)
      window.electron.off('update:none', handleNoUpdate)
      window.electron.off('update:progress', handleProgress)
      window.electron.off('update:downloaded', handleDownloaded)
    }
  }, [])

  const handleCheckUpdate = () => {
    setIsChecking(true)
    setStatus('Checking for updates…')
    window.electron.invoke('update:check', undefined)
  }

  const handleDownloadUpdate = () => {
    if (!updateInfo) return
    setIsDownloading(true)
    setDownloadProgress(0)
    setStatus('Starting download…')
    window.electron.invoke('update:download', undefined)
  }

  const handleInstallUpdate = () => window.electron.invoke('update:install', undefined)

  return (
    <div className="space-y-6 p-4 border rounded-lg shadow-sm bg-white">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-lg">App Updates</h2>
        <Button
          variant="outline"
          onClick={handleCheckUpdate}
          disabled={isChecking || isDownloading}
        >
          {isChecking ? 'Checking…' : 'Check for Updates'}
        </Button>
      </div>

      {/* Status */}
      <Badge className="bg-teal-600">{status}</Badge>

      {/* Actions */}
      {updateInfo && !isDownloading && downloadProgress < 100 && (
        <Button className="bg-teal-600 hover:bg-teal-700 w-full" onClick={handleDownloadUpdate}>
          Download Update (v{updateInfo.version})
        </Button>
      )}

      {/* Progress Bar */}
      {isDownloading && (
        <div className="w-full bg-gray-200 rounded h-6 overflow-hidden">
          <div
            className="bg-teal-600 text-white text-xs flex items-center justify-center h-full"
            style={{ width: `${downloadProgress}%` }}
          >
            {downloadProgress}%
          </div>
        </div>
      )}

      {/* Install Button */}
      {updateInfo && downloadProgress === 100 && !isDownloading && (
        <Button className="bg-green-600 hover:bg-green-700 w-full" onClick={handleInstallUpdate}>
          Install & Restart
        </Button>
      )}
    </div>
  )
}

export default AppUpdater
