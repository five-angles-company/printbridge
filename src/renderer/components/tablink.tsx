import { Link, useRouterState } from '@tanstack/react-router'
import { ReactNode } from 'react'

function TabLink({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  const router = useRouterState()
  const isActive = router.location.pathname === to

  return (
    <Link
      to={to}
      className={`flex items-center justify-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition ${
        isActive ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}

export default TabLink
