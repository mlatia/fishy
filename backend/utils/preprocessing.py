import pandas as pd
import numpy as np
import xarray as xr
from Bio import SeqIO
import os
import requests
from io import StringIO
import glob
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from scipy.spatial.distance import cdist
import warnings
warnings.filterwarnings('ignore')

def load_fasta_species():
    """Load all available FASTA files and extract species information"""
    fasta_dir = os.path.abspath('./backend/data/data_gen_ncbi_fasta/')
    print(f"Absolute path: {fasta_dir}")

    fasta_species = {}
    
    if not os.path.exists(fasta_dir):
        print(f"FASTA directory not found: {fasta_dir}")
        return {}
    
    try:
        fasta_files = glob.glob(os.path.join(fasta_dir, "*.fasta"))
        
        for fasta_file in fasta_files:
            filename = os.path.basename(fasta_file)
            species_name = filename.replace('.fasta', '').replace('_', ' ')
            species_id = filename.replace('.fasta', '')
            
            try:
                sequences = list(SeqIO.parse(fasta_file, "fasta"))
                
                if sequences:
                    fasta_species[species_id] = {
                        'scientific_name': species_name,
                        'common_name': get_common_name_from_scientific(species_name),
                        'sequence_count': len(sequences),
                        'file_path': fasta_file,
                        'sequences': sequences[:5]
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

def get_enhanced_species_habitat_preferences():
    """Enhanced habitat preferences with more detailed parameters"""
    habitat_prefs = {
        'Chanos_chanos': {
            'depth_range': (0, 30),
            'temp_range': (26, 32),
            'salinity_range': (15, 35),
            'habitat_type': 'coastal_brackish',
            'optimal_depth': 5,
            'optimal_temp': 29,
            'optimal_salinity': 25,
            'tolerance': {'depth': 10, 'temp': 2, 'salinity': 5},
            'bathymetry_preference': 'shallow',
            'distance_to_shore': (0, 50)  # km
        },
        'Clarias_gariepinus': {
            'depth_range': (0, 10),
            'temp_range': (22, 30),
            'salinity_range': (0, 5),
            'habitat_type': 'freshwater',
            'optimal_depth': 2,
            'optimal_temp': 26,
            'optimal_salinity': 0,
            'tolerance': {'depth': 3, 'temp': 3, 'salinity': 2},
            'bathymetry_preference': 'very_shallow',
            'distance_to_shore': (0, 10)
        },
        'Euthynnus_affinis': {
            'depth_range': (0, 200),
            'temp_range': (24, 30),
            'salinity_range': (34, 36),
            'habitat_type': 'pelagic_marine',
            'optimal_depth': 50,
            'optimal_temp': 27,
            'optimal_salinity': 35,
            'tolerance': {'depth': 50, 'temp': 2, 'salinity': 1},
            'bathymetry_preference': 'deep',
            'distance_to_shore': (10, 200)
        },
        'Katsuwonus_pelamis': {
            'depth_range': (0, 250),
            'temp_range': (15, 30),
            'salinity_range': (34, 36),
            'habitat_type': 'pelagic_marine',
            'optimal_depth': 100,
            'optimal_temp': 25,
            'optimal_salinity': 35,
            'tolerance': {'depth': 75, 'temp': 4, 'salinity': 1},
            'bathymetry_preference': 'deep',
            'distance_to_shore': (50, 500)
        },
        'Lutjanus_campechanus': {
            'depth_range': (10, 200),
            'temp_range': (20, 30),
            'salinity_range': (34, 36),
            'habitat_type': 'reef_marine',
            'optimal_depth': 50,
            'optimal_temp': 26,
            'optimal_salinity': 35,
            'tolerance': {'depth': 30, 'temp': 3, 'salinity': 1},
            'bathymetry_preference': 'moderate',
            'distance_to_shore': (1, 50)
        },
        'Oreochromis_niloticus': {
            'depth_range': (0, 20),
            'temp_range': (20, 35),
            'salinity_range': (0, 15),
            'habitat_type': 'freshwater_brackish',
            'optimal_depth': 5,
            'optimal_temp': 28,
            'optimal_salinity': 5,
            'tolerance': {'depth': 8, 'temp': 5, 'salinity': 8},
            'bathymetry_preference': 'shallow',
            'distance_to_shore': (0, 30)
        },
        'Osphronemus_goramy': {
            'depth_range': (0, 15),
            'temp_range': (24, 32),
            'salinity_range': (0, 5),
            'habitat_type': 'freshwater',
            'optimal_depth': 3,
            'optimal_temp': 28,
            'optimal_salinity': 0,
            'tolerance': {'depth': 5, 'temp': 3, 'salinity': 2},
            'bathymetry_preference': 'very_shallow',
            'distance_to_shore': (0, 5)
        },
        'Pangasius_hypophthalmus': {
            'depth_range': (0, 50),
            'temp_range': (22, 32),
            'salinity_range': (0, 10),
            'habitat_type': 'freshwater_river',
            'optimal_depth': 10,
            'optimal_temp': 27,
            'optimal_salinity': 0,
            'tolerance': {'depth': 15, 'temp': 4, 'salinity': 3},
            'bathymetry_preference': 'moderate',
            'distance_to_shore': (0, 20)
        },
        'Rastrelliger_kanagurta': {
            'depth_range': (0, 200),
            'temp_range': (24, 30),
            'salinity_range': (34, 36),
            'habitat_type': 'coastal_marine',
            'optimal_depth': 30,
            'optimal_temp': 27,
            'optimal_salinity': 35,
            'tolerance': {'depth': 40, 'temp': 2, 'salinity': 1},
            'bathymetry_preference': 'moderate',
            'distance_to_shore': (1, 100)
        },
        'Thunnus_albacares': {
            'depth_range': (0, 500),
            'temp_range': (18, 31),
            'salinity_range': (34, 36),
            'habitat_type': 'pelagic_marine',
            'optimal_depth': 150,
            'optimal_temp': 25,
            'optimal_salinity': 35,
            'tolerance': {'depth': 150, 'temp': 5, 'salinity': 1},
            'bathymetry_preference': 'very_deep',
            'distance_to_shore': (100, 1000)
        }
    }
    return habitat_prefs

def calculate_habitat_suitability(lat, lon, temp, depth, salinity, species, habitat_prefs):
    """Calculate habitat suitability score based on environmental parameters"""
    if species not in habitat_prefs:
        return 0.5
    
    prefs = habitat_prefs[species]
    
    # Calculate individual suitability scores (0-1)
    temp_suit = gaussian_suitability(temp, prefs['optimal_temp'], prefs['tolerance']['temp'])
    depth_suit = gaussian_suitability(depth, prefs['optimal_depth'], prefs['tolerance']['depth'])
    salinity_suit = gaussian_suitability(salinity, prefs['optimal_salinity'], prefs['tolerance']['salinity'])
    
    # Calculate distance to shore effect
    shore_dist = estimate_distance_to_shore(lat, lon)
    shore_suit = distance_suitability(shore_dist, prefs['distance_to_shore'])
    
    # Weighted combination of factors
    weights = {'temp': 0.3, 'depth': 0.25, 'salinity': 0.25, 'shore': 0.2}
    
    total_suitability = (
        weights['temp'] * temp_suit +
        weights['depth'] * depth_suit +
        weights['salinity'] * salinity_suit +
        weights['shore'] * shore_suit
    )
    
    return total_suitability

def gaussian_suitability(value, optimal, tolerance):
    """Calculate suitability using Gaussian function"""
    return np.exp(-0.5 * ((value - optimal) / tolerance) ** 2)

def distance_suitability(distance, preferred_range):
    """Calculate suitability based on distance preference"""
    min_dist, max_dist = preferred_range
    if min_dist <= distance <= max_dist:
        return 1.0
    elif distance < min_dist:
        return max(0.0, 1.0 - (min_dist - distance) / min_dist)
    else:
        return max(0.0, 1.0 - (distance - max_dist) / max_dist)

def estimate_distance_to_shore(lat, lon):
    """Estimate distance to nearest shore (simplified)"""
    # Indonesian coastline approximation
    coastline_points = [
        (-6.2, 106.8), (-7.8, 110.4), (-8.1, 115.2), (-8.7, 116.3),
        (-2.5, 140.7), (1.3, 124.8), (3.6, 125.7), (0.8, 127.4),
        (-0.9, 131.3), (-3.7, 128.2), (5.5, 95.3), (3.1, 98.7)
    ]
    
    distances = [np.sqrt((lat - clat)**2 + (lon - clon)**2) * 111 for clat, clon in coastline_points]
    return min(distances)

def generate_enhanced_environmental_data(lat, lon, species, habitat_prefs):
    """Generate more realistic environmental data"""
    prefs = habitat_prefs.get(species, {})
    
    # Temperature with seasonal and depth variation
    base_temp = 28.0 - (lat + 5) * 0.8  # Latitude effect
    seasonal_var = np.random.normal(0, 1.5)  # Seasonal variation
    depth_var = -0.02 * prefs.get('optimal_depth', 10)  # Depth cooling
    temperature = base_temp + seasonal_var + depth_var
    
    # Constrain to species range
    if 'temp_range' in prefs:
        temperature = np.clip(temperature, prefs['temp_range'][0], prefs['temp_range'][1])
    
    # Depth based on bathymetry and species preference
    if 'optimal_depth' in prefs:
        depth = np.random.normal(prefs['optimal_depth'], prefs['tolerance']['depth'])
        depth = max(0, min(depth, prefs['depth_range'][1]))
    else:
        depth = np.random.uniform(0, 50)
    
    # Salinity based on habitat type and distance to shore
    shore_dist = estimate_distance_to_shore(lat, lon)
    if prefs.get('habitat_type', '').startswith('fresh'):
        salinity = max(0, np.random.normal(2, 3) - shore_dist * 0.1)
    else:
        salinity = 35 - max(0, (50 - shore_dist) * 0.1) + np.random.normal(0, 0.5)
    
    # Constrain salinity
    if 'salinity_range' in prefs:
        salinity = np.clip(salinity, prefs['salinity_range'][0], prefs['salinity_range'][1])
    
    return temperature, depth, salinity

def generate_intelligent_absence_data(presence_df, selected_species, habitat_prefs, ratio=1.0):
    """Generate more intelligent absence data using environmental constraints"""
    if len(presence_df) == 0:
        return pd.DataFrame()
    
    np.random.seed(42)
    
    # Define study area bounds with buffer
    lat_min = presence_df['decimalLatitude'].min() - 2
    lat_max = presence_df['decimalLatitude'].max() + 2
    lon_min = presence_df['decimalLongitude'].min() - 2
    lon_max = presence_df['decimalLongitude'].max() + 2
    
    # Constrain to Indonesian waters
    lat_min = max(lat_min, -11)
    lat_max = min(lat_max, 6)
    lon_min = max(lon_min, 95)
    lon_max = min(lon_max, 141)
    
    absences = []
    target_count = int(len(presence_df) * ratio)
    attempts = 0
    max_attempts = target_count * 10
    
    # Get presence coordinates for distance calculation
    presence_coords = presence_df[['decimalLatitude', 'decimalLongitude']].values
    
    while len(absences) < target_count and attempts < max_attempts:
        attempts += 1
        
        # Generate random point
        lat = np.random.uniform(lat_min, lat_max)
        lon = np.random.uniform(lon_min, lon_max)
        
        # Check minimum distance from presence points
        point = np.array([[lat, lon]])
        distances = cdist(point, presence_coords)[0]
        min_distance = np.min(distances)
        
        if min_distance < 0.5:  # Too close to presence point
            continue
        
        # Generate environmental data
        temp, depth, salinity = generate_enhanced_environmental_data(lat, lon, selected_species, habitat_prefs)
        
        # Calculate habitat suitability
        suitability = calculate_habitat_suitability(lat, lon, temp, depth, salinity, selected_species, habitat_prefs)
        
        # Bias towards less suitable areas for absence (but not completely unsuitable)
        if np.random.random() < (1 - suitability) * 0.8 + 0.1:
            absences.append({
                'decimalLatitude': lat,
                'decimalLongitude': lon,
                'temperature': temp,
                'depth': depth,
                'salinity': salinity,
                'label': 0,
                'species': 'absence',
                'scientificName': 'absence',
                'year': np.random.randint(1990, 2024),
                'habitat_suitability': suitability
            })
    
    print(f"Generated {len(absences)} absence points from {attempts} attempts")
    return pd.DataFrame(absences)

def add_derived_features(df, selected_species, habitat_prefs):
    """Add derived features that may improve model performance"""
    # Distance to shore
    df['distance_to_shore'] = df.apply(
        lambda row: estimate_distance_to_shore(row['decimalLatitude'], row['decimalLongitude']), 
        axis=1
    )
    
    # Habitat suitability score
    df['habitat_suitability'] = df.apply(
        lambda row: calculate_habitat_suitability(
            row['decimalLatitude'], row['decimalLongitude'],
            row['temperature'], row['depth'], row['salinity'],
            selected_species, habitat_prefs
        ),
        axis=1
    )
    
    # Temperature difference from optimal
    if selected_species in habitat_prefs:
        optimal_temp = habitat_prefs[selected_species]['optimal_temp']
        df['temp_deviation'] = abs(df['temperature'] - optimal_temp)
        
        optimal_depth = habitat_prefs[selected_species]['optimal_depth']
        df['depth_deviation'] = abs(df['depth'] - optimal_depth)
        
        optimal_salinity = habitat_prefs[selected_species]['optimal_salinity']
        df['salinity_deviation'] = abs(df['salinity'] - optimal_salinity)
    
    # Interaction features
    df['temp_depth_interaction'] = df['temperature'] * df['depth'] / 100
    df['lat_lon_interaction'] = df['decimalLatitude'] * df['decimalLongitude'] / 100
    
    return df

def load_and_prepare_data(selected_species=None):
    """Enhanced data loading and preparation"""
    try:
        print("Loading FASTA species data...")
        fasta_species = load_fasta_species()
        
        print("Loading occurrence data from CSV...")
        url = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/occurrence-q4D1BSg6qEE6PpgihdkwFSFmjxw9rs.csv"
        response = requests.get(url, timeout=30)
        response.raise_for_status()

        df = pd.read_csv(StringIO(response.text), sep='\t', on_bad_lines='skip')

        print(f"Raw data loaded: {len(df)} records")
        
        # Enhanced data cleaning
        df = df[['decimalLatitude', 'decimalLongitude', 'species', 'scientificName', 'year']].dropna()
        df['decimalLatitude'] = pd.to_numeric(df['decimalLatitude'], errors='coerce')
        df['decimalLongitude'] = pd.to_numeric(df['decimalLongitude'], errors='coerce')
        df = df.dropna()
        
        # Remove obvious outliers
        df = df[
            (df['decimalLatitude'] >= -15) & (df['decimalLatitude'] <= 10) &
            (df['decimalLongitude'] >= 90) & (df['decimalLongitude'] <= 145)
        ]
        
        # Filter for Indonesian waters with buffer
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
        
        if len(df) == 0:
            print("No data found, using fallback")
            return generate_fallback_data(selected_species)
        
        # Get enhanced habitat preferences
        habitat_prefs = get_enhanced_species_habitat_preferences()
        
        # Generate enhanced environmental data
        env_data = []
        for _, row in df.iterrows():
            temp, depth, salinity = generate_enhanced_environmental_data(
                row['decimalLatitude'], row['decimalLongitude'], 
                selected_species, habitat_prefs
            )
            env_data.append({'temperature': temp, 'depth': depth, 'salinity': salinity})
        
        env_df = pd.DataFrame(env_data)
        df[['temperature', 'depth', 'salinity']] = env_df
        
        # Create presence dataset
        presence_df = df.copy()
        presence_df['label'] = 1
        
        # Generate intelligent absence data
        absence_df = generate_intelligent_absence_data(df, selected_species, habitat_prefs)
        
        # Combine presence and absence data
        full_df = pd.concat([presence_df, absence_df], ignore_index=True)
        
        # Add derived features
        full_df = add_derived_features(full_df, selected_species, habitat_prefs)
        presence_df = add_derived_features(presence_df, selected_species, habitat_prefs)
        
        # Define coordinate ranges
        lat_range = (full_df['decimalLatitude'].min(), full_df['decimalLatitude'].max())
        lon_range = (full_df['decimalLongitude'].min(), full_df['decimalLongitude'].max())
        
        print(f"Prepared {len(presence_df)} presence records and {len(absence_df)} absence records")
        print(f"Coordinate ranges: Lat {lat_range}, Lon {lon_range}")
        
        return presence_df, full_df, lat_range, lon_range, fasta_species
        
    except Exception as e:
        print(f"Error in load_and_prepare_data: {e}")
        return generate_fallback_data(selected_species)

def generate_fallback_data(selected_species=None):
    """Enhanced fallback data generation"""
    print("Using enhanced fallback mock data")
    
    np.random.seed(42)
    habitat_prefs = get_enhanced_species_habitat_preferences()
    species_to_use = selected_species or 'Chanos_chanos'
    
    # Generate realistic presence data based on species preferences
    presence_data = []
    for _ in range(750):  # More data points
        if species_to_use in habitat_prefs:
            prefs = habitat_prefs[species_to_use]
            
            # Generate coordinates based on habitat type
            if prefs['habitat_type'].startswith('fresh'):
                lat = np.random.normal(-3, 2)
                lon = np.random.normal(115, 8)
            else:
                lat = np.random.uniform(-8, 2)
                lon = np.random.uniform(110, 135)
        else:
            lat = np.random.uniform(-8, 2)
            lon = np.random.uniform(110, 135)
        
        temp, depth, salinity = generate_enhanced_environmental_data(lat, lon, species_to_use, habitat_prefs)
        
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
    
    # Generate intelligent absence data
    absence_df = generate_intelligent_absence_data(presence_df, species_to_use, habitat_prefs)
    
    # Combine datasets
    full_df = pd.concat([presence_df, absence_df], ignore_index=True)
    
    # Add derived features
    full_df = add_derived_features(full_df, species_to_use, habitat_prefs)
    presence_df = add_derived_features(presence_df, species_to_use, habitat_prefs)
    
    lat_range = (-8, 2)
    lon_range = (110, 135)
    fasta_species = load_fasta_species()
    
    return presence_df, full_df, lat_range, lon_range, fasta_species