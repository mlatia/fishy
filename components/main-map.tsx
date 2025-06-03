"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Minus, Loader2, Map, Activity } from "lucide-react"
import { useSpecies } from "@/contexts/species-context"
import { dataLoader, type OccurrenceRecord } from "@/lib/data-loader"
import { HeatmapControls } from "@/components/heatmap-controls"
import { ExportControls } from "@/components/export-controls"
import { apiService } from "@/lib/api-service"

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface MapProps {
  currentYear: number
  isPlaying: boolean
  showHeatmap?: boolean
  onHeatmapToggle?: () => void
}

interface PredictionData {
  decimalLatitude: number
  decimalLongitude: number
  depth?: number
  prediction: number
  salinity?: number
  temperature?: number
}

export function MainMap({ currentYear, isPlaying, showHeatmap = false, onHeatmapToggle }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMapRef = useRef<L.Map | null>(null)
  const markersLayerRef = useRef<L.LayerGroup | null>(null)
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null)
  const predictionLayerRef = useRef<L.LayerGroup | null>(null)
  const regionsLayerRef = useRef<L.LayerGroup | null>(null)
  
  const [occurrenceData, setOccurrenceData] = useState<OccurrenceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [regions, setRegions] = useState<any[]>([])
  const { selectedSpecies, selectedRegion } = useSpecies()

  const [localShowHeatmap, setLocalShowHeatmap] = useState(showHeatmap)
  const [heatmapData, setHeatmapData] = useState<number[][]>([])

  const [showHeatmapControls, setShowHeatmapControls] = useState(false)
  const [showExportControls, setShowExportControls] = useState(false)
  const [heatmapIntensity, setHeatmapIntensity] = useState(100)
  const [heatmapBlurRadius, setHeatmapBlurRadius] = useState(1.5)
  const [heatmapColorScheme, setHeatmapColorScheme] = useState("thermal")

  const effectiveShowHeatmap = onHeatmapToggle ? showHeatmap : localShowHeatmap

  const [predictions, setPredictions] = useState<PredictionData[]>([])
  const [predictionLoading, setPredictionLoading] = useState(false)
  const [showPredictions, setShowPredictions] = useState(false)

  useEffect(() => {
    if (!mapRef.current || leafletMapRef.current) return

    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    })

    const map = L.map(mapRef.current, {
      center: [-2.5, 118],
      zoom: 5,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: false 
    })

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18
    })

    const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles © Esri',
      maxZoom: 18
    })


    osmLayer.addTo(map)

    const baseLayers = {
      "OpenStreetMap": osmLayer,
      "Satellite": satelliteLayer
    }
    L.control.layers(baseLayers).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    heatmapLayerRef.current = L.layerGroup().addTo(map)
    predictionLayerRef.current = L.layerGroup().addTo(map)
    regionsLayerRef.current = L.layerGroup().addTo(map)

    leafletMapRef.current = map

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove()
        leafletMapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!leafletMapRef.current || !markersLayerRef.current) return

    markersLayerRef.current.clearLayers()

    if (effectiveShowHeatmap || showPredictions) return 

    occurrenceData.forEach((record, index) => {
      if (!record.decimalLatitude || !record.decimalLongitude) return

      const color = getPointColor(record)
      const size = getPointSize(record)

      const marker = L.circleMarker([record.decimalLatitude, record.decimalLongitude], {
        radius: size,
        fillColor: color,
        color: '#fff',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.7
      })


      const popupContent = `
        <div class="text-sm">
          <strong>${record.scientificName || "Unknown Species"}</strong><br/>
          Year: ${record.year || "Unknown"}<br/>
          Depth: ${record.depth || "Unknown"}m<br/>
          Count: ${record.individualCount || 1}<br/>
          Location: ${record.decimalLatitude.toFixed(4)}, ${record.decimalLongitude.toFixed(4)}
        </div>
      `
      marker.bindPopup(popupContent)

      if (isPlaying) {
        setTimeout(() => {
          marker.addTo(markersLayerRef.current!)
        }, index * 100)
      } else {
        marker.addTo(markersLayerRef.current!)
      }
    })
  }, [occurrenceData, effectiveShowHeatmap, showPredictions, isPlaying])

  useEffect(() => {
    if (!leafletMapRef.current || !regionsLayerRef.current) return

    regionsLayerRef.current.clearLayers()

    regions.forEach((region) => {
      if (!region.coordinates || region.coordinates.length < 2) return

      const marker = L.marker([region.coordinates[0], region.coordinates[1]], {
        icon: L.divIcon({
          className: 'custom-region-marker',
          html: '<div style="background-color: #8b5cf6; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      })

      const popupContent = `
        <div class="text-sm">
          <strong>${region.name}</strong><br/>
          Records: ${region.occurrenceCount}<br/>
          Coordinates: ${region.coordinates[0].toFixed(4)}, ${region.coordinates[1].toFixed(4)}
        </div>
      `
      marker.bindPopup(popupContent)
      marker.addTo(regionsLayerRef.current!)
    })
  }, [regions])

  useEffect(() => {
    if (!leafletMapRef.current || !heatmapLayerRef.current) return

    heatmapLayerRef.current.clearLayers()

    if (!effectiveShowHeatmap || !occurrenceData.length || showPredictions) return

    const canvas = document.createElement('canvas')
    const bounds = leafletMapRef.current.getBounds()
    const size = leafletMapRef.current.getSize()
    
    canvas.width = size.x
    canvas.height = size.y

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const heatmapPoints = occurrenceData
      .filter(record => record.decimalLatitude && record.decimalLongitude)
      .map(record => {
        const point = leafletMapRef.current!.latLngToContainerPoint([record.decimalLatitude!, record.decimalLongitude!])
        return { x: point.x, y: point.y, intensity: record.individualCount || 1 }
      })

      console.log(heatmapPoints)
 
    drawHeatmap(ctx, heatmapPoints, canvas.width, canvas.height)

    const imageUrl = canvas.toDataURL()
    const imageOverlay = L.imageOverlay(imageUrl, bounds, {
      opacity: 0.6,
      interactive: false
    })

    imageOverlay.addTo(heatmapLayerRef.current)
  }, [effectiveShowHeatmap, occurrenceData, heatmapIntensity, heatmapColorScheme, showPredictions])

  useEffect(() => {
    if (!leafletMapRef.current || !predictionLayerRef.current) return

    predictionLayerRef.current.clearLayers()

    if (!showPredictions || !predictions.length) return

     const canvas = document.createElement('canvas')
    const bounds = leafletMapRef.current.getBounds()
    const size = leafletMapRef.current.getSize()
    
    canvas.width = size.x
    canvas.height = size.y

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const records = predictions[currentYear] ;

    const point = leafletMapRef.current!.latLngToContainerPoint([
      records.decimalLatitude,
      records.decimalLongitude,
    ]);
    
    const heatmapPoints = [{ x: point.x, y: point.y, intensity: 1 }];

    console.log(heatmapPoints, records)
    drawPredictionHeatmap(ctx, heatmapPoints, canvas.width, canvas.height)

    const imageUrl = canvas.toDataURL()
    const imageOverlay = L.imageOverlay(imageUrl, bounds, {
      opacity: 0.6,
      interactive: false
    })

    imageOverlay.addTo(predictionLayerRef.current)
  }, [showPredictions, predictions, heatmapIntensity, heatmapColorScheme])

  useEffect(() => {
    if (predictions.length > 0 && selectedSpecies) {
      setShowPredictions(true)
    } else {
      setShowPredictions(false)
    }
  }, [predictions, selectedSpecies])

  const drawHeatmap = (ctx: CanvasRenderingContext2D, points: Array<{x: number, y: number, intensity: number}>, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)

    points.forEach(point => {
      const radius = 20 * (heatmapBlurRadius || 1)
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
      
      const color = getHeatmapColor(point.intensity / 10) // Normalize intensity
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`)
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)

      ctx.fillStyle = gradient
      ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2)
    })
  }

  const drawPredictionHeatmap = (ctx: CanvasRenderingContext2D, points: Array<{x: number, y: number, intensity: number}>, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height)

    points.forEach(point => {
      const radius = 25 * (heatmapBlurRadius || 1)
      const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radius)
      
      const color = getPredictionHeatmapColor(point.intensity / 10) // Normalize intensity
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`)
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`)

      ctx.fillStyle = gradient
      ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2)
    })
  }

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

  const getPredictionHeatmapColor = (intensity: number) => {
    if (intensity === 0) return { r: 0, g: 0, b: 0, a: 0 }

    const predictionSchemes = {
      thermal: [
        { r: 0, g: 0, b: 128, a: 0 },
        { r: 128, g: 0, b: 255, a: 0.3 },
        { r: 255, g: 0, b: 255, a: 0.5 },
        { r: 255, g: 128, b: 128, a: 0.7 },
        { r: 255, g: 255, b: 0, a: 0.9 },
      ],
      ocean: [
        { r: 0, g: 0, b: 64, a: 0 },
        { r: 0, g: 64, b: 128, a: 0.3 },
        { r: 0, g: 128, b: 255, a: 0.5 },
        { r: 64, g: 192, b: 255, a: 0.7 },
        { r: 128, g: 255, b: 255, a: 0.9 },
      ],
      forest: [
        { r: 0, g: 32, b: 64, a: 0 },
        { r: 0, g: 64, b: 128, a: 0.3 },
        { r: 32, g: 128, b: 192, a: 0.5 },
        { r: 64, g: 192, b: 255, a: 0.7 },
        { r: 128, g: 255, b: 255, a: 0.9 },
      ],
      sunset: [
        { r: 32, g: 0, b: 64, a: 0 },
        { r: 64, g: 0, b: 128, a: 0.3 },
        { r: 128, g: 64, b: 192, a: 0.5 },
        { r: 192, g: 128, b: 255, a: 0.7 },
        { r: 255, g: 192, b: 255, a: 0.9 },
      ],
    }

    const colors = predictionSchemes[heatmapColorScheme as keyof typeof predictionSchemes] || predictionSchemes.thermal
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
      const response = await apiService.getPredictions(selectedSpecies.id)
      
 
      let predictionData: PredictionData[] = []
      if (response) {
        predictionData = response
      } else if (Array.isArray(response)) {
        predictionData = response
      }
      
      setPredictions(predictionData)
      console.log('Loaded predictions:', predictionData.length)
    } catch (error) {
      console.error("Error loading predictions:", error)
      setPredictions([])
    } finally {
      setPredictionLoading(false)
    }
  }

  const getPointColor = (record: OccurrenceRecord) => {
    if (record.depth) {
      if (record.depth < 10) return "#ef4444" 
      if (record.depth < 50) return "#f97316"
      if (record.depth < 100) return "#eab308"
      if (record.depth < 200) return "#22c55e" 
      return "#3b82f6" 
    }

    const yearsSinceFirst = currentYear - 1990
    const intensity = Math.min(yearsSinceFirst / 30, 1)
    if (intensity > 0.8) return "#ef4444"
    if (intensity > 0.6) return "#f97316"
    if (intensity > 0.4) return "#eab308"
    if (intensity > 0.2) return "#22c55e"
    return "#3b82f6"
  }

  const getPointSize = (record: OccurrenceRecord) => {
    if (record.individualCount && record.individualCount > 1) {
      if (record.individualCount > 10) return 8
      if (record.individualCount > 5) return 6
      return 4
    }
    return 4
  }

  const zoomIn = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomIn()
    }
  }

  const zoomOut = () => {
    if (leafletMapRef.current) {
      leafletMapRef.current.zoomOut()
    }
  }

  const handleToggleHeatmap = () => {
    if (onHeatmapToggle) {
      onHeatmapToggle()
    } else {
      setLocalShowHeatmap(!localShowHeatmap)
    }
  }

  const togglePredictions = () => {
    setShowPredictions(!showPredictions)
  }

  return (
     <div className="absolute inset-0 z-10">

      <div
        ref={mapRef}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      />

      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[1000]">
          <div className="bg-white rounded-lg p-4 flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading occurrence data...</span>
          </div>
        </div>
      )}

    
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <Button
          variant={effectiveShowHeatmap ? "default" : "secondary"}
          size="icon"
          onClick={handleToggleHeatmap}
          className="bg-white shadow-lg hover:bg-gray-50"
          title={effectiveShowHeatmap ? "Hide Occurrence Heatmap" : "Show Occurrence Heatmap"}
          disabled={showPredictions}
        >
          {effectiveShowHeatmap ? <Activity className="w-4 h-4" /> : <Map className="w-4 h-4" />}
        </Button>
        
        {predictions.length > 0 && (
          <Button
            variant={showPredictions ? "default" : "secondary"}
            size="icon"
            onClick={togglePredictions}
            className="bg-white shadow-lg hover:bg-gray-50"
            title={showPredictions ? "Hide Predictions" : "Show Predictions"}
          >
            <Activity className={`w-4 h-4 ${showPredictions ? 'text-purple-600' : ''}`} />
          </Button>
        )}
        
        <Button variant="secondary" size="icon" onClick={zoomIn} className="bg-white shadow-lg hover:bg-gray-50">
          <Plus className="w-4 h-4" />
        </Button>
        <Button variant="secondary" size="icon" onClick={zoomOut} className="bg-white shadow-lg hover:bg-gray-50">
          <Minus className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-20 bg-white rounded-lg p-3 shadow-lg max-w-xs z-[1000]">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-medium">Legenda</span>
        </div>

        {showPredictions ? (
          <div className="space-y-1 text-xs">
            <div className="text-xs font-medium mb-2 text-purple-600">Species Predictions</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-300 rounded-sm opacity-30"></div>
              <span>Low Probability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-400 rounded-sm opacity-50"></div>
              <span>Medium Probability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-600 rounded-sm opacity-70"></div>
              <span>High Probability</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-pink-500 rounded-sm opacity-90"></div>
              <span>Very High Probability</span>
            </div>
          </div>
        ) : effectiveShowHeatmap ? (
          <div className="space-y-1 text-xs">
            <div className="text-xs font-medium mb-2">Occurrence Density</div>
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
            <div className="text-xs font-medium mb-2">Depth Categories</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>&lt; 10m (Shallow)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>10-50m (Mid)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>50-100m (Deep)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>100-200m (Very Deep)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>&gt; 200m (Abyssal)</span>
            </div>
          </div>
        )}

        <div className="mt-2 pt-2 border-t text-xs text-gray-600">
          <div>Mode: {effectiveShowHeatmap ? "Heatmap" : "Points"}</div>
          <div>Year: {currentYear}</div>
          {predictions.length < 0 && <div>Records: {occurrenceData.length}</div>}
          {predictions.length > 0 && <div>Predictions: {predictions.length}</div>}
          {predictionLoading && (
            <div className="flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading predictions...</span>
            </div>
          )}
        </div>
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

    </div>
  )
}