// src/screens/OrderStatusScreen.jsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../utils/supabase';
import * as Notifications from 'expo-notifications';

export default function OrderStatusScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [secondsLeft, setSecondsLeft] = useState(10 * 60); // 10 minutes
  const [ready, setReady] = useState(false);
  const [notified, setNotified] = useState(false); // prevent double notifications

  useEffect(() => {
    let isMounted = true;

    // Countdown timer
    const timerInterval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev > 0) return prev - 1;
        clearInterval(timerInterval);
        return 0;
      });
    }, 1000);

    // Supabase polling
    const deliveryInterval = setInterval(async () => {
      const { data, error } = await supabase
        .from('Orders')
        .select('ready, delivered')
        .eq('id', orderId)
        .maybeSingle();

      if (error) {
        console.error('Error polling order status:', error);
        return;
      }

      // READY check
      if (data?.ready === 't' && !ready) {
        console.log('✅ ready === t, setting ready and firing notification');
        setReady(true);
        console.log('Polling result:', data);

        if (!notified) {
          Notifications.scheduleNotificationAsync({
            content: {
              title: 'Order Ready!',
              body: 'Your order is ready for pickup!',
            },
            trigger: null,
          });
          setNotified(true);
        }
      }

      // DELIVERED check
      if (data?.delivered === 't') {
        clearInterval(timerInterval);
        clearInterval(deliveryInterval);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Cover' }],
        });
      }
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(timerInterval);
      clearInterval(deliveryInterval);
    };
  }, [orderId, navigation, ready, notified]);

  const formatTime = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {ready ? 'Your order is ready!' : 'Estimated time to delivery'}
      </Text>
      {!ready && (
        <Text style={styles.timer}>{formatTime(secondsLeft)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: "#a8e4a0",
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: "white",
    marginBottom: 10,
  },
  timer: {
    fontSize: 36,
    fontWeight: 'bold',
    color: "white",
  },
});
