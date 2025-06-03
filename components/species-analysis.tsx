"use client"

import { useState, useEffect } from "react"
import { Fish, Thermometer, Droplets, Leaf, Ruler, AlertTriangle, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useSpecies } from "@/contexts/species-context"
import { dataLoader, type SpeciesInfo, type IndonesianRegion } from "@/lib/data-loader"
import { apiService } from "@/lib/api-service"
import { Button } from "@/components/ui/button"

interface PredictionData {
  decimalLatitude: number
  decimalLongitude: number
  depth?: number
  prediction: number
  salinity?: number
  temperature?: number
}

interface AnalysisData {
  timespan: number
  depthChanges: Array<{ year: number; depth: number }>
  latitudeShift: number
  averageDepthChange: number
  totalPredictions: number
}

export function SpeciesAnalysis() {
  const { selectedSpecies, setSelectedSpecies, selectedRegion, setSelectedRegion } = useSpecies()
  const [speciesData, setSpeciesData] = useState<SpeciesInfo[]>([])
  const [regionsData, setRegionsData] = useState<IndonesianRegion[]>([])
  const [environmentalData, setEnvironmentalData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fastaSpecies, setFastaSpecies] = useState<any[]>([])
  const [isTraining, setIsTraining] = useState(false)
  const [modelStatus, setModelStatus] = useState<any>(null)
  const [predictions, setPredictions] = useState<PredictionData[]>([])
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [predictionLoading, setPredictionLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (selectedSpecies && selectedRegion) {
      loadAnalysisData()
    }
  }, [selectedSpecies, selectedRegion])

  useEffect(() => {
    if (selectedSpecies) {
      loadPredictions()
    }
  }, [selectedSpecies])

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
        })
      } else if (!selectedSpecies && species.length > 0) {
        setSelectedSpecies(species[0])
      }

    } catch (error) {
      console.error("Error loading data:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadPredictions = async () => {
    if (!selectedSpecies) return

    setPredictionLoading(true)
    try {
      const response = await apiService.getPredictions(selectedSpecies.id)
      
      // Handle the API response structure
      let predictionData: PredictionData[] = []
      if (response) {
        predictionData = Array.isArray(response) ? response : [response]
      }
      
      setPredictions(predictionData)
      console.log('Loaded predictions:', predictionData.length)
      
      // Process predictions for analysis
      if (predictionData.length > 0) {
        processPredictionAnalysis(predictionData)
      }
    } catch (error) {
      console.error("Error loading predictions:", error)
      setPredictions([])
      setAnalysisData(null)
    } finally {
      setPredictionLoading(false)
    }
  }

  const processPredictionAnalysis = (predictionData: PredictionData[]) => {
    if (predictionData.length === 0) return

    const startYear = 0
    const timespan = predictionData.length
  
    const depthChanges = predictionData.map((prediction, index) => ({
      year: startYear + index,
      depth: prediction.depth || 12 
    }))

    const firstDepth = depthChanges[0]?.depth || 12
    const lastDepth = depthChanges[depthChanges.length - 1]?.depth || 12
    const averageDepthChange = firstDepth - lastDepth 

    const firstLatitude = predictionData[0]?.decimalLatitude || 0
    const lastLatitude = predictionData[predictionData.length - 1]?.decimalLatitude || 0
    const latitudeShift = Math.abs(lastLatitude - firstLatitude)

    const analysis: AnalysisData = {
      timespan,
      depthChanges,
      latitudeShift: Number(latitudeShift.toFixed(2)),
      averageDepthChange: Number(averageDepthChange.toFixed(2)),
      totalPredictions: predictionData.length
    }

    setAnalysisData(analysis)
  }

  const loadAnalysisData = async () => {
    if (!selectedSpecies || !selectedRegion) return

    try {
    
      const occurrences = dataLoader
        .getOccurrencesByRegion(selectedRegion.id)
        .filter((record) => record.scientificName === selectedSpecies.name)

      const depths = occurrences.map((r) => r.depth).filter((d): d is number => d != null)
      const avgDepth = depths.length > 0 ? depths.reduce((a, b) => a + b, 0) / depths.length : 12

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
            const species = speciesData.find((s) => s.id === value) || 
                           fastaSpecies.find((s) => s.id === value)
            if (species) {
              setSelectedSpecies({
                id: species.id,
                name: species.scientificName || species.commonName,
              })
            }
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


      {predictionLoading && (
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading prediction analysis...</span>
          </CardContent>
        </Card>
      )}

      {analysisData && !predictionLoading && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Perubahan Kedalaman Spesies Laut</CardTitle>
              <p className="text-sm text-gray-600">
                Dalam {analysisData.timespan} tahun prediksi terjadi perubahan dengan rata-rata perubahan sebesar {Math.abs(analysisData.averageDepthChange).toFixed(2)} meter {analysisData.averageDepthChange > 0 ? 'lebih dekat ke permukaan laut' : 'lebih dalam'}.
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analysisData.depthChanges}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="depth"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pergeseran Spesies Laut</CardTitle>
              <p className="text-sm text-gray-600">
                Secara rata-rata bergeser posisi habitatnya sebesar {analysisData.latitudeShift}° lintang dalam kurun waktu {analysisData.timespan} tahun prediksi.
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-2xl font-bold text-blue-600">{analysisData.latitudeShift}°</div>
                <div className="text-sm text-gray-500">Pergeseran Lintang</div>
                <div className="text-xs text-gray-400 mt-2">dalam {analysisData.timespan} tahun prediksi</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informasi Prediksi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-xl font-bold text-green-600">{analysisData.totalPredictions}</div>
                  <div className="text-sm text-gray-500">Total Prediksi</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-purple-600">{analysisData.timespan}</div>
                  <div className="text-sm text-gray-500">Rentang Waktu (tahun)</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {environmentalData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="w-4 h-4" />
              Environmental Conditions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-red-500" />
                <div>
                  <div className="text-sm text-gray-600">Temperature</div>
                  <div className="font-medium">{environmentalData.temperature.toFixed(1)}°C</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-500" />
                <div>
                  <div className="text-sm text-gray-600">Salinity</div>
                  <div className="font-medium">{environmentalData.salinity.toFixed(1)} PSU</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Leaf className="w-4 h-4 text-green-500" />
                <div>
                  <div className="text-sm text-gray-600">Chlorophyll</div>
                  <div className="font-medium">{environmentalData.chlorophyll.toFixed(2)} mg/m³</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Ruler className="w-4 h-4 text-purple-500" />
                <div>
                  <div className="text-sm text-gray-600">Avg Depth</div>
                  <div className="font-medium">{environmentalData.depth}m</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* No predictions message */}
      {!predictionLoading && predictions.length === 0 && selectedSpecies && (
        <Card>
          <CardContent className="text-center p-8">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-gray-600">No prediction data available for this species.</p>
            <p className="text-sm text-gray-500 mt-1">Try training a model first or select a different species.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}