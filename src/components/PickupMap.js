import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';

const PICKUP_COORDS = {
  latitude: 43.6476,
  longitude: -79.3728, // 25 The Esplanade, Toronto
};

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    0.5 - Math.cos(dLat)/2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    (1 - Math.cos(dLon))/2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

export default function PickupMap() {
  const [userLocation, setUserLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState(null);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setUserLocation(location.coords);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (userLocation) {
      const dist = getDistanceFromLatLonInKm(
        userLocation.latitude,
        userLocation.longitude,
        PICKUP_COORDS.latitude,
        PICKUP_COORDS.longitude
      );
      setDistance(dist);
      // Assume average walking speed 5km/h
      const etaMin = Math.round((dist / 5) * 60);
      setEta(etaMin);
    }
  }, [userLocation]);

  if (loading) {
    return <ActivityIndicator style={{ marginVertical: 24 }} size="large" color="#a0b796" />;
  }
  if (errorMsg) {
    return (
      <View style={styles.mapContainer}>
        <Text style={styles.locationNote}>
          Enable location services to view in maps.
        </Text>
        <Text style={styles.error}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: PICKUP_COORDS.latitude,
          longitude: PICKUP_COORDS.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        customMapStyle={mapStyle}
      >
        <Marker
          coordinate={PICKUP_COORDS}
          pinColor="#a0b796"
          title="Grab Coffee Pickup"
          description="Outside 25 The Esplanade"
          strokeColor="#a0b796"
        />
        {userLocation && (
          <Polyline
            coordinates={[
              { latitude: userLocation.latitude, longitude: userLocation.longitude },
              PICKUP_COORDS,
            ]}
            strokeColor="#a0b796"
            strokeWidth={3}
          />
        )}
      </MapView>
      {distance !== null && eta !== null && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Distance: {distance.toFixed(2)} km
          </Text>
          <Text style={styles.infoText}>
            ETA: {eta} min
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#e2efe7',
    alignSelf: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  infoBox: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoText: {
    color: '#2c1810',
    fontWeight: '600',
    fontSize: 15,
  },
  error: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 24,
  },
  locationNote: {
    color: '#2c1810',
    textAlign: 'center',
    marginVertical: 24,
  },
});

const mapStyle = [
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
]; 