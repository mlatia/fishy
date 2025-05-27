"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

interface Species {
  id: string
  name: string
}

interface Region {
  id: string
  name: string
}

interface SpeciesContextType {
  selectedSpecies: Species | null
  setSelectedSpecies: (species: Species | null) => void
  selectedRegion: Region | null
  setSelectedRegion: (region: Region | null) => void
  speciesData: any[]
}

const SpeciesContext = createContext<SpeciesContextType | undefined>(undefined)

export function SpeciesProvider({ children }: { children: ReactNode }) {
  const [selectedSpecies, setSelectedSpecies] = useState<Species | null>(null)
  const [selectedRegion, setSelectedRegion] = useState<Region | null>(null)
  const [speciesData] = useState([]) // Dummy data placeholder

  const value = {
    selectedSpecies,
    setSelectedSpecies,
    selectedRegion,
    setSelectedRegion,
    speciesData,
  }

  return <SpeciesContext.Provider value={value}>{children}</SpeciesContext.Provider>
}

export function useSpecies() {
  const context = useContext(SpeciesContext)
  if (context === undefined) {
    throw new Error("useSpecies must be used within a SpeciesProvider")
  }
  return context
}
