"use client"

import { useState } from "react"
import Draggable from "react-draggable"
import { Play, Pause, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

export function TimelineControl() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentYear, setCurrentYear] = useState([2010])

  const minYear = 1990
  const maxYear = 2024

  return (
    <Draggable>
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 min-w-96 cursor-move z-50">
        <div className="text-center mb-3">
          <h3 className="font-medium text-sm">Kondisi dalam periode waktu</h3>
        </div>

        <div className="space-y-3">
          {/* Timeline Slider */}
          <div className="px-2">
            <Slider
              value={currentYear}
              onValueChange={setCurrentYear}
              max={maxYear}
              min={minYear}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{minYear}</span>
              <span>2000</span>
              <span>2005</span>
              <span>2010</span>
              <span>2015</span>
              <span>2020</span>
              <span>{maxYear}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Year Display */}
          <div className="flex justify-between text-xs">
            <span>1/1/{minYear}</span>
            <span className="font-medium">{currentYear[0]}</span>
            <span>1/4/{maxYear}</span>
          </div>
        </div>
      </div>
    </Draggable>
  )
}
