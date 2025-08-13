import { Menu, MenuItemConstructorOptions, app } from 'electron'

export class MenuBuilder {
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
