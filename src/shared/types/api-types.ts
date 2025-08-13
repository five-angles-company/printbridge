export type ApiResponse<T> = {
  success: boolean
  data?: T
  error?: string
}

export type PrintJobData =
  | {
      id: number
      name: string
      type: 'receipt'
      data: string
    }
  | {
      id: number
      name: string
      type: 'label'
      data: string
    }
