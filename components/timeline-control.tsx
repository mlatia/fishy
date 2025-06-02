"use client"

import { useState, useEffect } from "react"
import Draggable from "react-draggable"
import { Play, Pause, SkipBack, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { dataLoader } from "@/lib/data-loader"

interface TimelineControlProps {
  currentYear: number
  onYearChange: (year: number) => void
  isPlaying: boolean
  onPlayToggle: () => void
}

export function TimelineControl({ currentYear, onYearChange, isPlaying, onPlayToggle }: TimelineControlProps) {
  const [yearRange, setYearRange] = useState<[number, number]>([1990, 2024])
  const [playbackSpeed, setPlaybackSpeed] = useState(1000) // ms per year

  useEffect(() => {
    // Load year range from data
    const loadYearRange = async () => {
      try {
        await dataLoader.loadOccurrenceData()
        const range = dataLoader.getYearRange()
        setYearRange(range)
      } catch (error) {
        console.error("Error loading year range:", error)
      }
    }
    loadYearRange()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout

    if (isPlaying) {
      interval = setInterval(() => {
        onYearChange(currentYear >= yearRange[1] ? yearRange[0] : currentYear + 1)
      }, playbackSpeed)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPlaying, playbackSpeed, yearRange, onYearChange, currentYear])

  const handleSkipBack = () => {
    onYearChange(Math.max(yearRange[0], currentYear - 5))
  }

  const handleSkipForward = () => {
    onYearChange(Math.min(yearRange[1], currentYear + 5))
  }

  const handleSliderChange = (value: number[]) => {
    onYearChange(value[0])
  }

  // Generate year markers for the timeline
  const generateYearMarkers = () => {
    const markers = []
    const step = Math.ceil((yearRange[1] - yearRange[0]) / 6)

    for (let year = yearRange[0]; year <= yearRange[1]; year += step) {
      markers.push(year)
    }

    if (markers[markers.length - 1] !== yearRange[1]) {
      markers.push(yearRange[1])
    }

    return markers
  }

  const yearMarkers = generateYearMarkers()

  return (
    <Draggable handle=".drag-handle">
      <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 min-w-96 z-50">
        <div className="text-center mb-3 drag-handle cursor-move">
          <h3 className="font-medium text-sm">Kondisi dalam periode waktu</h3>
        </div>

        <div className="space-y-3">
          {/* Timeline Slider */}
          <div className="px-2">
            <Slider
              value={[currentYear]}
              onValueChange={handleSliderChange}
              max={yearRange[1]}
              min={yearRange[0]}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              {yearMarkers.map((year) => (
                <span key={year}>{year}</span>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleSkipBack} title="Skip back 5 years">
              <SkipBack className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onPlayToggle}
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleSkipForward}
              title="Skip forward 5 years"
            >
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center justify-center gap-2 text-xs">
            <span>Speed:</span>
            <Button
              variant={playbackSpeed === 2000 ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2"
              onClick={() => setPlaybackSpeed(2000)}
            >
              0.5x
            </Button>
            <Button
              variant={playbackSpeed === 1000 ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2"
              onClick={() => setPlaybackSpeed(1000)}
            >
              1x
            </Button>
            <Button
              variant={playbackSpeed === 500 ? "default" : "ghost"}
              size="sm"
              className="h-6 px-2"
              onClick={() => setPlaybackSpeed(500)}
            >
              2x
            </Button>
          </div>

          {/* Year Display */}
          <div className="flex justify-between text-xs">
            <span>1/1/{yearRange[0]}</span>
            <span className="font-medium text-lg">{currentYear}</span>
            <span>1/4/{yearRange[1]}</span>
          </div>
        </div>
      </div>
    </Draggable>
  )
}
