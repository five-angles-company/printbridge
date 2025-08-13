import { useForm } from '@tanstack/react-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Switch } from '../ui/switch'
import { Button } from '../ui/button'
import { DialogClose } from '../ui/dialog'
import { useMutation } from '@tanstack/react-query'
import { invokeIpc } from '@renderer/lib/utils'
import queryClient from '@renderer/lib/query-client'

interface ReceiptSettingsProps {
  settings: Record<string, any>
  printerId: number
  handleOpen: (open: boolean) => void
}

function ReceiptSettings({ settings, printerId, handleOpen }: ReceiptSettingsProps) {
  console.log(settings)

  const updateSettings = useMutation({
    mutationFn: (payload: { printerId: number; settings: Record<string, any> }) =>
      invokeIpc('printers:update-settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] })
      handleOpen(false)
    }
  })

  const form = useForm({
    defaultValues: {
      paper_size: settings?.paper_size || '',
      print_density: settings?.print_density || '',
      print_speed: settings?.print_speed || '',
      cut: settings?.cut || false,
      beep: settings?.beep || false
    },
    onSubmit: async ({ value }) => {
      await updateSettings.mutateAsync({ printerId, settings: value })
    }
  })

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          e.stopPropagation()
          form.handleSubmit()
        }}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">General Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="paper_size"
                children={(field) => {
                  console.log(field.state.value)
                  return (
                    <div className="space-y-2">
                      <label htmlFor={field.name}>Paper size:</label>
                      <Select
                        value={field.state.value}
                        onValueChange={(value) => field.handleChange(value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select size" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="58">58mm</SelectItem>
                          <SelectItem value="72">72mm</SelectItem>
                          <SelectItem value="80">80mm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Print Settings</h4>
            <div className="grid grid-cols-2 gap-4">
              <form.Field
                name="print_density"
                children={(field) => (
                  <div className="space-y-2">
                    <label htmlFor={field.name}>Print Density</label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select density" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Light</SelectItem>
                        <SelectItem value="3">Medium Light</SelectItem>
                        <SelectItem value="6">Medium</SelectItem>
                        <SelectItem value="9">Medium Dark</SelectItem>
                        <SelectItem value="12">Dark</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />

              <form.Field
                name="print_speed"
                children={(field) => (
                  <div className="space-y-2">
                    <label htmlFor={field.name}>Print Speed</label>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => field.handleChange(value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select speed" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Slow</SelectItem>
                        <SelectItem value="1">Normal</SelectItem>
                        <SelectItem value="2">Fast</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              />
            </div>

            <form.Field
              name="cut"
              children={(field) => (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-slate-700">Auto Cut</label>
                    <p className="text-xs text-slate-500">Automatically cut paper after printing</p>
                  </div>
                  <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                </div>
              )}
            />

            <form.Field
              name="beep"
              children={(field) => (
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <label className="text-sm font-medium text-slate-700">Auto Beep</label>
                    <p className="text-xs text-slate-500">Automatically beep after printing</p>
                  </div>
                  <Switch checked={field.state.value} onCheckedChange={field.handleChange} />
                </div>
              )}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button
            type="submit"
            className="bg-teal-600 hover:bg-teal-700"
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default ReceiptSettings
