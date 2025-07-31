import { Barcode, FileText, Receipt, XCircle, PrinterIcon, PrinterCheck } from 'lucide-react'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'
import queryClient from '@renderer/lib/query-client'
import { useMutation } from '@tanstack/react-query'
import { invokeIpc } from '@renderer/lib/utils'
import { PrinterWithSettings } from 'src/shared/db-types'
import PrinterSettings from './printer-settings'

interface PrinterCardProps {
  printer: PrinterWithSettings
}

function PrinterCard({ printer }: PrinterCardProps) {
  const deleteMutation = useMutation({
    mutationFn: (id: number) => invokeIpc('printers:delete', id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] })
    },
    onError: (err) => {
      console.error('Failed to delete printer:', err)
    }
  })

  const getStatusIcon = (online: boolean) => {
    if (online) {
      return <PrinterCheck className="w-4 h-4" />
    } else {
      return <XCircle className="w-4 h-4" />
    }
  }

  const getPrinterIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return <Receipt className="w-4 h-4" />
      case 'a4':
        return <FileText className="w-4 h-4" />
      case 'barcode':
        return <Barcode className="w-4 h-4" />
      default:
        return <PrinterIcon className="w-4 h-4" />
    }
  }

  const getStatusColor = (online: boolean) => {
    if (online) {
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    }
    return 'bg-red-100 text-red-700 border-red-200'
  }

  const handleTestPrinter = () => {
    invokeIpc('printers:print-html', { printerName: printer.name, html: '<h1>Test</h1>' })
  }

  return (
    <Card key={printer.id} className="border-0 shadow-sm bg-white relative group">
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
              {getPrinterIcon(printer.type)}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{printer.name}</h3>
              <p className="text-sm text-slate-500 capitalize">{printer.type} Printer</p>
            </div>
          </div>
          <div
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(
              printer.online
            )}`}
          >
            {getStatusIcon(printer.online)}
            <span className="capitalize">{printer.online ? 'online' : 'offline'}</span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2">
          <Button variant="outline" size="sm" onClick={handleTestPrinter}>
            <PrinterCheck className="w-3 h-3 mr-1" />
            Test
          </Button>
          <PrinterSettings printer={printer} />
        </div>
      </CardContent>

      <XCircle
        className="absolute cursor-pointer -top-2 -right-2 rounded-full p-0 w-6 h-6 fill-destructive stroke-white hidden group-hover:block"
        onClick={() => deleteMutation.mutate(printer.id)}
      />
    </Card>
  )
}

export default PrinterCard
