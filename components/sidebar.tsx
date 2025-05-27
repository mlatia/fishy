"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpeciesAnalysis } from "@/components/species-analysis"
import { RegionalSummary } from "@/components/regional-summary"
import { useSpecies } from "@/contexts/species-context"

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<"species" | "regional">("species")
  const { selectedSpecies, setSelectedSpecies, selectedRegion, setSelectedRegion } = useSpecies()

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="absolute top-4 left-4 z-10" variant="secondary">
        Open Analysis
      </Button>
    )
  }

  return (
    <div className="absolute top-0 left-0 w-96 h-full bg-white shadow-lg z-10 flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={activeTab === "species" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("species")}
          >
            Single Species Analysis
          </Button>
          <Button
            variant={activeTab === "regional" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("regional")}
          >
            Regional Summary
          </Button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === "species" ? <SpeciesAnalysis /> : <RegionalSummary />}
      </div>
    </div>
  )
}
