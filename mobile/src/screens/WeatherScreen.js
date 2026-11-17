import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import {
  CloudSun,
  Droplets,
  Thermometer,
  Wind,
  CloudRain,
  MapPin,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Compass,
  ArrowRight,
  Info,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { fetchAgroWeather, calculateAgroWeatherRisk } from '../config/api';

export default function WeatherScreen({ navigation }) {
  const {
    currentLocation,
    setCurrentLocation,
    weatherData,
    weatherRisk,
    updateWeather,
    latestDiagnosis,
  } = useApp();

  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [manualCity, setManualCity] = useState('');

  // Request location permission and fetch weather on mount
  useEffect(() => {
    requestLocationAndFetchWeather();
  }, []);

  const requestLocationAndFetchWeather = async () => {
    setLoading(true);
    setPermissionDenied(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        // Default fallback: Pune / Central Agricultural Region
        await fetchWeatherData(18.5204, 73.8567, 'Pune District, Maharashtra (Default)');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      let locationLabel = `${latitude.toFixed(2)}°N, ${longitude.toFixed(2)}°E`;
      try {
        const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reverse && reverse.length > 0) {
          const r = reverse[0];
          locationLabel = [r.district || r.city || r.subregion, r.region, r.country]
            .filter(Boolean)
            .join(', ');
        }
      } catch {
        // Fallback to coordinates
      }

      await fetchWeatherData(latitude, longitude, locationLabel);
    } catch (err) {
      Alert.alert(
        'Location Access Notice',
        'Could not fetch GPS coordinates. Using standard agricultural microclimate defaults.'
      );
      await fetchWeatherData(18.5204, 73.8567, 'Central Agricultural Zone');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeatherData = async (lat, lon, label) => {
    setCurrentLocation({ latitude: lat, longitude: lon, label });
    const weather = await fetchAgroWeather(lat, lon);
    updateWeather(weather, latestDiagnosis?.condition);
  };

  const handleManualSearch = async () => {
    if (!manualCity.trim()) return;
    setLoading(true);
    try {
      const geocode = await Location.geocodeAsync(manualCity.trim());
      if (geocode && geocode.length > 0) {
        const { latitude, longitude } = geocode[0];
        await fetchWeatherData(latitude, longitude, manualCity.trim());
        setManualCity('');
      } else {
        Alert.alert('Location Not Found', 'Could not locate that city. Please try another.');
      }
    } catch (err) {
      Alert.alert('Search Error', err.message || 'Failed to search city.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerIcon}>🌦️</Text>
          <View>
            <Text style={styles.title}>Agro-Weather Telemetry</Text>
            <Text style={styles.subtitle}>Microclimate Disease Outbreak Risk</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={requestLocationAndFetchWeather}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#047857" />
          ) : (
            <RefreshCw size={18} color="#047857" />
          )}
        </TouchableOpacity>
      </View>

      {/* Location Banner */}
      <View style={styles.locationBanner}>
        <MapPin size={18} color="#059669" />
        <View style={{ flex: 1 }}>
          <Text style={styles.locationTitle}>Diagnosing Field Location:</Text>
          <Text style={styles.locationName}>
            {currentLocation?.label || 'Detecting GPS coordinates...'}
          </Text>
        </View>
      </View>

      {/* Permission Fallback / Manual Override */}
      {permissionDenied && (
        <View style={styles.manualCard}>
          <View style={styles.manualHeader}>
            <Compass size={16} color="#d97706" />
            <Text style={styles.manualTitle}>GPS Permission Denied</Text>
          </View>
          <Text style={styles.manualSub}>
            Enter your city or district manually to fetch microclimate weather:
          </Text>
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.cityInput}
              placeholder="e.g. Nashik, Fresno, Valencia..."
              value={manualCity}
              onChangeText={setManualCity}
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleManualSearch}>
              <Text style={styles.searchBtnText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Primary Weather Widget */}
      {weatherData && (
        <View style={styles.weatherCard}>
          <View style={styles.weatherTopRow}>
            <View>
              <Text style={styles.tempLarge}>{weatherData.temperature}°C</Text>
              <Text style={styles.weatherCondition}>
                {weatherData.icon} {weatherData.condition}
              </Text>
            </View>
            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>Updated: {weatherData.timestamp}</Text>
            </View>
          </View>

          {/* Grid Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricTile}>
              <Droplets size={20} color="#0284c7" />
              <Text style={styles.metricTileVal}>{weatherData.humidity}%</Text>
              <Text style={styles.metricTileLabel}>Relative Humidity</Text>
            </View>

            <View style={styles.metricTile}>
              <CloudRain size={20} color="#6366f1" />
              <Text style={styles.metricTileVal}>{weatherData.precipitation} mm</Text>
              <Text style={styles.metricTileLabel}>Precipitation</Text>
            </View>

            <View style={styles.metricTile}>
              <Wind size={20} color="#059669" />
              <Text style={styles.metricTileVal}>{weatherData.windSpeed} km/h</Text>
              <Text style={styles.metricTileLabel}>Wind Speed</Text>
            </View>

            <View style={styles.metricTile}>
              <Thermometer size={20} color="#f97316" />
              <Text style={styles.metricTileVal}>
                {weatherData.temperature >= 28 ? 'Warm' : weatherData.temperature >= 18 ? 'Mild' : 'Cool'}
              </Text>
              <Text style={styles.metricTileLabel}>Thermal Band</Text>
            </View>
          </View>
        </View>
      )}

      {/* Disease Outbreak Risk Card */}
      {weatherRisk && (
        <View style={[styles.riskCard, { borderColor: weatherRisk.color }]}>
          <View style={styles.riskHeader}>
            <AlertTriangle size={22} color={weatherRisk.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.riskBadge, { color: weatherRisk.color }]}>
                {weatherRisk.level.toUpperCase()}
              </Text>
              <Text style={styles.riskTitle}>{weatherRisk.title}</Text>
            </View>
          </View>
          <Text style={styles.riskDescription}>{weatherRisk.description}</Text>

          {latestDiagnosis && (
            <View style={styles.correlatedDiagnosisBox}>
              <Text style={styles.correlatedTitle}>
                Correlated with Scanned Disease:
              </Text>
              <Text style={styles.correlatedCondition}>
                {latestDiagnosis.plant} — {latestDiagnosis.condition}
              </Text>
              <Text style={styles.correlatedNote}>
                {latestDiagnosis.condition.toLowerCase().includes('late blight') && weatherData?.humidity >= 75
                  ? 'CRITICAL CORRELATION: Current high humidity matches the exact pathogen incubation profile for Late Blight. Spores travel up to 5 km in humid winds.'
                  : latestDiagnosis.is_healthy
                  ? 'Plant is healthy, but maintain preventive scouting given current environmental moisture.'
                  : 'Maintain scheduled foliar protection and prevent stagnant standing water on foliage.'}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Agricultural Preventive Protocols */}
      <View style={styles.protocolsCard}>
        <View style={styles.protocolsHeader}>
          <ShieldCheck size={18} color="#059669" />
          <Text style={styles.protocolsTitle}>Foliar Microclimate Guidelines</Text>
        </View>

        <View style={styles.protocolItem}>
          <Text style={styles.protocolNumber}>1</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.protocolName}>Irrigation Timing</Text>
            <Text style={styles.protocolDesc}>
              Water crops early in the morning so foliage dries quickly under sunlight. Never irrigate after dusk when humidity is high.
            </Text>
          </View>
        </View>

        <View style={styles.protocolItem}>
          <Text style={styles.protocolNumber}>2</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.protocolName}>Canopy Spacing & Pruning</Text>
            <Text style={styles.protocolDesc}>
              Maintain 45–60 cm between rows to allow breeze penetration, lowering relative humidity around leaf undersides.
            </Text>
          </View>
        </View>

        <View style={styles.protocolItem}>
          <Text style={styles.protocolNumber}>3</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.protocolName}>Fungicide Spray Window</Text>
            <Text style={styles.protocolDesc}>
              Do not spray fungicides when rain is expected within 3 hours or wind speeds exceed 15 km/h to prevent wash-off and spray drift.
            </Text>
          </View>
        </View>
      </View>

      {/* Action Button: Return to Scanner or Support */}
      <TouchableOpacity
        style={styles.actionBtn}
        onPress={() => navigation.navigate('Diagnose')}
      >
        <Text style={styles.actionBtnText}>Back to 3-Leaf Scanner</Text>
        <ArrowRight size={18} color="#ffffff" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#064e3b',
  },
  subtitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  refreshBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e6f4ea',
  },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 10,
    marginBottom: 14,
  },
  locationTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  locationName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  manualCard: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 14,
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  manualTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#b45309',
  },
  manualSub: {
    fontSize: 11,
    color: '#92400e',
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cityInput: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
  },
  searchBtn: {
    backgroundColor: '#d97706',
    paddingHorizontal: 14,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  weatherCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  weatherTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  tempLarge: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0f172a',
  },
  weatherCondition: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    marginTop: 2,
  },
  timeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  metricTileVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 4,
  },
  metricTileLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  riskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  riskBadge: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  riskTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  riskDescription: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 10,
  },
  correlatedDiagnosisBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    marginTop: 6,
  },
  correlatedTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991b1b',
  },
  correlatedCondition: {
    fontSize: 14,
    fontWeight: '800',
    color: '#7f1d1d',
    marginVertical: 2,
  },
  correlatedNote: {
    fontSize: 11,
    color: '#991b1b',
    lineHeight: 16,
  },
  protocolsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  protocolsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  protocolsTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
  },
  protocolItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  protocolNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '800',
  },
  protocolName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 2,
  },
  protocolDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
