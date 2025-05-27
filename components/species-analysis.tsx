"use client"

import { Fish, Thermometer, Droplets, Leaf, Ruler, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSpecies } from "@/contexts/species-context"

export function SpeciesAnalysis() {
  const { selectedSpecies, setSelectedSpecies, selectedRegion, setSelectedRegion } = useSpecies()

  const speciesOptions = [
    { id: "siganus", name: "Siganus canaliculatus (Baronang Susu)" },
    { id: "lutjanus", name: "Lutjanus campechanus (Red Snapper)" },
    { id: "epinephelus", name: "Epinephelus marginatus (Dusky Grouper)" },
  ]

  const regionOptions = [
    { id: "teluk-tomini", name: "Teluk Tomini, Sulawesi" },
    { id: "raja-ampat", name: "Raja Ampat, Papua" },
    { id: "karimunjawa", name: "Karimunjawa, Jawa Tengah" },
  ]

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Fish className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Single Species Analysis</h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Pilih Spesies *</label>
        <Select
          value={selectedSpecies?.id}
          onValueChange={(value) => {
            const species = speciesOptions.find((s) => s.id === value)
            setSelectedSpecies(species || null)
          }}
        >
          <SelectTrigger className="bg-white text-black">
            <SelectValue placeholder="Pilih spesies..." />
          </SelectTrigger>
          <SelectContent className="bg-white text-black">
            {speciesOptions.map((species) => (
              <SelectItem key={species.id} value={species.id}>
                {species.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Region Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Pilih Daerah *</label>
        <Select
          value={selectedRegion?.id}
          onValueChange={(value) => {
            const region = regionOptions.find((r) => r.id === value)
            setSelectedRegion(region || null)
          }}
        >
          <SelectTrigger className="bg-white text-black">
            <SelectValue placeholder="Pilih daerah..." />
          </SelectTrigger>
          <SelectContent>
            {regionOptions.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results */}
      {selectedSpecies && selectedRegion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result :</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Environmental Conditions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="w-4 h-4 text-red-500" />
                <span>Suhu permukaan laut: 28.7°C</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span>Salinitas: 34.1 PSU</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Leaf className="w-4 h-4 text-green-500" />
                <span>Klorofil a: 0.21 mg/m³</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Ruler className="w-4 h-4 text-purple-500" />
                <span>Kedalaman sampling: 12 meter</span>
              </div>
            </div>

            {/* Predictions */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Prediksi kehadiran di wilayah sekitar:</h4>
              <div className="space-y-1 text-sm">
                <div>- Poso Selatan: 85.3%</div>
                <div>- Ampana Barat: 77.1%</div>
                <div className="flex items-center gap-1">
                  <span>- Kepulauan Togean: 91.8%</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div>- Pantai Timur Luwuk: 54.6%</div>
              </div>
            </div>

            {/* Detection Areas */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Spesies ini juga terdeteksi di:</h4>
              <div className="space-y-1 text-sm">
                <div>- Karimunjawa (2023)</div>
                <div>- Selat Makassar (2024)</div>
              </div>
            </div>

            {/* Conservation Status */}
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Status IUCN: Least Concern</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
