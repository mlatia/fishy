"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Download, FileImage, FileText, Database, Loader2 } from "lucide-react"

interface ExportControlsProps {
  isVisible: boolean
  onToggle: () => void
  heatmapData: number[][]
  occurrenceData: any[]
  currentYear: number
  selectedSpecies: any
  selectedRegion: any
  canvasRef: React.RefObject<HTMLCanvasElement>
}

export function ExportControls({
  isVisible,
  onToggle,
  heatmapData,
  occurrenceData,
  currentYear,
  selectedSpecies,
  selectedRegion,
  canvasRef,
}: ExportControlsProps) {
  const [exportFormat, setExportFormat] = useState("png")
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [includeRawData, setIncludeRawData] = useState(false)
  const [fileName, setFileName] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  const generateFileName = (extension: string) => {
    const species = selectedSpecies?.scientificName?.replace(/\s+/g, "_") || "all_species"
    const region = selectedRegion?.name?.replace(/\s+/g, "_") || "all_regions"
    const timestamp = new Date().toISOString().split("T")[0]
    return fileName || `heatmap_${species}_${region}_${currentYear}_${timestamp}.${extension}`
  }

  const exportAsImage = async (format: "png" | "jpeg" | "svg") => {
    if (!canvasRef.current) return

    setIsExporting(true)
    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      // Create a new canvas with higher resolution for export
      const exportCanvas = document.createElement("canvas")
      const exportCtx = exportCanvas.getContext("2d")
      if (!exportCtx) return

      const scale = 2 // Higher resolution
      exportCanvas.width = canvas.width * scale
      exportCanvas.height = canvas.height * scale
      exportCtx.scale(scale, scale)

      // Copy the heatmap to export canvas
      exportCtx.drawImage(canvas, 0, 0)

      // Add metadata overlay if requested
      if (includeMetadata) {
        addMetadataOverlay(exportCtx, canvas.width, canvas.height)
      }

      // Export based on format
      let dataUrl: string
      if (format === "png") {
        dataUrl = exportCanvas.toDataURL("image/png")
      } else if (format === "jpeg") {
        dataUrl = exportCanvas.toDataURL("image/jpeg", 0.9)
      } else {
        // SVG export
        dataUrl = await exportAsSVG()
      }

      // Download the image
      const link = document.createElement("a")
      link.download = generateFileName(format)
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error("Error exporting image:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const addMetadataOverlay = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Add semi-transparent background for metadata
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)"
    ctx.fillRect(10, 10, 300, 120)

    // Add border
    ctx.strokeStyle = "#333"
    ctx.lineWidth = 1
    ctx.strokeRect(10, 10, 300, 120)

    // Add text
    ctx.fillStyle = "#333"
    ctx.font = "14px Arial"
    ctx.fillText("Marine Species Distribution Heatmap", 20, 30)

    ctx.font = "12px Arial"
    ctx.fillText(`Species: ${selectedSpecies?.scientificName || "All Species"}`, 20, 50)
    ctx.fillText(`Region: ${selectedRegion?.name || "All Regions"}`, 20, 70)
    ctx.fillText(`Year: ${currentYear}`, 20, 90)
    ctx.fillText(`Data Points: ${occurrenceData.length}`, 20, 110)

    // Add timestamp
    const timestamp = new Date().toLocaleString()
    ctx.font = "10px Arial"
    ctx.fillStyle = "#666"
    ctx.fillText(`Generated: ${timestamp}`, 20, 125)
  }

  const exportAsSVG = async (): Promise<string> => {
    const canvas = canvasRef.current
    if (!canvas) return ""

    const svgWidth = canvas.width
    const svgHeight = canvas.height

    let svgContent = `
      <svg width="${svgWidth}" height="${svgHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            .metadata-text { font-family: Arial, sans-serif; font-size: 12px; fill: #333; }
            .title-text { font-family: Arial, sans-serif; font-size: 14px; font-weight: bold; fill: #333; }
          </style>
        </defs>
    `

    // Add heatmap data as rectangles
    const cellWidth = svgWidth / heatmapData[0]?.length || 1
    const cellHeight = svgHeight / heatmapData.length

    heatmapData.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value > 0) {
          const intensity = value / Math.max(...heatmapData.flat())
          const opacity = intensity * 0.8
          svgContent += `<rect x="${x * cellWidth}" y="${y * cellHeight}" width="${cellWidth}" height="${cellHeight}" fill="red" opacity="${opacity}" />`
        }
      })
    })

    // Add metadata if requested
    if (includeMetadata) {
      svgContent += `
        <rect x="10" y="10" width="300" height="120" fill="white" opacity="0.9" stroke="#333" strokeWidth="1" />
        <text x="20" y="30" class="title-text">Marine Species Distribution Heatmap</text>
        <text x="20" y="50" class="metadata-text">Species: ${selectedSpecies?.scientificName || "All Species"}</text>
        <text x="20" y="70" class="metadata-text">Region: ${selectedRegion?.name || "All Regions"}</text>
        <text x="20" y="90" class="metadata-text">Year: ${currentYear}</text>
        <text x="20" y="110" class="metadata-text">Data Points: ${occurrenceData.length}</text>
      `
    }

    svgContent += "</svg>"

    const blob = new Blob([svgContent], { type: "image/svg+xml" })
    return URL.createObjectURL(blob)
  }

  const exportAsCSV = () => {
    setIsExporting(true)
    try {
      let csvContent = "x,y,latitude,longitude,density,normalized_density\n"

      const bounds = {
        north: 6,
        south: -11,
        east: 141,
        west: 95,
      }

      const maxDensity = Math.max(...heatmapData.flat())

      heatmapData.forEach((row, y) => {
        row.forEach((density, x) => {
          const lat = bounds.north - (y / heatmapData.length) * (bounds.north - bounds.south)
          const lng = bounds.west + (x / row.length) * (bounds.east - bounds.west)
          const normalizedDensity = maxDensity > 0 ? density / maxDensity : 0

          csvContent += `${x},${y},${lat.toFixed(6)},${lng.toFixed(6)},${density},${normalizedDensity.toFixed(6)}\n`
        })
      })

      // Add metadata as comments if requested
      if (includeMetadata) {
        const metadata = `# Marine Species Distribution Heatmap Data
# Species: ${selectedSpecies?.scientificName || "All Species"}
# Region: ${selectedRegion?.name || "All Regions"}
# Year: ${currentYear}
# Data Points: ${occurrenceData.length}
# Generated: ${new Date().toISOString()}
# Grid Size: ${heatmapData[0]?.length || 0}x${heatmapData.length}
# Coordinate Bounds: ${bounds.south}°S to ${bounds.north}°N, ${bounds.west}°E to ${bounds.east}°E
#
`
        csvContent = metadata + csvContent
      }

      const blob = new Blob([csvContent], { type: "text/csv" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.download = generateFileName("csv")
      link.href = url
      link.click()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting CSV:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsJSON = () => {
    setIsExporting(true)
    try {
      const bounds = {
        north: 6,
        south: -11,
        east: 141,
        west: 95,
      }

      const maxDensity = Math.max(...heatmapData.flat())

      const exportData: {
        metadata: {
          species: any
          region: any
          year: number
          dataPoints: number
          generated: string
          gridSize: { width: number; height: number }
          coordinateBounds: { north: number; south: number; east: number; west: number }
          maxDensity: number
        }
        heatmapData: any[][]
        rawOccurrenceData?: any[]
      } = {
        metadata: {
          species: selectedSpecies?.scientificName || "All Species",
          region: selectedRegion?.name || "All Regions",
          year: currentYear,
          dataPoints: occurrenceData.length,
          generated: new Date().toISOString(),
          gridSize: {
            width: heatmapData[0]?.length || 0,
            height: heatmapData.length,
          },
          coordinateBounds: bounds,
          maxDensity,
        },
        heatmapData: heatmapData.map((row, y) =>
          row.map((density, x) => {
            const lat = bounds.north - (y / heatmapData.length) * (bounds.north - bounds.south)
            const lng = bounds.west + (x / row.length) * (bounds.east - bounds.west)
            return {
              gridX: x,
              gridY: y,
              latitude: Number.parseFloat(lat.toFixed(6)),
              longitude: Number.parseFloat(lng.toFixed(6)),
              density,
              normalizedDensity: maxDensity > 0 ? Number.parseFloat((density / maxDensity).toFixed(6)) : 0,
            }
          }),
        ),
      }

      // Include raw occurrence data if requested
      if (includeRawData) {
        exportData.rawOccurrenceData = occurrenceData.map((record) => ({
          gbifID: record.gbifID,
          scientificName: record.scientificName,
          latitude: record.decimalLatitude,
          longitude: record.decimalLongitude,
          year: record.year,
          depth: record.depth,
          locality: record.locality,
          stateProvince: record.stateProvince,
        }))
      }

      const jsonString = JSON.stringify(exportData, null, 2)
      const blob = new Blob([jsonString], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.download = generateFileName("json")
      link.href = url
      link.click()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting JSON:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportAsGeoJSON = () => {
    setIsExporting(true)
    try {
      const bounds = {
        north: 6,
        south: -11,
        east: 141,
        west: 95,
      }

      const maxDensity = Math.max(...heatmapData.flat())

      const features: any[] = []

      // Add heatmap grid as features
      heatmapData.forEach((row, y) => {
        row.forEach((density, x) => {
          if (density > 0) {
            const lat = bounds.north - (y / heatmapData.length) * (bounds.north - bounds.south)
            const lng = bounds.west + (x / row.length) * (bounds.east - bounds.west)
            const cellHeight = (bounds.north - bounds.south) / heatmapData.length
            const cellWidth = (bounds.east - bounds.west) / row.length

            features.push({
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [lng, lat],
                    [lng + cellWidth, lat],
                    [lng + cellWidth, lat - cellHeight],
                    [lng, lat - cellHeight],
                    [lng, lat],
                  ],
                ],
              },
              properties: {
                gridX: x,
                gridY: y,
                density,
                normalizedDensity: maxDensity > 0 ? Number.parseFloat((density / maxDensity).toFixed(6)) : 0,
                species: selectedSpecies?.scientificName || "All Species",
                region: selectedRegion?.name || "All Regions",
                year: currentYear,
              },
            })
          }
        })
      })

      // Add occurrence points if requested
      if (includeRawData) {
        occurrenceData.forEach((record) => {
          if (record.decimalLatitude && record.decimalLongitude) {
            features.push({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [record.decimalLongitude, record.decimalLatitude],
              },
              properties: {
                type: "occurrence",
                gbifID: record.gbifID,
                scientificName: record.scientificName,
                year: record.year,
                depth: record.depth,
                locality: record.locality,
                stateProvince: record.stateProvince,
              },
            })
          }
        })
      }

      const geoJSON = {
        type: "FeatureCollection",
        metadata: {
          species: selectedSpecies?.scientificName || "All Species",
          region: selectedRegion?.name || "All Regions",
          year: currentYear,
          generated: new Date().toISOString(),
          totalFeatures: features.length,
        },
        features,
      }

      const jsonString = JSON.stringify(geoJSON, null, 2)
      const blob = new Blob([jsonString], { type: "application/geo+json" })
      const url = URL.createObjectURL(blob)

      const link = document.createElement("a")
      link.download = generateFileName("geojson")
      link.href = url
      link.click()

      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Error exporting GeoJSON:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExport = () => {
    switch (exportFormat) {
      case "png":
      case "jpeg":
      case "svg":
        exportAsImage(exportFormat as "png" | "jpeg" | "svg")
        break
      case "csv":
        exportAsCSV()
        break
      case "json":
        exportAsJSON()
        break
      case "geojson":
        exportAsGeoJSON()
        break
    }
  }

  if (!isVisible) {
    return (
      <Button
        variant="secondary"
        size="icon"
        onClick={onToggle}
        className="absolute top-32 right-4 bg-white shadow-lg hover:bg-gray-50"
        title="Export Options"
      >
        <Download className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <Card className="absolute top-32 right-4 w-80 bg-white shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Options
          </div>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            ×
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Export Format */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Export Format</label>
          <Select value={exportFormat} onValueChange={setExportFormat}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  PNG Image
                </div>
              </SelectItem>
              <SelectItem value="jpeg">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  JPEG Image
                </div>
              </SelectItem>
              <SelectItem value="svg">
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  SVG Vector
                </div>
              </SelectItem>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  CSV Data
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  JSON Data
                </div>
              </SelectItem>
              <SelectItem value="geojson">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  GeoJSON
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* File Name */}
        <div className="space-y-2">
          <label className="text-xs font-medium">Custom File Name (optional)</label>
          <Input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="Leave empty for auto-generated name"
            className="text-xs"
          />
          <div className="text-xs text-gray-500">
            Preview: {generateFileName(exportFormat.includes("json") ? exportFormat : exportFormat)}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="metadata" checked={includeMetadata} onCheckedChange={checked => setIncludeMetadata(checked === true)} />
            <label htmlFor="metadata" className="text-xs">
              Include metadata
            </label>
          </div>

          {(exportFormat === "json" || exportFormat === "geojson") && (
            <div className="flex items-center space-x-2">
              <Checkbox id="rawdata" checked={includeRawData} onCheckedChange={checked => setIncludeRawData(checked === true)} />
              <label htmlFor="rawdata" className="text-xs">
                Include raw occurrence data
              </label>
            </div>
          )}
        </div>

        {/* Export Button */}
        <Button onClick={handleExport} disabled={isExporting} className="w-full">
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export {exportFormat.toUpperCase()}
            </>
          )}
        </Button>

        {/* Format Info */}
        <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
          {exportFormat === "png" && "High-quality raster image with transparency support"}
          {exportFormat === "jpeg" && "Compressed raster image, smaller file size"}
          {exportFormat === "svg" && "Scalable vector graphics, perfect for print"}
          {exportFormat === "csv" && "Tabular data with coordinates and density values"}
          {exportFormat === "json" && "Structured data with metadata and grid information"}
          {exportFormat === "geojson" && "Geographic data format for GIS applications"}
        </div>
      </CardContent>
    </Card>
  )
}
