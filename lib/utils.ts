import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Additional utility functions for the marine biodiversity platform
export function formatCoordinate(coord: number, type: "lat" | "lng"): string {
  const direction = type === "lat" ? (coord >= 0 ? "N" : "S") : coord >= 0 ? "E" : "W"
  return `${Math.abs(coord).toFixed(4)}°${direction}`
}

export function formatDepth(depth: number | null | undefined): string {
  if (depth === null || depth === undefined) return "Unknown"
  return `${depth.toFixed(1)}m`
}

export function formatSpeciesName(scientificName: string): string {
  return scientificName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

export function generateColorFromValue(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min)
  const hue = (1 - normalized) * 240 // Blue to red
  return `hsl(${hue}, 70%, 50%)`
}

export function downloadFile(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
