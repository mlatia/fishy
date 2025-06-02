from flask import Blueprint, jsonify, request
import pandas as pd
import numpy as np
from datetime import datetime
import requests
from io import StringIO
from backend.utils.preprocessing import load_fasta_species, get_species_habitat_preferences

bp = Blueprint("api", __name__, url_prefix="/api")

# Global variable to store loaded data
occurrence_data = None
regions_data = None
species_data = None
fasta_species_data = None

def load_occurrence_data():
    """Load occurrence data from the provided CSV URL"""
    global occurrence_data, regions_data, species_data, fasta_species_data
    
    if occurrence_data is not None:
        return occurrence_data
    
    try:
        # Load FASTA species data first
        fasta_species_data = load_fasta_species()
        
        # Load data from the provided URL
        url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/occurrence-q4D1BSg6qEE6PpgihdkwFSFmjxw9rs.csv"
        print(f"Loading data from: {url}")
        
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        # Parse CSV
        df = pd.read_csv(StringIO(response.text))
        print(f"Raw data loaded: {len(df)} records")
        
        # Filter for Indonesian waters only
        df = df[
            (df['countryCode'] == 'ID') &
            (df['decimalLatitude'].notna()) &
            (df['decimalLongitude'].notna()) &
            (df['decimalLatitude'] >= -11) &
            (df['decimalLatitude'] <= 6) &
            (df['decimalLongitude'] >= 95) &
            (df['decimalLongitude'] <= 141)
        ]
        
        occurrence_data = df
        process_regions_and_species()
        
        print(f"Filtered data: {len(occurrence_data)} occurrence records")
        print(f"Processed: {len(regions_data)} regions, {len(species_data)} species")
        print(f"FASTA species available: {len(fasta_species_data)}")
        return occurrence_data
        
    except Exception as e:
        print(f"Error loading occurrence data: {e}")
        # Still try to load FASTA data
        fasta_species_data = load_fasta_species()
        return pd.DataFrame()

def process_regions_and_species():
    """Process regions and species from occurrence data"""
    global regions_data, species_data, fasta_species_data
    
    if occurrence_data is None or len(occurrence_data) == 0:
        regions_data = []
        species_data = []
        return
    
    try:
        # Process regions
        region_groups = occurrence_data.groupby('stateProvince').agg({
            'decimalLatitude': 'mean',
            'decimalLongitude': 'mean',
            'gbifID': 'count'
        }).reset_index()
        
        region_groups = region_groups[region_groups['gbifID'] >= 5]  # At least 5 occurrences
        region_groups = region_groups.sort_values('gbifID', ascending=False)
        
        regions_data = []
        for _, row in region_groups.iterrows():
            if pd.notna(row['stateProvince']):
                regions_data.append({
                    'id': row['stateProvince'].lower().replace(' ', '-').replace(',', ''),
                    'name': row['stateProvince'],
                    'coordinates': [row['decimalLatitude'], row['decimalLongitude']],
                    'occurrenceCount': int(row['gbifID'])
                })
        
        # Process species - combine occurrence data with FASTA data
        species_groups = occurrence_data.groupby('species').agg({
            'scientificName': 'first',
            'family': 'first',
            'gbifID': 'count'
        }).reset_index()
        
        species_groups = species_groups[species_groups['gbifID'] >= 10]  # At least 10 occurrences
        species_groups = species_groups.sort_values('gbifID', ascending=False)
        
        species_data = []
        
        # First, add species from FASTA files (these are our priority species)
        if fasta_species_data:
            for species_id, fasta_info in fasta_species_data.items():
                # Check if this species also exists in occurrence data
                occurrence_count = 0
                scientific_name = fasta_info['scientific_name']
                
                matching_occurrence = species_groups[
                    species_groups['species'].str.contains(scientific_name, case=False, na=False) |
                    species_groups['scientificName'].str.contains(scientific_name, case=False, na=False)
                ]
                
                if not matching_occurrence.empty:
                    occurrence_count = matching_occurrence.iloc[0]['gbifID']
                
                species_data.append({
                    'id': species_id,
                    'scientificName': scientific_name,
                    'commonName': fasta_info['common_name'],
                    'family': 'Marine Fish',  # Default family
                    'occurrenceCount': int(occurrence_count),
                    'sequenceCount': fasta_info['sequence_count'],
                    'hasFastaData': True,
                    'hasOccurrenceData': occurrence_count > 0
                })
        
        # Then add other species from occurrence data that don't have FASTA files
        for _, row in species_groups.iterrows():
            if pd.notna(row['species']):
                species_scientific = row['scientificName'] or row['species']
                species_id = species_scientific.lower().replace(' ', '_')
                
                # Check if this species is already added from FASTA data
                already_added = any(s['id'] == species_id for s in species_data)
                
                if not already_added:
                    species_data.append({
                        'id': species_id,
                        'scientificName': species_scientific,
                        'commonName': get_common_name(row['species']),
                        'family': row['family'] or 'Unknown',
                        'occurrenceCount': int(row['gbifID']),
                        'sequenceCount': 0,
                        'hasFastaData': False,
                        'hasOccurrenceData': True
                    })
        
        # Sort by priority: FASTA species first, then by occurrence count
        species_data.sort(key=lambda x: (not x['hasFastaData'], -x['occurrenceCount']))
                
    except Exception as e:
        print(f"Error processing regions and species: {e}")
        regions_data = []
        species_data = []

def get_common_name(scientific_name):
    """Get common name for species"""
    common_names = {
        'Siganus canaliculatus': 'Baronang Susu',
        'Lutjanus campechanus': 'Red Snapper',
        'Epinephelus marginatus': 'Dusky Grouper',
        'Chanos chanos': 'Milkfish',
        'Scarus ghobban': 'Blue-barred Parrotfish',
        'Caesio cuning': 'Redbelly Yellowtail Fusilier',
        'Parupeneus multifasciatus': 'Manybar Goatfish',
        'Chromis viridis': 'Blue Green Chromis',
        'Amphiprion ocellatus': 'Ocellaris Clownfish',
        'Zebrasoma scopas': 'Brown Tang'
    }
    return common_names.get(scientific_name, scientific_name.split(' ')[-1] if ' ' in scientific_name else scientific_name)

@bp.route("/fasta-species", methods=["GET"])
def get_fasta_species():
    """Get all species that have FASTA data available"""
    try:
        load_occurrence_data()  # This will also load FASTA data
        
        if fasta_species_data is None:
            return jsonify([])
        
        # Convert FASTA species data to API format
        result = []
        for species_id, info in fasta_species_data.items():
            result.append({
                'id': species_id,
                'scientificName': info['scientific_name'],
                'commonName': info['common_name'],
                'sequenceCount': info['sequence_count'],
                'filePath': info['file_path']
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in get_fasta_species: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/species-details/<species_id>", methods=["GET"])
def get_species_details(species_id):
    """Get detailed information about a specific species"""
    try:
        load_occurrence_data()
        
        # Get FASTA data
        fasta_info = None
        if fasta_species_data and species_id in fasta_species_data:
            fasta_info = fasta_species_data[species_id]
        
        # Get occurrence data
        occurrence_info = None
        if occurrence_data is not None and len(occurrence_data) > 0:
            scientific_name = species_id.replace('_', ' ')
            matching_records = occurrence_data[
                (occurrence_data['species'].str.contains(scientific_name, case=False, na=False)) |
                (occurrence_data['scientificName'].str.contains(scientific_name, case=False, na=False))
            ]
            
            if not matching_records.empty:
                occurrence_info = {
                    'totalRecords': len(matching_records),
                    'yearRange': {
                        'min': int(matching_records['year'].min()) if pd.notna(matching_records['year'].min()) else None,
                        'max': int(matching_records['year'].max()) if pd.notna(matching_records['year'].max()) else None
                    },
                    'coordinateBounds': {
                        'latMin': float(matching_records['decimalLatitude'].min()),
                        'latMax': float(matching_records['decimalLatitude'].max()),
                        'lngMin': float(matching_records['decimalLongitude'].min()),
                        'lngMax': float(matching_records['decimalLongitude'].max())
                    }
                }
        
        # Get habitat preferences
        habitat_prefs = get_species_habitat_preferences()
        habitat_info = habitat_prefs.get(species_id, {})
        
        result = {
            'id': species_id,
            'scientificName': fasta_info['scientific_name'] if fasta_info else species_id.replace('_', ' '),
            'commonName': fasta_info['common_name'] if fasta_info else get_common_name(species_id.replace('_', ' ')),
            'fastaData': fasta_info,
            'occurrenceData': occurrence_info,
            'habitatPreferences': habitat_info
        }
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in get_species_details: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/occurrence-data", methods=["GET"])
def get_occurrence_data():
    """Get occurrence data filtered by species and year"""
    try:
        data = load_occurrence_data()
        
        if len(data) == 0:
            return jsonify([])
        
        species = request.args.get('species')
        year = request.args.get('year', type=int)
        region = request.args.get('region')
        limit = request.args.get('limit', type=int, default=1000)
        
        filtered_data = data.copy()
        
        if species:
            # Handle both species ID format (with underscores) and scientific names
            species_name = species.replace('_', ' ')
            filtered_data = filtered_data[
                (filtered_data['species'].str.contains(species_name, case=False, na=False)) | 
                (filtered_data['scientificName'].str.contains(species_name, case=False, na=False)) |
                (filtered_data['species'] == species) |
                (filtered_data['scientificName'] == species)
            ]
        
        if year:
            filtered_data = filtered_data[filtered_data['year'] == year]
            
        if region:
            region_name = region.replace('-', ' ').title()
            filtered_data = filtered_data[
                filtered_data['stateProvince'].str.contains(region_name, na=False, case=False)
            ]
        
        # Limit results for performance
        if len(filtered_data) > limit:
            filtered_data = filtered_data.sample(n=limit)
        
        # Convert to list of dictionaries
        result = []
        for _, row in filtered_data.iterrows():
            result.append({
                'gbifID': row.get('gbifID'),
                'scientificName': row.get('scientificName'),
                'species': row.get('species'),
                'decimalLatitude': float(row['decimalLatitude']) if pd.notna(row['decimalLatitude']) else None,
                'decimalLongitude': float(row['decimalLongitude']) if pd.notna(row['decimalLongitude']) else None,
                'year': int(row['year']) if pd.notna(row['year']) else None,
                'depth': float(row['depth']) if pd.notna(row.get('depth')) else None,
                'individualCount': int(row['individualCount']) if pd.notna(row.get('individualCount')) else 1,
                'stateProvince': row.get('stateProvince'),
                'locality': row.get('locality')
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in get_occurrence_data: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/regions", methods=["GET"])
def get_regions():
    """Get all available regions from the dataset"""
    try:
        load_occurrence_data()
        
        if regions_data is None:
            return jsonify([])
        
        return jsonify(regions_data)
        
    except Exception as e:
        print(f"Error in get_regions: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/species", methods=["GET"])
def get_species():
    """Get all available species from the dataset"""
    try:
        load_occurrence_data()
        
        if species_data is None:
            return jsonify([])
        
        return jsonify(species_data)
        
    except Exception as e:
        print(f"Error in get_species: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/year-range", methods=["GET"])
def get_year_range():
    """Get the year range available in the dataset"""
    try:
        data = load_occurrence_data()
        
        if len(data) == 0:
            return jsonify({"min_year": 1990, "max_year": 2024})
        
        years = data['year'].dropna()
        years = years[(years >= 1990) & (years <= 2024)]
        
        return jsonify({
            "min_year": int(years.min()) if len(years) > 0 else 1990,
            "max_year": int(years.max()) if len(years) > 0 else 2024
        })
        
    except Exception as e:
        print(f"Error in get_year_range: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/environmental", methods=["GET"])
def get_environmental_data():
    """Get environmental data for a specific region and species"""
    try:
        region = request.args.get('region', 'teluk-tomini')
        species = request.args.get('species', 'chanos_chanos')
        
        data = load_occurrence_data()
        
        # Get habitat preferences for the species
        habitat_prefs = get_species_habitat_preferences()
        species_habitat = habitat_prefs.get(species, {})
        
        if len(data) == 0:
            # Return species-specific mock data if no real data available
            temp_range = species_habitat.get('temp_range', (26, 30))
            depth_range = species_habitat.get('depth_range', (0, 50))
            salinity_range = species_habitat.get('salinity_range', (30, 35))
            
            return jsonify({
                "temperature": (temp_range[0] + temp_range[1]) / 2,
                "salinity": (salinity_range[0] + salinity_range[1]) / 2,
                "chlorophyll": 0.21,
                "depth": (depth_range[0] + depth_range[1]) / 2,
                "region": region,
                "occurrenceCount": 0,
                "habitatType": species_habitat.get('habitat_type', 'unknown')
            })
        
        # Filter data for the specific region and species
        region_name = region.replace('-', ' ').title()
        species_name = species.replace('_', ' ')
        
        filtered_data = data[
            (data['stateProvince'].str.contains(region_name, na=False, case=False)) &
            ((data['species'].str.contains(species_name, na=False, case=False)) |
             (data['scientificName'].str.contains(species_name, na=False, case=False)))
        ]
        
        # Calculate environmental statistics
        avg_depth = filtered_data['depth'].mean() if 'depth' in filtered_data.columns else None
        
        # Use species-specific environmental data
        if species_habitat:
            temp_range = species_habitat['temp_range']
            salinity_range = species_habitat['salinity_range']
            depth_range = species_habitat['depth_range']
            
            base_temp = (temp_range[0] + temp_range[1]) / 2
            base_salinity = (salinity_range[0] + salinity_range[1]) / 2
            base_depth = avg_depth if pd.notna(avg_depth) else (depth_range[0] + depth_range[1]) / 2
        else:
            base_temp = 28.5
            base_salinity = 34.1
            base_depth = avg_depth if pd.notna(avg_depth) else 12
        
        base_chlorophyll = 0.21
        
        # Add regional variation
        if 'papua' in region.lower():
            base_temp += 0.5
            base_salinity += 0.3
        elif 'java' in region.lower():
            base_temp -= 0.3
            base_chlorophyll += 0.05
        
        return jsonify({
            "temperature": round(base_temp + np.random.normal(0, 0.3), 1),
            "salinity": round(base_salinity + np.random.normal(0, 0.2), 1),
            "chlorophyll": round(base_chlorophyll + np.random.normal(0, 0.03), 2),
            "depth": int(base_depth) if pd.notna(base_depth) else 12,
            "region": region_name,
            "occurrenceCount": len(filtered_data),
            "habitatType": species_habitat.get('habitat_type', 'unknown')
        })
        
    except Exception as e:
        print(f"Error in get_environmental_data: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/stats", methods=["GET"])
def get_stats():
    """Get general statistics about the dataset"""
    try:
        data = load_occurrence_data()
        
        if len(data) == 0:
            return jsonify({"error": "No data available"}), 404
        
        stats = {
            "total_records": len(data),
            "unique_species": data['species'].nunique(),
            "unique_regions": data['stateProvince'].nunique(),
            "year_range": {
                "min": int(data['year'].min()) if pd.notna(data['year'].min()) else None,
                "max": int(data['year'].max()) if pd.notna(data['year'].max()) else None
            },
            "coordinate_bounds": {
                "lat_min": float(data['decimalLatitude'].min()),
                "lat_max": float(data['decimalLatitude'].max()),
                "lng_min": float(data['decimalLongitude'].min()),
                "lng_max": float(data['decimalLongitude'].max())
            },
            "fasta_species_count": len(fasta_species_data) if fasta_species_data else 0
        }
        
        return jsonify(stats)
        
    except Exception as e:
        print(f"Error in get_stats: {e}")
        return jsonify({"error": str(e)}), 500

@bp.route("/", methods=["GET"])
def index():
    return jsonify({
        "message": "Fishy API with real occurrence data and FASTA species!",
        "endpoints": [
            "/api/occurrence-data",
            "/api/regions", 
            "/api/species",
            "/api/fasta-species",
            "/api/species-details/<species_id>",
            "/api/year-range",
            "/api/environmental",
            "/api/stats"
        ],
        "data_loaded": occurrence_data is not None,
        "total_records": len(occurrence_data) if occurrence_data is not None else 0,
        "fasta_species_available": len(fasta_species_data) if fasta_species_data else 0
    })
