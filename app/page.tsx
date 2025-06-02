"use client"
import { useState } from "react"
import { MapProvider } from "@/components/map-provider"
import { MainMap } from "@/components/main-map"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { TimelineControl } from "@/components/timeline-control"
import { SpeciesProvider } from "@/contexts/species-context"

export default function HomePage() {
  const [currentYear, setCurrentYear] = useState(2010)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)

  const handleYearChange = (year: number | ((prev: number) => number)) => {
    if (typeof year === "function") {
      setCurrentYear(year)
    } else {
      setCurrentYear(year)
    }
  }

  const handlePlayToggle = () => {
    setIsPlaying(!isPlaying)
  }

  return (
    <SpeciesProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex relative">
          <MapProvider>
            <MainMap
              currentYear={currentYear}
              isPlaying={isPlaying}
              showHeatmap={showHeatmap}
              onHeatmapToggle={() => setShowHeatmap(!showHeatmap)}
            />
            <Sidebar showHeatmap={showHeatmap} onHeatmapToggle={() => setShowHeatmap(!showHeatmap)} />
            <TimelineControl
              currentYear={currentYear}
              onYearChange={handleYearChange}
              isPlaying={isPlaying}
              onPlayToggle={handlePlayToggle}
            />
          </MapProvider>
        </div>
      </div>
    </SpeciesProvider>
  )
}
