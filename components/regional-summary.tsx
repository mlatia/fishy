"use client"

import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin } from "lucide-react"

export function RegionalSummary() {
  const depthData = [
    { year: 1995, depth: 0 },
    { year: 2000, depth: 6 },
    { year: 2005, depth: 4 },
    { year: 2010, depth: 8 },
    { year: 2015, depth: 2 },
    { year: 2020, depth: 6 },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Regional Summary</h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Pilih Daerah</label>
        <Select defaultValue="siganus">
            <SelectTrigger className="bg-white border border-black text-black">
                <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white text-black">
                <SelectItem value="siganus">Siganus canaliculatus (Baronang Susu)</SelectItem>
                <SelectItem value="lutjanus">Lutjanus campechanus (Red Snapper)</SelectItem>
            </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Perubahan Kedalaman Spesies Laut</CardTitle>
          <p className="text-sm text-gray-600">
            Dalam 30 Tahun terakhir terjadi perubahan dengan rata-rata perubahan sebesar 7.81 meter lebih dekat ke
            permukaan laut.
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={depthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="depth"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Species Movement */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pergeseran Spesies Laut</CardTitle>
          <p className="text-sm text-gray-600">
            Secara rata-rata bergeser posisi habitatnya ke arah utara sebesar 0.03 derajat lintang dalam kurun waktu 30
            tahun terakhir
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-2xl font-bold text-blue-600">0.03°</div>
            <div className="text-sm text-gray-500">Pergeseran ke Utara</div>
            <div className="text-xs text-gray-400 mt-2">dalam 30 tahun</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
