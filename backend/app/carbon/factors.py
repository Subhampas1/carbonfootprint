"""
Carbon emission factors with source citations.

All values in kg CO2e per unit (km, kWh, flight, or year).
Sources:
  - UK DEFRA 2023: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2023
  - US EPA 2023: https://www.epa.gov/energy/greenhouse-gas-equivalencies-calculator
  - ICAO Carbon Emissions Calculator: https://www.icao.int/environmental-protection/CarbonOffset
  - Our World in Data 2023: https://ourworldindata.org/food-choice-vs-eating-local
  - IPCC AR6 (2023): https://www.ipcc.ch/report/ar6/wg3/
  - IPCC SR1.5 (2018): https://www.ipcc.ch/sr15/
"""

# ---------------------------------------------------------------------------
# Transport — kg CO2e per km driven
# ---------------------------------------------------------------------------
TRANSPORT = {
    # Source: UK DEFRA 2023 — average petrol car, including manufacturing upstream
    "car_petrol": 0.170,
    # Source: UK DEFRA 2023 — average diesel car
    "car_diesel": 0.161,
    # Source: UK DEFRA 2023 — battery electric vehicle (UK grid mix)
    "car_electric": 0.053,
    # Source: UK DEFRA 2023 — local/national average bus
    "bus": 0.089,
    # Source: UK DEFRA 2023 — national rail average
    "train": 0.041,
    # Source: ICAO 2023 — short-haul flight (~1000 km), per passenger including RFI factor
    "flight_short_haul_per_flight": 255.0,
    # Source: ICAO 2023 — long-haul flight (~8000 km), per passenger including RFI factor
    "flight_long_haul_per_flight": 1620.0,
}

# ---------------------------------------------------------------------------
# Home Energy — kg CO2e per kWh consumed
# ---------------------------------------------------------------------------
HOME = {
    # Source: US EPA 2023 — national average grid electricity (eGRID 2022)
    "electricity_per_kwh": 0.233,
    # Source: UK DEFRA 2023 — natural gas, gross calorific value
    "gas_per_kwh": 0.203,
    # Source: UK DEFRA 2023 — heating oil / kerosene
    "oil_per_kwh": 0.298,
}

# ---------------------------------------------------------------------------
# Diet — kg CO2e per year (total food system emissions)
# ---------------------------------------------------------------------------
DIET = {
    # Source: Our World in Data 2023 (Poore & Nemecek 2018) — >100g meat/day
    "meat_heavy": 3300.0,
    # Source: Our World in Data 2023 — 50–100g meat/day
    "meat_medium": 2500.0,
    # Source: Our World in Data 2023 — vegetarian (dairy + eggs included)
    "vegetarian": 1700.0,
    # Source: Our World in Data 2023 — fully plant-based diet
    "vegan": 1100.0,
}

# ---------------------------------------------------------------------------
# Consumption (shopping, goods, services) — kg CO2e per year
# ---------------------------------------------------------------------------
CONSUMPTION = {
    # Source: IPCC AR6 WG3 Ch.5 — high-consumption lifestyle (high income, frequent purchasing)
    "high": 4000.0,
    # Source: IPCC AR6 WG3 Ch.5 — average consumption in high-income countries
    "medium": 2500.0,
    # Source: IPCC AR6 WG3 Ch.5 — low-consumption, minimal goods / second-hand focus
    "low": 1200.0,
}

# ---------------------------------------------------------------------------
# Benchmarks
# ---------------------------------------------------------------------------

# Source: Our World in Data 2023 — global per-capita average CO2e emissions (all sectors)
GLOBAL_AVERAGE = 4000.0  # kg CO2e/year

# Source: IPCC SR1.5 (2018) — sustainable per-capita budget to limit warming to 1.5°C by 2050
PARIS_TARGET = 2000.0  # kg CO2e/year
