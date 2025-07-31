import { Menu, MenuItemConstructorOptions, app } from 'electron'
import type { LoggerService } from '../services/logger-service'
import type { WindowManager } from './window-manager'

export class MenuBuilder {
  constructor(
    private readonly logger: LoggerService,
    private readonly windowManager: WindowManager
  ) {}

  buildMenu(): Menu {
    const template: MenuItemConstructorOptions[] = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Quit',
            click: () => app.quit()
          }
        ]
      }
    ]

    return Menu.buildFromTemplate(template)
  }

  setMenu(menu: Menu): void {
    Menu.setApplicationMenu(menu)
  }
}
