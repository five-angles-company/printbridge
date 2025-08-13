import { count, desc, eq } from 'drizzle-orm'
import { db } from '../../db'
import { printers, printJobs } from '../../db/schema'

export class DashboardService {
  async getStats() {
    const [totalPrinters, totalJobs, successRate] = await Promise.all([
      this.getTotalPrinters(),
      this.getTotalJobs(),
      this.getSuccessRate()
    ])

    return {
      totalPrinters,
      totalJobs,
      successRate
    }
  }

  async getRecentJobs(limit: number = 10) {
    return await db.query.printJobs.findMany({
      with: {
        printer: true
      },
      orderBy: desc(printJobs.createdAt),
      limit
    })
  }

  private async getTotalPrinters(): Promise<number> {
    const result = await db
      .select({
        count: count()
      })
      .from(printers)
    return result[0].count
  }

  private async getTotalJobs(): Promise<number> {
    const result = await db
      .select({
        count: count()
      })
      .from(printJobs)
    return result[0].count
  }

  private async getSuccessRate(): Promise<number> {
    const totalResult = await db.select({ count: count() }).from(printJobs)

    const completedResult = await db
      .select({ count: count() })
      .from(printJobs)
      .where(eq(printJobs.status, 'completed'))

    const total = totalResult[0].count ?? 0
    const completed = completedResult[0].count ?? 0

    if (total === 0) return 0

    return (completed / total) * 100
  }
}
