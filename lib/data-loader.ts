import Papa from "papaparse"

export interface OccurrenceRecord {
  gbifID?: string
  datasetKey?: string
  occurrenceID?: string
  kingdom?: string
  phylum?: string
  class?: string
  order?: string
  family?: string
  genus?: string
  species?: string
  infraspecificEpithet?: string
  taxonRank?: string
  scientificName?: string
  verbatimScientificName?: string
  countryCode?: string
  locality?: string
  stateProvince?: string
  occurrenceStatus?: string
  individualCount?: number
  publishingOrgKey?: string
  decimalLatitude?: number
  decimalLongitude?: number
  coordinateUncertaintyInMeters?: number
  coordinatePrecision?: number
  elevation?: number
  elevationAccuracy?: number
  depth?: number
  depthAccuracy?: number
  eventDate?: string
  day?: number
  month?: number
  year?: number
  taxonKey?: number
  speciesKey?: number
  basisOfRecord?: string
  institutionCode?: string
  collectionCode?: string
  catalogNumber?: string
  recordNumber?: string
  identifiedBy?: string
  dateIdentified?: string
  license?: string
  rightsHolder?: string
  recordedBy?: string
  typeStatus?: string
  establishmentMeans?: string
  lastInterpreted?: string
  mediaType?: string
  issue?: string
}

export interface IndonesianRegion {
  id: string
  name: string
  province?: string
  coordinates: [number, number]
  bounds?: [number, number, number, number]
  occurrenceCount: number
}

export interface SpeciesInfo {
  id: string
  name: string
  scientificName: string
  commonName: string
  family?: string
  occurrenceCount: number
}

class DataLoader {
  private occurrenceData: OccurrenceRecord[] = []
  private regions: IndonesianRegion[] = []
  private species: SpeciesInfo[] = []
  private loaded = false

  async loadOccurrenceData(): Promise<void> {
    if (this.loaded) return

    try {
      const response = await fetch("/data/occurrence.csv")
      const csvText = await response.text()

      return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          transform: (value, field) => {
            // Convert numeric fields
            if (
              typeof field === "string" &&
              ["decimalLatitude", "decimalLongitude", "year", "month", "day", "depth", "elevation"].includes(field)
            ) {
              const num = Number.parseFloat(value)
              return isNaN(num) ? null : num
            }
            return value || null
          },
          complete: (results) => {
            // Type assertion to ensure the parsed data matches OccurrenceRecord
            this.occurrenceData = results.data.filter(
              (record: any) =>
                record.decimalLatitude &&
                record.decimalLongitude &&
                record.countryCode === "ID" && // Indonesia only
                record.decimalLatitude >= -11 &&
                record.decimalLatitude <= 6 &&
                record.decimalLongitude >= 95 &&
                record.decimalLongitude <= 141,
            ) as OccurrenceRecord[]

            this.processRegions()
            this.processSpecies()
            this.loaded = true
            resolve()
          },
        })
      })
    } catch (error) {
      console.error("Error loading occurrence data:", error)
      throw error
    }
  }

  private processRegions(): void {
    const regionMap = new Map<
      string,
      {
        coordinates: [number, number]
        count: number
        records: OccurrenceRecord[]
        province?: string
      }
    >()

    // Group by locality/stateProvince
    this.occurrenceData.forEach((record) => {
      const regionKey = record.stateProvince || record.locality || "Unknown"
      if (regionKey === "Unknown") return

      if (!regionMap.has(regionKey)) {
        regionMap.set(regionKey, {
          coordinates: [record.decimalLatitude || 0, record.decimalLongitude || 0],
          count: 0,
          records: [],
          province: record.stateProvince,
        })
      }

      const region = regionMap.get(regionKey)!
      region.count++
      region.records.push(record)

      // Update coordinates to centroid
      const avgLat = region.records.reduce((sum, r) => sum + (r.decimalLatitude || 0), 0) / region.records.length
      const avgLng = region.records.reduce((sum, r) => sum + (r.decimalLongitude || 0), 0) / region.records.length
      region.coordinates = [avgLat, avgLng]
    })

    // Convert to regions array, filter out small regions
    this.regions = Array.from(regionMap.entries())
      .filter(([_, data]) => data.count >= 5) // At least 5 occurrences
      .map(([name, data]) => {
        const bounds: [number, number, number, number] = [
          Math.min(...data.records.map((r) => r.decimalLongitude || 0)) - 0.5,
          Math.min(...data.records.map((r) => r.decimalLatitude || 0)) - 0.5,
          Math.max(...data.records.map((r) => r.decimalLongitude || 0)) + 0.5,
          Math.max(...data.records.map((r) => r.decimalLatitude || 0)) + 0.5,
        ]

        return {
          id: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
          name: name,
          province: data.province,
          coordinates: data.coordinates,
          bounds,
          occurrenceCount: data.count,
        }
      })
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount) // Sort by occurrence count
  }

  private processSpecies(): void {
    const speciesMap = new Map<
      string,
      {
        scientificName: string
        family: string
        count: number
      }
    >()

    this.occurrenceData.forEach((record) => {
      if (!record.species) return

      const key = record.species
      if (!speciesMap.has(key)) {
        speciesMap.set(key, {
          scientificName: record.scientificName || record.species || "",
          family: record.family || "Unknown",
          count: 0,
        })
      }
      speciesMap.get(key)!.count++
    })

    this.species = Array.from(speciesMap.entries())
      .filter(([_, data]) => data.count >= 10) // At least 10 occurrences
      .map(([species, data]) => ({
        id: species.toLowerCase().replace(/[^a-z0-9]/g, "_"),
        name: this.getCommonName(species),
        scientificName: data.scientificName,
        commonName: this.getCommonName(species),
        family: data.family,
        occurrenceCount: data.count,
      }))
      .sort((a, b) => b.occurrenceCount - a.occurrenceCount)
  }

  private getCommonName(scientificName: string): string {
    const commonNames: Record<string, string> = {
      "Siganus canaliculatus": "Baronang Susu",
      "Lutjanus campechanus": "Red Snapper",
      "Epinephelus marginatus": "Dusky Grouper",
      "Chanos chanos": "Milkfish",
      "Scarus ghobban": "Blue-barred Parrotfish",
      "Caesio cuning": "Redbelly Yellowtail Fusilier",
      "Parupeneus multifasciatus": "Manybar Goatfish",
      "Chromis viridis": "Blue Green Chromis",
      "Amphiprion ocellatus": "Ocellaris Clownfish",
      "Zebrasoma scopas": "Brown Tang",
    }
    return commonNames[scientificName] || scientificName.split(" ")[1] || scientificName
  }

  getOccurrencesBySpeciesAndYear(speciesName: string, year: number): OccurrenceRecord[] {
    return this.occurrenceData.filter((record) => {
      const matchesSpecies = record.scientificName === speciesName || record.species === speciesName
      const matchesYear = record.year === year
      return matchesSpecies && matchesYear
    })
  }

  getOccurrencesByRegion(regionId: string): OccurrenceRecord[] {
    const region = this.regions.find((r) => r.id === regionId)
    if (!region) return []

    return this.occurrenceData.filter((record) => {
      const regionKey = (record.stateProvince || record.locality || "").toLowerCase().replace(/[^a-z0-9]/g, "-")
      return regionKey === regionId
    })
  }

  getYearRange(): [number, number] {
    const years = this.occurrenceData.map((r) => r.year).filter((y): y is number => !!y && y > 1990 && y <= 2024)

    if (years.length === 0) return [1990, 2024]
    return [Math.min(...years), Math.max(...years)]
  }

  getRegions(): IndonesianRegion[] {
    return this.regions
  }

  getSpecies(): SpeciesInfo[] {
    return this.species
  }

  getOccurrenceData(): OccurrenceRecord[] {
    return this.occurrenceData
  }
}

export const dataLoader = new DataLoader()
