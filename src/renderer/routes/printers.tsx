import AddPrinter from '@renderer/components/add-printer'
import PrinterCard from '@renderer/components/printer-card'
import { invokeIpc } from '@renderer/lib/utils'
import queryClient from '@renderer/lib/query-client'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ListX } from 'lucide-react'
import { useEffect } from 'react'

const printersQueryOptions = () =>
  queryOptions({
    queryKey: ['printers'],
    queryFn: () => invokeIpc('printers:get')
  })
export const Route = createFileRoute('/printers')({
  loader: () => queryClient.ensureQueryData(printersQueryOptions()),
  component: RouteComponent
})

function RouteComponent() {
  const { data: printers } = useSuspenseQuery(printersQueryOptions())
  console.log('printers', printers)
  useEffect(() => {
    const handleStatusChange = () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] })
    }

    window.electron.on('printer:status-changed', handleStatusChange)

    return () => {
      window.electron.off('printer:status-changed', handleStatusChange)
    }
  }, [])
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Printers</h2>
          <p className="text-slate-600">Manage your printing devices</p>
        </div>
        <AddPrinter />
      </div>

      {printers.length === 0 ? (
        <div className="flex flex-col items-center justify-center mt-20 text-center text-slate-500">
          <ListX className="w-16 h-16 mb-4 text-slate-400" />
          <h3 className="text-xl font-semibold text-slate-700">No Printers Found</h3>
          <p className="mt-1 text-sm">You haven’t added any printers yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {printers.map((printer) => (
            <PrinterCard key={printer.id} printer={printer} />
          ))}
        </div>
      )}
    </div>
  )
}
