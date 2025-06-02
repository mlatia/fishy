import pandas as pd
import numpy as np
import xarray as xr
from Bio import SeqIO
import os
import requests
from io import StringIO
import glob
from pathlib import Path

def load_fasta_species():
    """Load all available FASTA files and extract species information"""
    fasta_dir = './data/data_gen_ncbi_fasta/'
    fasta_species = {}
    
    if not os.path.exists(fasta_dir):
        print(f"FASTA directory not found: {fasta_dir}")
        return {}
    
    try:
        # Get all FASTA files in the directory
        fasta_files = glob.glob(os.path.join(fasta_dir, "*.fasta"))
        
        for fasta_file in fasta_files:
            filename = os.path.basename(fasta_file)
            species_name = filename.replace('.fasta', '').replace('_', ' ')
            species_id = filename.replace('.fasta', '')
            
            try:
                # Parse FASTA file to get sequence information
                sequences = list(SeqIO.parse(fasta_file, "fasta"))
                
                if sequences:
                    fasta_species[species_id] = {
                        'scientific_name': species_name,
                        'common_name': get_common_name_from_scientific(species_name),
                        'sequence_count': len(sequences),
                        'file_path': fasta_file,
                        'sequences': sequences[:5]  # Store first 5 sequences for analysis
                    }
                    print(f"Loaded {len(sequences)} sequences for {species_name}")
                
            except Exception as e:
                print(f"Error reading FASTA file {fasta_file}: {e}")
                continue
        
        print(f"Successfully loaded {len(fasta_species)} species from FASTA files")
        return fasta_species
        
    except Exception as e:
        print(f"Error loading FASTA files: {e}")
        return {}

def get_common_name_from_scientific(scientific_name):
    """Get common name from scientific name"""
    common_names = {
        'Chanos chanos': 'Milkfish / Bandeng',
        'Clarias gariepinus': 'African Catfish / Lele Afrika',
        'Euthynnus affinis': 'Kawakawa / Tongkol',
        'Katsuwonus pelamis': 'Skipjack Tuna / Cakalang',
        'Lutjanus campechanus': 'Red Snapper / Kakap Merah',
        'Oreochromis niloticus': 'Nile Tilapia / Nila',
        'Osphronemus goramy': 'Giant Gourami / Gurame',
        'Pangasius hypophthalmus': 'Striped Catfish / Patin',
        'Rastrelliger kanagurta': 'Indian Mackerel / Kembung',
        'Thunnus albacares': 'Yellowfin Tuna / Tuna Sirip Kuning'
    }
    return common_names.get(scientific_name, scientific_name)

def get_species_habitat_preferences():
    """Get habitat preferences for each species"""
    habitat_prefs = {
        'Chanos_chanos': {
            'depth_range': (0, 30),
            'temp_range': (26, 32),
            'salinity_range': (15, 35),
            'habitat_type': 'coastal_brackish'
        },
        'Clarias_gariepinus': {
            'depth_range': (0, 10),
            'temp_range': (22, 30),
            'salinity_range': (0, 5),
            'habitat_type': 'freshwater'
        },
        'Euthynnus_affinis': {
            'depth_range': (0, 200),
            'temp_range': (24, 30),
            'salinity_range': (34, 36),
            'habitat_type': 'pelagic_marine'
        },
        'Katsuwonus_pelamis': {
            'depth_range': (0, 250),
            'temp_range': (15, 30),
            'salinity_range': (34, 36),
            'habitat_type': 'pelagic_marine'
        },
        'Lutjanus_campechanus': {
            'depth_range': (10, 200),
            'temp_range': (20, 30),
            'salinity_range': (34, 36),
            'habitat_type': 'reef_marine'
        },
        'Oreochromis_niloticus': {
            'depth_range': (0, 20),
            'temp_range': (20, 35),
            'salinity_range': (0, 15),
            'habitat_type': 'freshwater_brackish'
        },
        'Osphronemus_goramy': {
            'depth_range': (0, 15),
            'temp_range': (24, 32),
            'salinity_range': (0, 5),
            'habitat_type': 'freshwater'
        },
        'Pangasius_hypophthalmus': {
            'depth_range': (0, 50),
            'temp_range': (22, 32),
            'salinity_range': (0, 10),
            'habitat_type': 'freshwater_river'
        },
        'Rastrelliger_kanagurta': {
            'depth_range': (0, 200),
            'temp_range': (24, 30),
            'salinity_range': (34, 36),
            'habitat_type': 'coastal_marine'
        },
        'Thunnus_albacares': {
            'depth_range': (0, 500),
            'temp_range': (18, 31),
            'salinity_range': (34, 36),
            'habitat_type': 'pelagic_marine'
        }
    }
    return habitat_prefs

def interpolate_temperature(env_data, lat, lon):
    """Interpolate temperature data for given coordinates"""
    try:
        # Handle longitude conversion for global datasets
        if lon < 0:
            lon = lon + 360
            
        temp = env_data['thetao_mean'].sel(
            latitude=lat, longitude=lon, method='nearest'
        ).mean(dim='time').values.item()
        
        return temp if not np.isnan(temp) else None
    except Exception as e:
        print(f"Error interpolating temperature: {e}")
        return None

def load_and_prepare_data(selected_species=None):
    """Load and prepare species occurrence and environmental data"""
    try:
        print("Loading FASTA species data...")
        fasta_species = load_fasta_species()
        
        print("Loading occurrence data from CSV...")
        
        # Load occurrence data from the same URL as routes.py
        url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/occurrence-q4D1BSg6qEE6PpgihdkwFSFmjxw9rs.csv"
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        df = pd.read_csv(StringIO(response.text))
        print(f"Raw data loaded: {len(df)} records")
        
        # Clean and filter occurrence data
        df = df[['decimalLatitude', 'decimalLongitude', 'species', 'scientificName', 'year']].dropna()
        df['decimalLatitude'] = pd.to_numeric(df['decimalLatitude'], errors='coerce')
        df['decimalLongitude'] = pd.to_numeric(df['decimalLongitude'], errors='coerce')
        df = df.dropna()

        # Filter for Indonesian waters
        df = df[
            (df['decimalLatitude'] >= -11) & (df['decimalLatitude'] <= 6) &
            (df['decimalLongitude'] >= 95) & (df['decimalLongitude'] <= 141)
        ]
        
        # Filter by selected species if specified
        if selected_species:
            species_scientific = selected_species.replace('_', ' ')
            df = df[
                (df['species'].str.contains(species_scientific, case=False, na=False)) |
                (df['scientificName'].str.contains(species_scientific, case=False, na=False))
            ]
            print(f"Filtered for species {selected_species}: {len(df)} records")
        
        print(f"Filtered data: {len(df)} records")

        # Add environmental data based on species habitat preferences
        habitat_prefs = get_species_habitat_preferences()
        
        df['temperature'] = df.apply(
            lambda row: generate_species_specific_temperature(
                row['decimalLatitude'], 
                row['decimalLongitude'],
                selected_species,
                habitat_prefs
            ), 
            axis=1
        )
        
        df['depth'] = df.apply(
            lambda row: generate_species_specific_depth(selected_species, habitat_prefs),
            axis=1
        )
        
        df['salinity'] = df.apply(
            lambda row: generate_species_specific_salinity(selected_species, habitat_prefs),
            axis=1
        )

        # Create presence dataset
        presence_df = df.copy()
        presence_df['label'] = 1

        # Generate absence data
        absence_df = generate_absence_data(df, selected_species, habitat_prefs)
        
        # Combine presence and absence data
        full_df = pd.concat([presence_df, absence_df], ignore_index=True)

        # Define coordinate ranges for Indonesian waters
        lat_range = (df['decimalLatitude'].min(), df['decimalLatitude'].max()) if len(df) > 0 else (-11, 6)
        lon_range = (df['decimalLongitude'].min(), df['decimalLongitude'].max()) if len(df) > 0 else (95, 141)

        print(f"Prepared {len(presence_df)} presence records and {len(absence_df)} absence records")
        print(f"Coordinate ranges: Lat {lat_range}, Lon {lon_range}")

        return presence_df, full_df, lat_range, lon_range, fasta_species

    except Exception as e:
        print(f"Error in load_and_prepare_data: {e}")
        # Return fallback data
        return generate_fallback_data(selected_species)

def generate_species_specific_temperature(lat, lon, species, habitat_prefs):
    """Generate temperature based on species habitat preferences"""
    base_temp = 28.0
    
    if species and species in habitat_prefs:
        temp_range = habitat_prefs[species]['temp_range']
        base_temp = (temp_range[0] + temp_range[1]) / 2
    
    # Add latitude effect
    lat_effect = (lat + 5) * 0.2
    
    # Add random variation
    random_variation = np.random.normal(0, 0.5)
    
    temperature = base_temp + lat_effect + random_variation
    
    # Keep within species-specific bounds
    if species and species in habitat_prefs:
        temp_range = habitat_prefs[species]['temp_range']
        temperature = max(temp_range[0], min(temp_range[1], temperature))
    else:
        temperature = max(25.0, min(32.0, temperature))
    
    return temperature

def generate_species_specific_depth(species, habitat_prefs):
    """Generate depth based on species habitat preferences"""
    if species and species in habitat_prefs:
        depth_range = habitat_prefs[species]['depth_range']
        return np.random.uniform(depth_range[0], depth_range[1])
    else:
        return np.random.uniform(0, 50)

def generate_species_specific_salinity(species, habitat_prefs):
    """Generate salinity based on species habitat preferences"""
    if species and species in habitat_prefs:
        salinity_range = habitat_prefs[species]['salinity_range']
        return np.random.uniform(salinity_range[0], salinity_range[1])
    else:
        return np.random.uniform(30, 35)

def generate_absence_data(presence_df, selected_species, habitat_prefs):
    """Generate absence data points"""
    np.random.seed(42)
    
    if len(presence_df) == 0:
        return pd.DataFrame()
    
    lat_min, lat_max = presence_df['decimalLatitude'].min(), presence_df['decimalLatitude'].max()
    lon_min, lon_max = presence_df['decimalLongitude'].min(), presence_df['decimalLongitude'].max()
    
    absences = []
    target_count = len(presence_df)
    
    while len(absences) < target_count:
        lat = np.random.uniform(lat_min, lat_max)
        lon = np.random.uniform(lon_min, lon_max)
        
        # Ensure absence points are not too close to presence points
        min_distance = 0.5  # degrees
        too_close = presence_df[
            (np.abs(presence_df['decimalLatitude'] - lat) < min_distance) & 
            (np.abs(presence_df['decimalLongitude'] - lon) < min_distance)
        ]
        
        if too_close.empty:
            temp = generate_species_specific_temperature(lat, lon, selected_species, habitat_prefs)
            depth = generate_species_specific_depth(selected_species, habitat_prefs)
            salinity = generate_species_specific_salinity(selected_species, habitat_prefs)
            
            absences.append({
                'decimalLatitude': lat,
                'decimalLongitude': lon,
                'temperature': temp,
                'depth': depth,
                'salinity': salinity,
                'label': 0,
                'species': 'absence',
                'scientificName': 'absence',
                'year': np.random.randint(1990, 2024)
            })
    
    return pd.DataFrame(absences)

def generate_fallback_data(selected_species=None):
    """Generate fallback data when files are not available"""
    print("Using fallback mock data")
    
    # Generate simple presence data
    np.random.seed(42)
    presence_data = []
    habitat_prefs = get_species_habitat_preferences()
    
    species_to_use = selected_species or 'Chanos_chanos'
    
    for _ in range(500):
        lat = np.random.uniform(-8, 2)
        lon = np.random.uniform(110, 135)
        temp = generate_species_specific_temperature(lat, lon, species_to_use, habitat_prefs)
        depth = generate_species_specific_depth(species_to_use, habitat_prefs)
        salinity = generate_species_specific_salinity(species_to_use, habitat_prefs)
        
        presence_data.append({
            'decimalLatitude': lat,
            'decimalLongitude': lon,
            'temperature': temp,
            'depth': depth,
            'salinity': salinity,
            'label': 1,
            'species': species_to_use.replace('_', ' '),
            'scientificName': species_to_use.replace('_', ' '),
            'year': np.random.randint(1990, 2024)
        })
    
    presence_df = pd.DataFrame(presence_data)
    
    # Generate absence data
    absence_data = []
    for _ in range(500):
        lat = np.random.uniform(-8, 2)
        lon = np.random.uniform(110, 135)
        temp = generate_species_specific_temperature(lat, lon, species_to_use, habitat_prefs)
        depth = generate_species_specific_depth(species_to_use, habitat_prefs)
        salinity = generate_species_specific_salinity(species_to_use, habitat_prefs)
        
        absence_data.append({
            'decimalLatitude': lat,
            'decimalLongitude': lon,
            'temperature': temp,
            'depth': depth,
            'salinity': salinity,
            'label': 0,
            'species': 'absence',
            'scientificName': 'absence',
            'year': np.random.randint(1990, 2024)
        })
    
    absence_df = pd.DataFrame(absence_data)
    full_df = pd.concat([presence_df, absence_df], ignore_index=True)
    
    lat_range = (-8, 2)
    lon_range = (110, 135)
    fasta_species = load_fasta_species()  # Try to load FASTA data even in fallback
    
    return presence_df, full_df, lat_range, lon_range, fasta_species
