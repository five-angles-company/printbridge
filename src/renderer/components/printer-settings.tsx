import { Settings } from 'lucide-react'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { PrinterWithSettings } from 'src/shared/db-types'
import ReceiptSettings from './forms/receipt-settings'
import LabelSettings from './forms/label-settings'
import { useState } from 'react'

interface PrinterSettingsProps {
  printer: PrinterWithSettings
}
function PrinterSettings({ printer }: PrinterSettingsProps) {
  const [open, setOpen] = useState(false)
  const renderSettingsForm = () => {
    switch (printer.type) {
      case 'receipt':
        return (
          <ReceiptSettings
            settings={JSON.parse(printer.printerSettings?.settings || '{}')}
            printerId={printer.id}
            handleOpen={(open) => setOpen(open)}
          />
        )
      case 'a4':
        return <div>A4 settings</div>
      case 'label':
        return (
          <LabelSettings
            settings={JSON.parse(printer.printerSettings?.settings || '{}')}
            printerId={printer.id}
            handleOpen={setOpen}
          />
        )
      default:
        return <div>Unknown printer type</div>
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-3 h-3 mr-1" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="min-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>{printer.name} Settings</span>
          </DialogTitle>
        </DialogHeader>

        {renderSettingsForm()}
      </DialogContent>
    </Dialog>
  )
}

export default PrinterSettings
