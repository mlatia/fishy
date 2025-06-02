const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

export interface SpeciesData {
  id: string
  name: string
  scientificName: string
  commonName: string
}

export interface RegionData {
  id: string
  name: string
  coordinates: [number, number]
  bounds: [number, number, number, number]
}

export interface PredictionResult {
  decimalLatitude: number
  decimalLongitude: number
  prediction: number
  temperature?: number
  salinity?: number
  chlorophyll?: number
  depth?: number
}

export interface EnvironmentalData {
  temperature: number
  salinity: number
  chlorophyll: number
  depth: number
  region: string
}

export interface RegionalAnalysis {
  species: string
  region: string
  depthChanges: Array<{ year: number; depth: number }>
  latitudeShift: number
  timespan: number
}

class ApiService {
  private async fetchApi(endpoint: string, options?: RequestInit) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getPredictions(speciesId: string, region?: string): Promise<PredictionResult[]> {
    const params = new URLSearchParams({ species: speciesId })
    if (region) params.append("region", region)

    const response = await this.fetchApi(`/predict?${params}`)
    return response.predictions || []
  }

  async getEnvironmentalData(region: string, species: string): Promise<EnvironmentalData> {
    return this.fetchApi(`/api/environmental?region=${region}&species=${species}`)
  }

  async getRegionalAnalysis(region: string, species: string): Promise<RegionalAnalysis> {
    return this.fetchApi(`/api/regional-analysis?region=${region}&species=${species}`)
  }

  async getSpeciesList(): Promise<SpeciesData[]> {
    return this.fetchApi("/api/species")
  }

  async getRegionsList(): Promise<RegionData[]> {
    return this.fetchApi("/api/regions")
  }

  async getNearbyPredictions(
    lat: number,
    lng: number,
    species: string,
  ): Promise<
    Array<{
      location: string
      probability: number
    }>
  > {
    return this.fetchApi(`/api/nearby-predictions?lat=${lat}&lng=${lng}&species=${species}`)
  }

  async getSpeciesDetections(species: string): Promise<
    Array<{
      location: string
      year: number
    }>
  > {
    return this.fetchApi(`/api/species-detections?species=${species}`)
  }

  async getConservationStatus(species: string): Promise<{
    status: string
    category: string
    description: string
  }> {
    return this.fetchApi(`/api/conservation-status?species=${species}`)
  }

  async getFastaSpecies(): Promise<SpeciesData[]> {
    return this.fetchApi("/api/fasta-species")
  }

  async getSpeciesDetails(speciesId: string): Promise<any> {
    return this.fetchApi(`/api/species-details/${speciesId}`)
  }

  async trainModel(speciesId?: string): Promise<any> {
    return this.fetchApi("/train", {
      method: "POST",
      body: JSON.stringify({ species: speciesId }),
    })
  }

  async getModelStatus(speciesId?: string): Promise<any> {
    const params = speciesId ? `?species=${speciesId}` : ""
    return this.fetchApi(`/model/status${params}`)
  }

  async getAvailableSpecies(): Promise<any[]> {
    return this.fetchApi("/available-species")
  }
}

export const apiService = new ApiService()
