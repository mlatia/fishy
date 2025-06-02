"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Minus, Loader2, Map, Activity } from "lucide-react"
import { useSpecies } from "@/contexts/species-context"
import { dataLoader, type OccurrenceRecord } from "@/lib/data-loader"
import { HeatmapControls } from "@/components/heatmap-controls"
import { ExportControls } from "@/components/export-controls"
import { apiService } from "@/lib/api-service"

interface MapProps {
  currentYear: number
  isPlaying: boolean
  showHeatmap?: boolean
  onHeatmapToggle?: () => void
}

export function MainMap({ currentYear, isPlaying, showHeatmap = false, onHeatmapToggle }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [zoom, setZoom] = useState(6)
  const [occurrenceData, setOccurrenceData] = useState<OccurrenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [regions, setRegions] = useState<any[]>([])
  const { selectedSpecies, selectedRegion } = useSpecies()

  const [localShowHeatmap, setLocalShowHeatmap] = useState(showHeatmap)
  const [heatmapData, setHeatmapData] = useState<number[][]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [showHeatmapControls, setShowHeatmapControls] = useState(false)
  const [showExportControls, setShowExportControls] = useState(false)
  const [heatmapIntensity, setHeatmapIntensity] = useState(100)
  const [heatmapBlurRadius, setHeatmapBlurRadius] = useState(1.5)
  const [heatmapColorScheme, setHeatmapColorScheme] = useState("thermal")

  // Use either prop-controlled or local state for heatmap visibility
  const effectiveShowHeatmap = onHeatmapToggle ? showHeatmap : localShowHeatmap

  // Heatmap configuration
  const GRID_SIZE = 50 // 50x50 grid

  const [predictions, setPredictions] = useState<any[]>([])
  const [predictionLoading, setPredictionLoading] = useState(false)

  const calculateHeatmapData = useCallback(() => {
    if (!occurrenceData.length) return

    const bounds = {
      north: 6,
      south: -11,
      east: 141,
      west: 95,
    }

    // Initialize grid
    const grid = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(0))

    // Count occurrences in each grid cell
    occurrenceData.forEach((record) => {
      if (!record.decimalLatitude || !record.decimalLongitude) return

      const x = Math.floor(((record.decimalLongitude - bounds.west) / (bounds.east - bounds.west)) * GRID_SIZE)
      const y = Math.floor(((bounds.north - record.decimalLatitude) / (bounds.north - bounds.south)) * GRID_SIZE)

      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        grid[y][x]++
      }
    })

    // Apply Gaussian blur for smoother heatmap
    const blurredGrid = applyGaussianBlur(grid, heatmapBlurRadius)
    setHeatmapData(blurredGrid)
  }, [occurrenceData, heatmapBlurRadius])

  const applyGaussianBlur = (grid: number[][], radius: number): number[][] => {
    const blurred = grid.map((row) => [...row])
    const size = Math.ceil(radius * 3)

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        let sum = 0
        let weight = 0

        for (let dy = -size; dy <= size; dy++) {
          for (let dx = -size; dx <= size; dx++) {
            const ny = y + dy
            const nx = x + dx

            if (ny >= 0 && ny < GRID_SIZE && nx >= 0 && nx < GRID_SIZE) {
              const distance = Math.sqrt(dx * dx + dy * dy)
              const gaussianWeight = Math.exp(-(distance * distance) / (2 * radius * radius))
              sum += grid[ny][nx] * gaussianWeight
              weight += gaussianWeight
            }
          }
        }
        blurred[y][x] = weight > 0 ? sum / weight : 0
      }
    }
    return blurred
  }

  const renderHeatmap = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !heatmapData.length) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width
    canvas.height = rect.height

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Find max value for normalization
    const maxValue = Math.max(...heatmapData.flat())
    if (maxValue === 0) return

    const cellWidth = canvas.width / GRID_SIZE
    const cellHeight = canvas.height / GRID_SIZE

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const value = heatmapData[y][x]
        if (value === 0) continue

        const intensity = value / maxValue
        const color = getHeatmapColor(intensity)

        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`
        ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight)
      }
    }
  }, [heatmapData, heatmapIntensity, heatmapColorScheme])

  const getHeatmapColor = (intensity: number) => {
    if (intensity === 0) return { r: 0, g: 0, b: 0, a: 0 }

    const schemes = {
      thermal: [
        { r: 0, g: 0, b: 255, a: 0 },
        { r: 0, g: 255, b: 0, a: 0.3 },
        { r: 255, g: 255, b: 0, a: 0.5 },
        { r: 255, g: 165, b: 0, a: 0.7 },
        { r: 255, g: 0, b: 0, a: 0.9 },
      ],
      ocean: [
        { r: 0, g: 0, b: 128, a: 0 },
        { r: 0, g: 128, b: 255, a: 0.3 },
        { r: 0, g: 255, b: 255, a: 0.5 },
        { r: 128, g: 255, b: 255, a: 0.7 },
        { r: 255, g: 255, b: 255, a: 0.9 },
      ],
      forest: [
        { r: 0, g: 64, b: 0, a: 0 },
        { r: 0, g: 128, b: 0, a: 0.3 },
        { r: 64, g: 255, b: 64, a: 0.5 },
        { r: 255, g: 255, b: 0, a: 0.7 },
        { r: 255, g: 128, b: 0, a: 0.9 },
      ],
      sunset: [
        { r: 64, g: 0, b: 64, a: 0 },
        { r: 128, g: 0, b: 128, a: 0.3 },
        { r: 255, g: 0, b: 128, a: 0.5 },
        { r: 255, g: 128, b: 0, a: 0.7 },
        { r: 255, g: 255, b: 0, a: 0.9 },
      ],
    }

    const colors = schemes[heatmapColorScheme as keyof typeof schemes] || schemes.thermal
    const adjustedIntensity = (intensity * heatmapIntensity) / 100
    const scaledIntensity = Math.min(adjustedIntensity * 4, 3.99)
    const index = Math.floor(scaledIntensity)
    const fraction = scaledIntensity - index

    const color1 = colors[index + 1]
    const color2 = colors[Math.min(index + 2, colors.length - 1)]

    return {
      r: Math.round(color1.r + (color2.r - color1.r) * fraction),
      g: Math.round(color1.g + (color2.g - color1.g) * fraction),
      b: Math.round(color1.b + (color2.b - color1.b) * fraction),
      a: (color1.a + (color2.a - color1.a) * fraction) * (heatmapIntensity / 100),
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedSpecies && currentYear) {
      filterDataByYear()
    }
  }, [selectedSpecies, currentYear])

  useEffect(() => {
    if (effectiveShowHeatmap) {
      calculateHeatmapData()
    }
  }, [effectiveShowHeatmap, calculateHeatmapData])

  useEffect(() => {
    if (effectiveShowHeatmap && heatmapData.length) {
      renderHeatmap()
    }
  }, [effectiveShowHeatmap, heatmapData, renderHeatmap])

  useEffect(() => {
    const handleResize = () => {
      if (effectiveShowHeatmap) {
        renderHeatmap()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [effectiveShowHeatmap, renderHeatmap])

  useEffect(() => {
    if (selectedSpecies) {
      loadPredictions()
    }
  }, [selectedSpecies])

  const loadData = async () => {
    try {
      setLoading(true)
      await dataLoader.loadOccurrenceData()
      setRegions(dataLoader.getRegions())
      setOccurrenceData(dataLoader.getOccurrenceData())
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterDataByYear = () => {
    if (!selectedSpecies) return

    const filteredData = dataLoader.getOccurrencesBySpeciesAndYear(selectedSpecies.name || "", currentYear)
    setOccurrenceData(filteredData)
  }

  const loadPredictions = async () => {
    if (!selectedSpecies) return

    setPredictionLoading(true)
    try {
      const predictionData = await apiService.getPredictions(selectedSpecies.id)
      setPredictions(predictionData)
    } catch (error) {
      console.error("Error loading predictions:", error)
    } finally {
      setPredictionLoading(false)
    }
  }

  // Convert lat/lng to screen coordinates for Indonesian map
  const latLngToScreen = (lat: number, lng: number) => {
    const bounds = {
      north: 6,
      south: -11,
      east: 141,
      west: 95,
    }

    const x = ((lng - bounds.west) / (bounds.east - bounds.west)) * 100
    const y = ((bounds.north - lat) / (bounds.north - bounds.south)) * 100

    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    }
  }

  const getPointColor = (record: OccurrenceRecord) => {
    // Color based on depth or other factors
    if (record.depth) {
      if (record.depth < 10) return "bg-red-500"
      if (record.depth < 50) return "bg-orange-500"
      if (record.depth < 100) return "bg-yellow-500"
      if (record.depth < 200) return "bg-green-500"
      return "bg-blue-500"
    }

    // Default color based on year
    const yearsSinceFirst = currentYear - 1990
    const intensity = Math.min(yearsSinceFirst / 30, 1)
    if (intensity > 0.8) return "bg-red-500"
    if (intensity > 0.6) return "bg-orange-500"
    if (intensity > 0.4) return "bg-yellow-500"
    if (intensity > 0.2) return "bg-green-500"
    return "bg-blue-500"
  }

  const getPointSize = (record: OccurrenceRecord) => {
    if (record.individualCount && record.individualCount > 1) {
      if (record.individualCount > 10) return "w-4 h-4"
      if (record.individualCount > 5) return "w-3 h-3"
      return "w-2 h-2"
    }
    return "w-2 h-2"
  }

  const zoomIn = () => setZoom((prev) => Math.min(prev + 1, 12))
  const zoomOut = () => setZoom((prev) => Math.max(prev - 1, 2))

  const handleToggleHeatmap = () => {
    if (onHeatmapToggle) {
      onHeatmapToggle()
    } else {
      setLocalShowHeatmap(!localShowHeatmap)
    }
  }

  return (
    <div className="flex-1 relative bg-gradient-to-br from-blue-200 via-blue-300 to-blue-400">
      {/* Map Container */}
      <div
        ref={mapRef}
        className="w-full h-full relative overflow-hidden"
        style={{
          transform: `scale(${1 + (zoom - 6) * 0.1})`,
          transformOrigin: "center center",
          transition: "transform 0.3s ease",
        }}
      >
        {/* Heatmap Canvas Overlay */}
        {effectiveShowHeatmap && (
          <canvas
            ref={canvasRef}
            className="absolute inset-0 pointer-events-none"
            style={{ mixBlendMode: "multiply" }}
          />
        )}

        {/* Indonesian archipelago - Major Islands */}
        <div className="absolute inset-0">
          {/* Sumatra */}
          <div
            className="absolute bg-green-300 rounded-lg shadow-md"
            style={{
              top: "45%",
              left: "15%",
              width: "80px",
              height: "200px",
              transform: "rotate(15deg)",
            }}
          />

          {/* Java */}
          <div
            className="absolute bg-green-300 rounded-lg shadow-md"
            style={{
              top: "65%",
              left: "25%",
              width: "150px",
              height: "25px",
              transform: "rotate(-5deg)",
            }}
          />

          {/* Kalimantan */}
          <div
            className="absolute bg-green-300 rounded-lg shadow-md"
            style={{
              top: "35%",
              left: "35%",
              width: "120px",
              height: "140px",
              transform: "rotate(10deg)",
            }}
          />

          {/* Sulawesi */}
          <div
            className="absolute bg-green-300 rounded-lg shadow-md"
            style={{
              top: "40%",
              left: "55%",
              width: "60px",
              height: "120px",
              transform: "rotate(-10deg)",
            }}
          />

          {/* Papua */}
          <div
            className="absolute bg-green-300 rounded-lg shadow-md"
            style={{
              top: "45%",
              left: "75%",
              width: "100px",
              height: "80px",
              transform: "rotate(20deg)",
            }}
          />

          {/* Smaller islands */}
          <div
            className="absolute bg-green-300 rounded-full shadow-md"
            style={{ top: "55%", left: "45%", width: "30px", height: "30px" }}
          />
          <div
            className="absolute bg-green-300 rounded-lg shadow-md"
            style={{ top: "75%", left: "35%", width: "40px", height: "15px" }}
          />
        </div>

        {/* Regional markers */}
        {regions.map((region) => {
          const pos = latLngToScreen(region.coordinates[0], region.coordinates[1])
          return (
            <div
              key={region.id}
              className="absolute w-3 h-3 bg-purple-600 rounded-full border-2 border-white shadow-lg transform -translate-x-1/2 -translate-y-1/2 hover:scale-125 transition-transform cursor-pointer"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
              }}
              title={`${region.name} (${region.occurrenceCount} records)`}
            />
          )
        })}

        {/* Occurrence data points */}
        {!effectiveShowHeatmap &&
          occurrenceData.map((record, index) => {
            if (!record.decimalLatitude || !record.decimalLongitude) return null

            const pos = latLngToScreen(record.decimalLatitude, record.decimalLongitude)
            return (
              <div
                key={`${record.gbifID || index}-${index}`}
                className={`absolute rounded-full ${getPointColor(record)} ${getPointSize(record)} opacity-70 hover:opacity-100 cursor-pointer transition-all transform -translate-x-1/2 -translate-y-1/2 animate-pulse`}
                style={{
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  animationDelay: `${index * 0.1}s`,
                  animationDuration: isPlaying ? "1s" : "2s",
                }}
                title={`${record.scientificName || "Unknown"} - ${record.year || "Unknown"} - Depth: ${record.depth || "Unknown"}m`}
              />
            )
          })}

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center">
            <div className="bg-white rounded-lg p-4 flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Loading occurrence data...</span>
            </div>
          </div>
        )}
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <Button
          variant={effectiveShowHeatmap ? "default" : "secondary"}
          size="icon"
          onClick={handleToggleHeatmap}
          className="bg-white shadow-lg hover:bg-gray-50"
          title={effectiveShowHeatmap ? "Hide Heatmap" : "Show Heatmap"}
        >
          {effectiveShowHeatmap ? <Activity className="w-4 h-4" /> : <Map className="w-4 h-4" />}
        </Button>
        <Button variant="secondary" size="icon" onClick={zoomIn} className="bg-white shadow-lg hover:bg-gray-50">
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={zoomOut} className="bg-white shadow-lg hover:bg-gray-50">
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-20 bg-white rounded-lg p-3 shadow-lg max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">Legenda</span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
            ▼
          </Button>
        </div>

        {effectiveShowHeatmap ? (
          <div className="space-y-1 text-xs">
            <div className="text-xs font-medium mb-2">Density Heatmap</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-sm opacity-30"></div>
              <span>Low Density</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-sm opacity-50"></div>
              <span>Medium Density</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-400 rounded-sm opacity-70"></div>
              <span>High Density</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-sm opacity-90"></div>
              <span>Very High Density</span>
            </div>
          </div>
        ) : (
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
        )}

        <div className="flex items-center gap-2 mt-2 pt-2 border-t">
          <div className="w-3 h-3 bg-purple-600 rounded-full"></div>
          <span>Lokasi Sampling ({regions.length})</span>
        </div>
        <div className="mt-2 pt-2 border-t text-xs text-gray-600">
          <div>Mode: {effectiveShowHeatmap ? "Heatmap" : "Points"}</div>
          <div>Tahun: {currentYear}</div>
          <div>Data: {occurrenceData.length} records</div>
          {predictions.length > 0 && <div>Predictions: {predictions.length} points</div>}
          {predictionLoading && (
            <div className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading predictions...</span>
            </div>
          )}
        </div>
      </div>

      {/* Coordinates Display */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm">
        Indonesia Marine Waters • Zoom: {zoom}x
      </div>

      {/* Heatmap Controls */}
      {effectiveShowHeatmap && (
        <HeatmapControls
          isVisible={showHeatmapControls}
          onToggle={() => setShowHeatmapControls(!showHeatmapControls)}
          intensity={heatmapIntensity}
          onIntensityChange={setHeatmapIntensity}
          blurRadius={heatmapBlurRadius}
          onBlurRadiusChange={setHeatmapBlurRadius}
          colorScheme={heatmapColorScheme}
          onColorSchemeChange={setHeatmapColorScheme}
        />
      )}

      {/* Export Controls */}
      {effectiveShowHeatmap && (
        <ExportControls
          isVisible={showExportControls}
          onToggle={() => setShowExportControls(!showExportControls)}
          heatmapData={heatmapData}
          occurrenceData={occurrenceData}
          currentYear={currentYear}
          selectedSpecies={selectedSpecies}
          selectedRegion={selectedRegion}
          canvasRef={canvasRef}
        />
      )}
    </div>
  )
}
