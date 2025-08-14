import z from 'zod'

export const UpdateInfoSchema = z.object({
  version: z.string(),
  size: z.number(),
  releaseDate: z.date(),
  releaseName: z.string()
})

export type UpdateInfo = z.infer<typeof UpdateInfoSchema>
