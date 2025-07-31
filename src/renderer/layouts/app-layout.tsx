import Header from '@renderer/components/header'
import TabLink from '@renderer/components/tablink'
import { Activity, Printer, Settings } from 'lucide-react'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="p-6 space-y-6">
        <nav className="grid grid-cols-3 bg-white p-1 shadow-sm rounded-md">
          <TabLink to="/" icon={<Activity className="w-4 h-4" />} label="Dashboard" />
          <TabLink to="/printers" icon={<Printer className="w-4 h-4" />} label="Printers" />
          <TabLink to="/settings" icon={<Settings className="w-4 h-4" />} label="Settings" />
        </nav>
        {children}
      </main>
    </div>
  )
}
