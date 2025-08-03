import StartCard from '@renderer/components/start-card'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import queryClient from '@renderer/lib/query-client'
import { invokeIpc } from '@renderer/lib/utils'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Barcode,
  CheckCircle2,
  Clock,
  FileText,
  Printer,
  PrinterIcon,
  Receipt,
  XCircle
} from 'lucide-react'

const dashboardQueryOptions = () =>
  queryOptions({
    queryKey: ['dashboard'],
    queryFn: () => invokeIpc('dashboard:get')
  })
export const Route = createFileRoute('/')({
  loader: () => queryClient.ensureQueryData(dashboardQueryOptions()),
  component: Index
})

function Index() {
  const { data } = useSuspenseQuery(dashboardQueryOptions())

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'failed':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'pending':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3" />
      case 'failed':
        return <XCircle className="w-3 h-3" />
      case 'pending':
        return <Clock className="w-3 h-3" />
      default:
        return <Clock className="w-3 h-3" />
    }
  }

  const getPrinterIcon = (type: string) => {
    switch (type) {
      case 'receipt':
        return <Receipt className="w-4 h-4" />
      case 'a4':
        return <FileText className="w-4 h-4" />
      case 'label':
        return <Barcode className="w-4 h-4" />
      default:
        return <PrinterIcon className="w-4 h-4" />
    }
  }
  return (
    <div className="p-2 space-y-4">
      <div className="grid grid-cols-3 gap-6">
        <StartCard title="Printers" data={data.stats.totalPrinters.toString()} icon={Printer} />
        <StartCard
          title="Total Print Jobs"
          data={data.stats.totalJobs.toString()}
          icon={FileText}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
        />
        <StartCard
          title="Success Rate"
          data={data.stats.successRate.toFixed(2) + '%'}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
        />
      </div>
      <div>
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-slate-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.jobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    {getPrinterIcon(job.type)}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{job.name}</p>
                    <p className="text-sm text-slate-500">
                      {job.printer.name} • {job.createdAt}
                    </p>
                  </div>
                </div>
                <div
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(job.status)}`}
                >
                  {getStatusIcon(job.status)}
                  <span className="capitalize">{job.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
