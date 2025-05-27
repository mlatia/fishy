"use client"

import { Fish, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <Fish className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">OceanMarine</h1>
          <p className="text-sm text-gray-500">Indonesian Marine Biodiversity Platform</p>
        </div>
      </div>

      {/* <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          Single Species
        </Button>
        <Button variant="outline" size="sm">
          Regional Summary
        </Button>
        <Button variant="ghost" size="sm">
          <Menu className="w-4 h-4" />
        </Button>
      </div> */}
    </header>
  )
}
