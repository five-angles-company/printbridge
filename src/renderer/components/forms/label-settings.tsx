import { useForm } from '@tanstack/react-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Button } from '../ui/button'
import { DialogClose } from '../ui/dialog'
import { Input } from '../ui/input'
import queryClient from '@renderer/lib/query-client'
import { useMutation } from '@tanstack/react-query'
import { invokeIpc } from '@renderer/lib/utils'

interface LabelSettingsProps {
  settings: Record<string, any>
  printerId: number
  handleOpen: (open: boolean) => void
}

function LabelSettings({ settings, printerId, handleOpen }: LabelSettingsProps) {
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
      label_width: settings?.label_width || '',
      label_height: settings?.label_height || '',
      print_density: settings?.print_density || '',
      print_speed: settings?.print_speed || ''
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
                name="label_width"
                children={(field) => {
                  return (
                    <div className="space-y-2">
                      <label htmlFor={field.name}>Label width:</label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                    </div>
                  )
                }}
              />
              <form.Field
                name="label_height"
                children={(field) => {
                  return (
                    <div className="space-y-2">
                      <label htmlFor={field.name}>Label height:</label>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
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
                children={(field) => {
                  return (
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
                  )
                }}
              />
              <form.Field
                name="print_speed"
                children={(field) => {
                  return (
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
                          <SelectItem value="0">slow</SelectItem>
                          <SelectItem value="1">Normal</SelectItem>
                          <SelectItem value="2">Fast</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>

          <Button type="submit" className="bg-teal-600 hover:bg-teal-700">
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  )
}

export default LabelSettings
