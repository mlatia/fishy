"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Map, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SpeciesAnalysis } from "@/components/species-analysis"
import { RegionalSummary } from "@/components/regional-summary"
// import { useSpecies } from "@/contexts/species-context"

interface SidebarProps {
  showHeatmap: boolean 
  onHeatmapToggle: () => void 
}

export function Sidebar({ showHeatmap, onHeatmapToggle }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<"species" | "regional">("species")
  const [isCollapsed, setIsCollapsed] = useState(true)
  if (!isOpen) {
    return (
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={() => {
            setIsOpen(true)
            setIsCollapsed(true)
          }}
          variant="secondary"
          size="icon"
          className="rounded-full"
        >
          <Map className="w-5 h-5" />
        </Button>
      </div>
    )
  }

  const handleCollapsedTabClick = (tab: "species" | "regional") => {
    setActiveTab(tab)
    setIsCollapsed(false)
  }

  return (
    <div
      className={`absolute top-0 left-0 h-full bg-white shadow-lg z-10 flex flex-col transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-96"
      }`}
    >
      <div className="p-2 border-b flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex gap-2">
            <Button
              className={`flex items-center gap-2 px-3 py-1 text-sm rounded ${
                activeTab === "species"
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "bg-transparent hover:bg-gray-100 text-gray-700"
              }`}
              onClick={() => setActiveTab("species")}
            >
              <Map className="w-4 h-4" />
              Single Species Analysis
            </Button>

          </div>
        )}

        <div className={isCollapsed ? "ml-1" : "ml-4"}>
          <div className="bg-white rounded shadow border">
            <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!isCollapsed ? (
          activeTab === "species" ? <SpeciesAnalysis /> : <RegionalSummary />
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <Button variant="ghost" size="icon" onClick={() => handleCollapsedTabClick("species")}
              className={activeTab === "species" ? "bg-blue-100" : ""}
              title="Single Species Analysis">
              <Map className="w-5 h-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
