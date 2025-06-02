"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Palette, Layers } from 'lucide-react'

interface HeatmapControlsProps {
  isVisible: boolean
  onToggle: () => void
  intensity: number
  onIntensityChange: (value: number) => void
  blurRadius: number
  onBlurRadiusChange: (value: number) => void
  colorScheme: string
  onColorSchemeChange: (scheme: string) => void
}

export function HeatmapControls({
  isVisible,
  onToggle,
  intensity,
  onIntensityChange,
  blurRadius,
  onBlurRadiusChange,
  colorScheme,
  onColorSchemeChange,
}: HeatmapControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const colorSchemes = [
    { id: "thermal", name: "Thermal (Blue-Red)", colors: ["#0000FF", "#00FF00", "#FFFF00", "#FF6500", "#FF0000"] },
    { id: "ocean", name: "Ocean (Blue-Cyan)", colors: ["#000080", "#0080FF", "#00FFFF", "#80FFFF", "#FFFFFF"] },
    { id: "forest", name: "Forest (Green-Yellow)", colors: ["#004000", "#008000", "#40FF40", "#FFFF00", "#FF8000"] },
    { id: "sunset", name: "Sunset (Purple-Orange)", colors: ["#400040", "#800080", "#FF0080", "#FF8000", "#FFFF00"] },
  ]

  if (!isVisible) {
    return (
      <Button
        variant="secondary"
        size="icon"
        onClick={onToggle}
        className="absolute top-20 right-4 bg-white shadow-lg hover:bg-gray-50"
        title="Heatmap Settings"
      >
        <Settings className="w-4 h-4" />
      </Button>
    )
  }

  return (
    <Card className="absolute top-20 right-4 w-80 bg-white shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Heatmap Settings
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? "−" : "+"}
          </Button>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Intensity Control */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Intensity: {intensity}%</label>
            <Slider
              value={[intensity]}
              onValueChange={(value) => onIntensityChange(value[0])}
              max={200}
              min={10}
              step={10}
              className="w-full"
            />
          </div>

          {/* Blur Radius Control */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Blur Radius: {blurRadius.toFixed(1)}</label>
            <Slider
              value={[blurRadius]}
              onValueChange={(value) => onBlurRadiusChange(value[0])}
              max={5}
              min={0.5}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Color Scheme */}
          <div className="space-y-2">
            <label className="text-xs font-medium">Color Scheme</label>
            <Select value={colorScheme} onValueChange={onColorSchemeChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {colorSchemes.map((scheme) => (
                  <SelectItem key={scheme.id} value={scheme.id}>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {scheme.colors.map((color, index) => (
                          <div
                            key={index}
                            className="w-3 h-3"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span className="text-xs">{scheme.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onIntensityChange(100)
                onBlurRadiusChange(1.5)
                onColorSchemeChange("thermal")
              }}
              className="flex-1 text-xs"
            >
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
              className="flex-1 text-xs"
            >
              Close
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
