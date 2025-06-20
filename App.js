// App.js
import React, { useEffect } from 'react';
import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CartProvider } from './src/context/CartContext';
import RootScreen from './src/screens/RootScreen';
import CoverScreen from './src/screens/CoverScreen';
import MenuScreen from './src/screens/MenuScreen';
import CartScreen from './src/screens/CartScreen';
import OrderSummaryScreen from './src/screens/OrderSummaryScreen';
import SignupScreen from './src/screens/SignupScreen';
import OrderStatusScreen from './src/screens/OrderStatusScreen';
import ProfileScreen from './src/screens/ProfileScreen';

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { StripeProvider } from '@stripe/stripe-react-native';

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
    <StripeProvider
      publishableKey={"pk_test_51QRM0nH4lvMQih5aQl7if1hNkakX4Y3LndxKQDRTaYXJoQcpmQh8HR8qjeVcvpMKdDwJjPAbHnS4DuhCFtS0K3y300tCCbfuZx"}
      merchantIdentifier="merchant.com.grabcoffee"
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <CartProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Root"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="Cover" component={CoverScreen} />
              <Stack.Screen
                name="Menu"
                component={MenuScreen}
                options={{ animation: 'none' }}
              />
              <Stack.Screen
                name="Root"
                component={RootScreen}
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
              <Stack.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ headerShown: false }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </CartProvider>
      </GestureHandlerRootView>
    </StripeProvider>
  );
}
