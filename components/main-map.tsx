"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"
import { useSpecies } from "@/contexts/species-context"

export function MainMap() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(6)
  const { selectedSpecies, speciesData } = useSpecies()

  // Simulate map data points for Indonesian waters
  const generateDataPoints = () => {
    const points = []
    const centerLat = -2.5
    const centerLng = 118

    for (let i = 0; i < 200; i++) {
      const lat = centerLat + (Math.random() - 0.5) * 20
      const lng = centerLng + (Math.random() - 0.5) * 30
      const density = Math.random()

      points.push({
        id: i,
        lat,
        lng,
        density,
        species: selectedSpecies?.name || "Unknown",
      })
    }
    return points
  }

  const [dataPoints] = useState(generateDataPoints)

  const getPointColor = (density: number) => {
    if (density > 0.8) return "bg-red-500"
    if (density > 0.6) return "bg-orange-500"
    if (density > 0.4) return "bg-yellow-500"
    if (density > 0.2) return "bg-green-500"
    return "bg-blue-500"
  }

  const getPointSize = (density: number) => {
    if (density > 0.8) return "w-4 h-4"
    if (density > 0.6) return "w-3 h-3"
    return "w-2 h-2"
  }

  return (
    <div className="flex-1 relative bg-blue-100">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full relative overflow-hidden"
        style={{
          backgroundImage: `url('/placeholder.svg?height=800&width=1200')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Simulated map background with Indonesian archipelago shape */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400">
          {/* Land masses simulation */}
          <div className="absolute top-1/4 left-1/3 w-32 h-20 bg-green-200 rounded-lg transform rotate-12"></div>
          <div className="absolute top-1/2 left-1/2 w-40 h-24 bg-green-200 rounded-lg transform -rotate-6"></div>
          <div className="absolute bottom-1/3 right-1/4 w-28 h-16 bg-green-200 rounded-lg transform rotate-45"></div>

          {/* Data points overlay */}
          {dataPoints.map((point) => (
            <div
              key={point.id}
              className={`absolute rounded-full ${getPointColor(point.density)} ${getPointSize(point.density)} opacity-70 hover:opacity-100 cursor-pointer transition-all`}
              style={{
                left: `${((point.lng + 140) / 280) * 100}%`,
                top: `${((point.lat + 60) / 120) * 100}%`,
                transform: "translate(-50%, -50%)",
              }}
              title={`${point.species} - Density: ${(point.density * 100).toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button variant="secondary" size="icon" onClick={() => setZoom((z) => Math.min(z + 1, 12))}>
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={() => setZoom((z) => Math.max(z - 1, 2))}>
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-20 bg-white rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">Legenda</span>
          <Button variant="ghost" size="sm" className="h-6 px-2">
            ▼
          </Button>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Tinggi (80-100%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Sedang-Tinggi (60-80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span>Sedang (40-60%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Rendah-Sedang (20-40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span>Rendah (0-20%)</span>
          </div>
        </div>
      </div>

      {/* Coordinates Display */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
        -160.017577°, -54.895297°
      </div>
    </div>
  )
}
