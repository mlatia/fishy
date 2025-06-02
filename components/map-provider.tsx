// Create the missing MapProvider component
"use client"

import { createContext, useContext, type ReactNode } from "react"

type MapContextType = {}

const MapContext = createContext<MapContextType | undefined>(undefined)

export function MapProvider({ children }: { children: ReactNode }) {
  return <div className="flex-1 flex relative">{children}</div>
}

export function useMap() {
  const context = useContext(MapContext)
  if (context === undefined) {
    throw new Error("useMap must be used within a MapProvider")
  }
  return context
}
