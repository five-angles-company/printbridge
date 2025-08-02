import queryClient from '@renderer/lib/query-client'
import { invokeIpc } from '@renderer/lib/utils'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Button } from '../ui/button'
import { Printer, SettingsWithPrinters } from 'src/shared/types/db-types'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface ConnectionSettingsProps {
  settings: SettingsWithPrinters
  printers: Printer[]
}
function PrintersSettings({ settings, printers }: ConnectionSettingsProps) {
  const updateSettings = useMutation({
    mutationFn: (payload: { receiptPrinter: number; labelPrinter: number }) =>
      invokeIpc('settings:update', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    }
  })
  const form = useForm({
    defaultValues: {
      receipt_printer: settings?.receiptPrinter?.id.toString() || '',
      label_printer: settings?.barcodePrinter?.id.toString() || ''
    },
    onSubmit: async ({ value }) => {
      await updateSettings.mutateAsync({
        labelPrinter: parseInt(value.label_printer),
        receiptPrinter: parseInt(value.receipt_printer)
      })
    }
  })

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        e.stopPropagation()
        form.handleSubmit()
      }}
    >
      <div className="space-y-6">
        <form.Field
          name="label_printer"
          children={(field) => {
            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Label Printer</Label>

                <Select
                  onValueChange={(value) => field.handleChange(value)}
                  defaultValue={field.state.value}
                  disabled={!printers.length}
                >
                  <SelectTrigger id="printer-name" className="w-full">
                    <SelectValue placeholder={'Select printer'} />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {printers?.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id.toString()}>
                        {printer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }}
        />
        <form.Field
          name="receipt_printer"
          children={(field) => {
            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Receipt Printer</Label>

                <Select
                  onValueChange={(value) => field.handleChange(value)}
                  defaultValue={field.state.value}
                  disabled={!printers.length}
                >
                  <SelectTrigger id="printer-name" className="w-full">
                    <SelectValue placeholder={'Select printer'} />
                  </SelectTrigger>
                  <SelectContent className="w-full">
                    {printers?.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id.toString()}>
                        {printer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          }}
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700 w-full">
          Save Changes
        </Button>
      </div>
    </form>
  )
}

export default PrintersSettings
