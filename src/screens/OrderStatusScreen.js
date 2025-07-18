import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Button, TouchableOpacity, TextInput, Alert } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { supabase } from '../utils/supabase';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';
import { ProgressBar } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';

// Pickup location coordinates (same as PickupMap)
const PICKUP_COORDS = {
  latitude: 43.6476,
  longitude: -79.3728, // 25 The Esplanade, Toronto
};

// Distance calculation function (same as PickupMap)
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

export default function OrderStatusScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [eta, setEta] = useState(null);
  const [etaMinutesLeft, setEtaMinutesLeft] = useState(null);
  const [progress, setProgress] = useState(0);
  const [showConfirmReceived, setShowConfirmReceived] = useState(false);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [selectedTip, setSelectedTip] = useState(0);
  const [allOrderDrinks, setAllOrderDrinks] = useState([]);
  const [showThankYou, setShowThankYou] = useState(false);
  const confirmedRef = useRef(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Thank you animation and navigation effect (must be top-level)
  useEffect(() => {
    if (showThankYou) {
      const timeout = setTimeout(() => {
        navigation.navigate('Menu');
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [showThankYou]);

  // Fetch user location for ETA
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        let location = await Location.getCurrentPositionAsync({});
        setUserLocation(location.coords);
      }
    })();
  }, []);

  // Poll order status from Supabase
  useEffect(() => {
    let pollingInterval;
    const fetchOrder = async () => {
      if (confirmedRef.current && showThankYou) return; // Don't update UI after thank you
      setLoading(true);
      const { data, error } = await supabase
        .from('Orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle();
      if (error || !data) {
        setError('Could not fetch order status. Please try again.');
        setLoading(false);
        return;
      }
      setOrderDetails(data);
      setLoading(false);
      // Fetch all drinks for this order group
      if (data.created_at && data.name && data.user_id) {
        const { data: allDrinks } = await supabase
          .from('Orders')
          .select('drink_name')
          .eq('created_at', data.created_at)
          .eq('name', data.name)
          .eq('user_id', data.user_id);
        setAllOrderDrinks(allDrinks ? allDrinks.map(d => d.drink_name) : []);
      }
    };
    fetchOrder();
    pollingInterval = setInterval(fetchOrder, 3000);
    return () => clearInterval(pollingInterval);
  }, [orderId, showThankYou]);

  // Calculate ETA when delivered is true
  useEffect(() => {
    if (orderDetails && orderDetails.delivered && userLocation) {
      const PICKUP_COORDS = { latitude: 43.6476, longitude: -79.3728 };
      const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a =
          0.5 - Math.cos(dLat)/2 +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          (1 - Math.cos(dLon))/2;
        return R * 2 * Math.asin(Math.sqrt(a));
      };
      const distance = getDistanceFromLatLonInKm(
        userLocation.latitude,
        userLocation.longitude,
        PICKUP_COORDS.latitude,
        PICKUP_COORDS.longitude
      );
      const travelTimeMinutes = Math.round((distance / 5) * 60); // 5km/h
      setEta(travelTimeMinutes);
      setEtaMinutesLeft(travelTimeMinutes);
      setProgress(0);
    }
  }, [orderDetails, userLocation]);

  // UI: Loading while waiting for staff to confirm order
  if (loading || (orderDetails && !orderDetails.received_order)) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Please wait while we confirm your order</Text>
        <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
      </View>
    );
  }

  // UI: Order is being prepared
  if (orderDetails && orderDetails.received_order && !orderDetails.delivered) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Your order is being prepared</Text>
        <View style={{ marginVertical: 16 }}>
          {/* Show all drink names for this order group */}
          {allOrderDrinks.length > 0 ? (
            allOrderDrinks.map((drink, idx) => (
              <Text key={idx} style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>{drink}</Text>
            ))
          ) : (
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>Order</Text>
          )}
        </View>
        <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
      </View>
    );
  }

  // UI: Order delivered, show ETA and confirm button
  if (orderDetails && orderDetails.delivered && !showConfirmReceived && !showRating) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Your order is on its way!</Text>
        {eta !== null && (
          <Text style={styles.timer}>ETA: {eta} min</Text>
        )}
        <TouchableOpacity
          style={styles.statusButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowConfirmReceived(true);
            confirmedRef.current = true;
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirm Order Received</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show thank you message after rating submit
  if (showThankYou) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Thank you for your feedback!</Text>
        <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
      </View>
    );
  }

  // UI: Show rating after user confirms receipt
  if (showConfirmReceived) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>How would you rate your order?</Text>
        <View style={styles.starContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              style={styles.starButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setRating(star);
              }}
            >
              <Text style={[styles.star, rating >= star && styles.starFilled]}>
                {rating >= star ? '★' : '☆'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={[styles.submitButtonEnhanced, submitLoading && { opacity: 0.6 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setShowThankYou(true);
            setTimeout(() => {
              navigation.navigate('Menu');
            }, 1500);
          }}
          disabled={submitLoading}
        >
          {submitLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonTextEnhanced}>Submit</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // Fallback
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Loading order status...</Text>
      <ActivityIndicator size="large" color="#fff" style={{ marginVertical: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: "#a0b796",
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: "white",
    marginBottom: 10,
    textAlign: 'center',
  },
  timer: {
    fontSize: 36,
    fontWeight: 'bold',
    color: "white",
  },
  statusButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  starButton: {
    padding: 10,
  },
  star: {
    fontSize: 24,
  },
  starFilled: {
    color: '#ffd700',
  },
  submitButton: {
    backgroundColor: '#a0b796',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  tipRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    width: '100%',
  },
  tipButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#fff',
  },
  tipSelected: {
    backgroundColor: '#fff',
    borderColor: '#a0b796',
  },
  tipText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  customInput: {
    width: '80%',
    height: 50,
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    color: 'white',
    fontSize: 18,
    textAlign: 'center',
    backgroundColor: '#e0e0e0',
  },
  tipRowCentered: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    gap: 10,
  },
  tipTextSelected: {
    color: '#a0b796',
    fontWeight: 'bold',
  },
  submitButtonTextSmall: {
    fontSize: 13,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  submitButtonEnhanced: {
    backgroundColor: '#a0b796',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#7a9467',
    transform: [{ scale: 1 }],
  },
  submitButtonTextEnhanced: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.08)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

