import { cn } from '@renderer/lib/utils'
import { Card, CardContent } from './ui/card'
import { LucideIcon } from 'lucide-react'

interface StartCardProps {
  title: string
  data: string
  icon: LucideIcon
  iconColor?: string
  iconBg?: string
}
function StartCard({ title, data, icon: Icon, iconColor, iconBg }: StartCardProps) {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{data}</p>
          </div>
          <div
            className={cn(
              'w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center',
              iconBg
            )}
          >
            <Icon className={cn('w-6 h-6 text-teal-600', iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StartCard
