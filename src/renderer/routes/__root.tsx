import AppLayout from '@renderer/layouts/app-layout'
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
export const Route = createRootRoute({
  component: () => (
    <div>
      <AppLayout>
        <Outlet />
        <TanStackRouterDevtools position="bottom-right" />
      </AppLayout>
    </div>
  )
})
