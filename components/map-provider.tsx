"use client"

import { createContext, useContext, type ReactNode } from "react"

interface MapContextType {
  // Map context can be expanded later for Mapbox integration
  mapLoaded: boolean
}

const MapContext = createContext<MapContextType | undefined>(undefined)

export function MapProvider({ children }: { children: ReactNode }) {
  const value = {
    mapLoaded: true,
  }

  return <MapContext.Provider value={value}>{children}</MapContext.Provider>
}

export function useMap() {
  const context = useContext(MapContext)
  if (context === undefined) {
    throw new Error("useMap must be used within a MapProvider")
  }
  return context
}
