"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { RefreshCw, Users, Eye, Gift, TrendingUp, Calendar, Link } from "lucide-react"

interface DailyStat {
  visit_date: string
  source_url: string
  ref_code: string | null
  channel: string | null
  pv: number
  uv: number
}

interface OverallStat {
  source_url: string
  ref_code: string | null
  channel: string | null
  total_pv: number
  total_uv: number
  first_visit: string
  last_visit: string
}

interface Summary {
  totalClaims: number
  totalUV: number
  totalPV: number
  conversionRate: string
}

interface StatsData {
  dailyStats: DailyStat[]
  overallStats: OverallStat[]
  summary: Summary
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [refCodeFilter, setRefCodeFilter] = useState("")

  const fetchStats = async () => {
    setIsLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (startDate) params.append("startDate", startDate)
      if (endDate) params.append("endDate", endDate)
      if (refCodeFilter) params.append("refCode", refCodeFilter)

      const response = await fetch(`/api/stats?${params.toString()}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Failed to fetch stats")
        return
      }

      setStats(data)
    } catch {
      setError("Network error")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + "..."
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Statistik Halaman
        </h1>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm text-muted-foreground mb-1 block">
                Tanggal Mulai
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm text-muted-foreground mb-1 block">
                Tanggal Akhir
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-sm text-muted-foreground mb-1 block">
                Ref Code
              </label>
              <Input
                type="text"
                placeholder="Filter by ref code"
                value={refCodeFilter}
                onChange={(e) => setRefCodeFilter(e.target.value)}
              />
            </div>
            <Button onClick={fetchStats} disabled={isLoading}>
              {isLoading ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </Card>

        {error && (
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-6">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : stats ? (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total PV</p>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.summary.totalPV.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total UV</p>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.summary.totalUV.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Klaim</p>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.summary.totalClaims.toLocaleString()}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Konversi</p>
                    <p className="text-2xl font-bold text-foreground">
                      {stats.summary.conversionRate}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Daily Stats Table */}
            <Card className="p-4 mb-6">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Statistik Harian
              </h2>

              {stats.dailyStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Belum ada data
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Tanggal
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Sumber URL
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Ref
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Channel
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                          PV
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                          UV
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.dailyStats.map((stat, index) => (
                        <tr
                          key={index}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="py-3 px-2 text-foreground">
                            {formatDate(stat.visit_date)}
                          </td>
                          <td className="py-3 px-2 text-foreground">
                            <span
                              className="cursor-help"
                              title={stat.source_url}
                            >
                              {truncateUrl(stat.source_url)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-foreground">
                            {stat.ref_code || "-"}
                          </td>
                          <td className="py-3 px-2 text-foreground">
                            {stat.channel || "-"}
                          </td>
                          <td className="py-3 px-2 text-right text-foreground font-medium">
                            {stat.pv.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right text-foreground font-medium">
                            {stat.uv.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Overall Stats by Source */}
            <Card className="p-4">
              <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Link className="w-5 h-5" />
                Statistik per Sumber
              </h2>

              {stats.overallStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Belum ada data
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Sumber URL
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Ref
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Channel
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                          Total PV
                        </th>
                        <th className="text-right py-3 px-2 font-medium text-muted-foreground">
                          Total UV
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Pertama
                        </th>
                        <th className="text-left py-3 px-2 font-medium text-muted-foreground">
                          Terakhir
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.overallStats.map((stat, index) => (
                        <tr
                          key={index}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="py-3 px-2 text-foreground">
                            <span
                              className="cursor-help"
                              title={stat.source_url}
                            >
                              {truncateUrl(stat.source_url)}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-foreground">
                            {stat.ref_code || "-"}
                          </td>
                          <td className="py-3 px-2 text-foreground">
                            {stat.channel || "-"}
                          </td>
                          <td className="py-3 px-2 text-right text-foreground font-medium">
                            {stat.total_pv.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-right text-foreground font-medium">
                            {stat.total_uv.toLocaleString()}
                          </td>
                          <td className="py-3 px-2 text-foreground">
                            {formatDate(stat.first_visit)}
                          </td>
                          <td className="py-3 px-2 text-foreground">
                            {formatDate(stat.last_visit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        ) : null}
      </div>
    </main>
  )
}
