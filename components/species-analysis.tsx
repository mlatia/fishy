"use client"

import { useState, useEffect } from "react"
import { Fish, Thermometer, Droplets, Leaf, Ruler, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useSpecies } from "@/contexts/species-context"
import { dataLoader, type SpeciesInfo, type IndonesianRegion } from "@/lib/data-loader"
import { apiService } from "@/lib/api-service"
import { Button } from "@/components/ui/button"

export function SpeciesAnalysis() {
  const { selectedSpecies, setSelectedSpecies, selectedRegion, setSelectedRegion } = useSpecies()
  const [speciesData, setSpeciesData] = useState<SpeciesInfo[]>([])
  const [regionsData, setRegionsData] = useState<IndonesianRegion[]>([])
  const [environmentalData, setEnvironmentalData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fastaSpecies, setFastaSpecies] = useState<any[]>([])
  const [isTraining, setIsTraining] = useState(false)
  const [modelStatus, setModelStatus] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedSpecies && selectedRegion) {
      loadAnalysisData()
    }
  }, [selectedSpecies, selectedRegion])

  const loadData = async () => {
    try {
      setLoading(true)
      await dataLoader.loadOccurrenceData()

      const species = dataLoader.getSpecies()
      const regions = dataLoader.getRegions()

      // Load FASTA species from API
      const fastaSpeciesData = await apiService.getFastaSpecies()

      setSpeciesData(species)
      setRegionsData(regions)
      setFastaSpecies(fastaSpeciesData)

      // Auto-select first FASTA species if available
      if (!selectedSpecies && fastaSpeciesData.length > 0) {
        setSelectedSpecies({
          id: fastaSpeciesData[0].id,
          name: fastaSpeciesData[0].commonName,
          scientificName: fastaSpeciesData[0].scientificName,
        })
      } else if (!selectedSpecies && species.length > 0) {
        setSelectedSpecies(species[0])
      }

      if (!selectedRegion && regions.length > 0) {
        const { province = "Unknown", ...rest } = regions[0]
        setSelectedRegion({ ...rest, province })
      }
    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalysisData = async () => {
    if (!selectedSpecies || !selectedRegion) return

    try {
      // Get occurrence data for this species in this region
      const occurrences = dataLoader
        .getOccurrencesByRegion(selectedRegion.id)
        .filter((record) => record.scientificName === selectedSpecies.scientificName)

      // Calculate environmental statistics
      const depths = occurrences.map((r) => r.depth).filter((d): d is number => d != null)
      const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 12

      // Mock environmental data based on region
      const mockEnvData = {
        temperature: 28.7 + (Math.random() - 0.5) * 2,
        salinity: 34.1 + (Math.random() - 0.5) * 0.8,
        chlorophyll: 0.21 + (Math.random() - 0.5) * 0.1,
        depth: Math.round(avgDepth) || 12,
        region: selectedRegion.name,
        occurrenceCount: occurrences.length,
      }

      setEnvironmentalData(mockEnvData)
    } catch (error) {
      console.error("Error loading analysis data:", error)
    }
  }

  const handleTrainModel = async () => {
    if (!selectedSpecies) return

    setIsTraining(true)
    try {
      await apiService.trainModel(selectedSpecies.id)
      // Refresh model status
      const status = await apiService.getModelStatus(selectedSpecies.id)
      setModelStatus(status)
    } catch (error) {
      console.error("Error training model:", error)
    } finally {
      setIsTraining(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        <span>Loading species data...</span>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Fish className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-semibold">Single Species Analysis</h2>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Pilih Spesies *</label>
        <Select
          value={selectedSpecies?.id}
          onValueChange={(value) => {
            const species = speciesData.find((s) => s.id === value)
            setSelectedSpecies(species || null)
          }}
        >
          <SelectTrigger className="bg-white text-black">
            <SelectValue placeholder="Pilih spesies..." />
          </SelectTrigger>
          <SelectContent className="bg-white text-black max-h-60">
            {fastaSpecies.length > 0 && (
              <>
                <SelectItem disabled value="fasta-header">
                  <span className="font-medium text-blue-600">FASTA Species (Genetic Data Available)</span>
                </SelectItem>
                {fastaSpecies.map((species) => (
                  <SelectItem key={species.id} value={species.id}>
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2">
                        {species.scientificName}
                        <span className="text-xs bg-blue-100 text-blue-800 px-1 rounded">DNA</span>
                      </span>
                      <span className="text-xs text-gray-500">
                        {species.commonName} • {species.sequenceCount} sequences
                      </span>
                    </div>
                  </SelectItem>
                ))}
                <SelectItem disabled value="divider">
                  <span className="font-medium text-gray-600">Other Species</span>
                </SelectItem>
              </>
            )}
            {speciesData.map((species) => (
              <SelectItem key={species.id} value={species.id}>
                <div className="flex flex-col">
                  <span>{species.scientificName}</span>
                  <span className="text-xs text-gray-500">
                    {species.commonName} • {species.occurrenceCount} records
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Pilih Daerah *</label>
        <Select
          value={selectedRegion?.id}
          onValueChange={(value) => {
            const region = regionsData.find((r) => r.id === value)
            if (region) {
              const safeRegion = {
                ...region,
                province: region.province ?? "Unknown", // fallback kalau undefined
              }
              setSelectedRegion(safeRegion)
            } else {
              setSelectedRegion(null)
            }
          }}
        >
          <SelectTrigger className="bg-white text-black">
            <SelectValue placeholder="Pilih daerah..." />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {regionsData.map((region) => (
              <SelectItem key={region.id} value={region.id}>
                <div className="flex flex-col">
                  <span>{region.name}</span>
                  <span className="text-xs text-gray-500">
                    {region.province || "Unknown"} • {region.occurrenceCount} records
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSpecies && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Model Training</label>
            <Button size="sm" onClick={handleTrainModel} disabled={isTraining} className="text-xs">
              {isTraining ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Training...
                </>
              ) : (
                "Train Model"
              )}
            </Button>
          </div>
          {modelStatus && (
            <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
              Status: {modelStatus.model_trained ? "Trained" : "Not Trained"}
              {modelStatus.statistics && <div>Data: {modelStatus.statistics.presence_records} presence records</div>}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {selectedSpecies && selectedRegion && environmentalData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Result :</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Environmental Conditions */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="w-4 h-4 text-red-500" />
                <span>Suhu permukaan laut: {environmentalData.temperature.toFixed(1)}°C</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="w-4 h-4 text-blue-500" />
                <span>Salinitas: {environmentalData.salinity.toFixed(1)} PSU</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Leaf className="w-4 h-4 text-green-500" />
                <span>Klorofil a: {environmentalData.chlorophyll.toFixed(2)} mg/m³</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Ruler className="w-4 h-4 text-purple-500" />
                <span>Kedalaman sampling: {environmentalData.depth} meter</span>
              </div>
            </div>

            {/* Occurrence Statistics */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Data Kejadian:</h4>
              <div className="space-y-1 text-sm">
                <div>- Total records: {environmentalData.occurrenceCount}</div>
                <div>- Daerah: {selectedRegion.name}</div>
                <div>- Provinsi: {selectedRegion.province || "Unknown"}</div>
              </div>
            </div>

            {/* Mock Predictions */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Prediksi kehadiran di wilayah sekitar:</h4>
              <div className="space-y-1 text-sm">
                <div>- Area Utara: {(Math.random() * 40 + 60).toFixed(1)}%</div>
                <div>- Area Selatan: {(Math.random() * 30 + 50).toFixed(1)}%</div>
                <div className="flex items-center gap-1">
                  <span>- Area Timur: {(Math.random() * 20 + 80).toFixed(1)}%</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div>- Area Barat: {(Math.random() * 35 + 45).toFixed(1)}%</div>
              </div>
            </div>

            {/* Conservation Status */}
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-800">Status IUCN: Data Deficient</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
