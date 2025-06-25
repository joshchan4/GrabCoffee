import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../utils/supabase';
import * as Notifications from 'expo-notifications';
import dayjs from 'dayjs';

export default function OrderStatusScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [etaMinutesLeft, setEtaMinutesLeft] = useState(null);
  const [ready, setReady] = useState(false);
  const [delayed, setDelayed] = useState(false);
  const [notified, setNotified] = useState({ ready: false, delayed: false });

  useEffect(() => {
    let timerInterval, pollingInterval;

    const startPolling = async () => {
      pollingInterval = setInterval(async () => {
        const { data, error } = await supabase
          .from('Orders')
          .select('ready, delivered, delayed, estimated_delivery_time')
          .eq('id', orderId)
          .maybeSingle();

        if (error || !data) {
          console.error('Polling error:', error);
          return;
        }

        const {
          ready: isReady,
          delivered: isDelivered,
          delayed: isDelayed,
          estimated_delivery_time: etaTime,
        } = data;

        if (etaTime) {
          const now = dayjs();
          const eta = dayjs(etaTime);
          const minutesLeft = eta.diff(now, 'minute');
          setEtaMinutesLeft(minutesLeft > 0 ? minutesLeft : 0);
        }

        if (isReady === 't' && !ready) {
          setReady(true);
          if (!notified.ready) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Order Ready!',
                body: 'Your order is ready for pickup!',
              },
              trigger: null,
            });
            setNotified(prev => ({ ...prev, ready: true }));
          }
        }

        if (isDelayed && !delayed) {
          setDelayed(true);
          if (!notified.delayed) {
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'Order Delayed',
                body: 'Your order is taking longer than expected. Thanks for waiting!',
              },
              trigger: null,
            });
            setNotified(prev => ({ ...prev, delayed: true }));
          }
        }

        if (isDelivered === 't') {
          clearInterval(pollingInterval);
          clearInterval(timerInterval);
          navigation.reset({
            index: 0,
            routes: [{ name: 'Cover' }],
          });
        }
      }, 3000);
    };

    startPolling();

    return () => {
      clearInterval(pollingInterval);
    };
  }, [orderId, navigation, ready, delayed, notified]);

  return (
    <View style={styles.container}>
      {ready ? (
        <Text style={styles.text}>✅ Your order is ready!</Text>
      ) : delayed ? (
        <Text style={styles.text}>⚠️ Order is delayed</Text>
      ) : (
        <>
          <Text style={styles.text}>⏳ Estimated time remaining</Text>
          <Text style={styles.timer}>
            {etaMinutesLeft !== null ? `${etaMinutesLeft} min` : 'Loading...'}
          </Text>
        </>
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
});
