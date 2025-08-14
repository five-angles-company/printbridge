import AppUpdater from '@renderer/components/app-updater'
import ConnectionSettings from '@renderer/components/forms/connection-settings'
import PrintersSettings from '@renderer/components/forms/printers-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import queryClient from '@renderer/lib/query-client'
import { invokeIpc } from '@renderer/lib/utils'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
const settingsQueryOptions = () =>
  queryOptions({
    queryKey: ['settings'],
    queryFn: () => invokeIpc('settings:get')
  })
export const Route = createFileRoute('/settings')({
  loader: () => queryClient.ensureQueryData(settingsQueryOptions()),
  component: RouteComponent
})

function RouteComponent() {
  const { data } = useSuspenseQuery(settingsQueryOptions())
  return (
    <div>
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Settings</h2>
        <p className="text-slate-600">Configure your printer bridge</p>
      </div>
      <div className="space-y-4 mt-4">
        <Card>
          <CardHeader>
            <CardTitle>Connection</CardTitle>
          </CardHeader>
          <CardContent>
            <ConnectionSettings settings={data.settings} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Printers</CardTitle>
          </CardHeader>
          <CardContent>
            <PrintersSettings settings={data.settings} printers={data.printers} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>App Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <AppUpdater />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
