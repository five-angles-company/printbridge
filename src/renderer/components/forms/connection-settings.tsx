import queryClient from '@renderer/lib/query-client'
import { invokeIpc } from '@renderer/lib/utils'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { SettingsWithPrinters } from 'src/shared/types/db-types'
import { Label } from '../ui/label'

interface ConnectionSettingsProps {
  settings: SettingsWithPrinters
}
function ConnectionSettings({ settings }: ConnectionSettingsProps) {
  const updateSettings = useMutation({
    mutationFn: (payload: { appKey: string; serverUrl: string }) =>
      invokeIpc('settings:update', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    }
  })
  const form = useForm({
    defaultValues: {
      server_url: settings?.serverUrl || '',
      app_key: settings?.apiKey || ''
    },
    onSubmit: async ({ value }) => {
      await updateSettings.mutateAsync({ appKey: value.app_key, serverUrl: value.server_url })
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
          name="app_key"
          children={(field) => {
            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Api Key</Label>
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
          name="server_url"
          children={(field) => {
            return (
              <div className="space-y-2">
                <Label htmlFor={field.name}>Server Url</Label>
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
      <div className="flex items-center justify-end gap-2 pt-4">
        <Button type="submit" className="bg-teal-600 hover:bg-teal-700 w-full">
          Save Changes
        </Button>
      </div>
    </form>
  )
}

export default ConnectionSettings
