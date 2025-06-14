// App.js
import React, { useEffect } from 'react';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CartProvider } from './src/context/CartContext';
import CoverScreen from './src/screens/CoverScreen';
import MenuScreen from './src/screens/MenuScreen';
import CartScreen from './src/screens/CartScreen';
import OrderSummaryScreen from './src/screens/OrderSummaryScreen';
import SignupScreen from './src/screens/SignupScreen';
import OrderStatusScreen from './src/screens/OrderStatusScreen';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => {
    async function registerForPushNotificationsAsync() {
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        console.log("🔔 Notification permission:", existingStatus);
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
          console.log("🔔 Final notification permission:", finalStatus);
        }

        if (finalStatus !== 'granted') {
          alert('Failed to get push token!');
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync();
        const pushToken = tokenData.data;
        console.log('Push token:', pushToken);

        // TODO: Save `pushToken` to Supabase and link it to the order
      } else {
        alert('Must use physical device for Push Notifications');
      }
    }

    registerForPushNotificationsAsync();
  }, []);

  return (
    <CartProvider>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Cover">
          <Stack.Screen
            name="Cover"
            component={CoverScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Menu"
            component={MenuScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Cart"
            component={CartScreen}
            options={{
              title: 'Your Cart',
              headerBackTitle: 'Back',
              headerTintColor: "#a8e4a0",
            }}
          />
          <Stack.Screen
            name="OrderSummary"
            component={OrderSummaryScreen}
            options={{ title: 'Order Summary' }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ title: 'Create Account' }}
          />
          <Stack.Screen
            name="OrderStatus"
            component={OrderStatusScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </CartProvider>
  );
}
