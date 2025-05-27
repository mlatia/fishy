"use client"
import { MapProvider } from "@/components/map-provider"
import { MainMap } from "@/components/main-map"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { TimelineControl } from "@/components/timeline-control"
import { SpeciesProvider } from "@/contexts/species-context"

export default function HomePage() {
  return (
    <SpeciesProvider>
      <div className="h-screen flex flex-col bg-gray-50">
        <Header />
        <div className="flex-1 flex relative">
          <MapProvider>
            <MainMap />
            <Sidebar />
            <TimelineControl />
          </MapProvider>
        </div>
      </div>
    </SpeciesProvider>
  )
}
