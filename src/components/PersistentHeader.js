import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native'

export default function PersistentHeader({ navigation, title = "GRAB COFFEE." }) {
  const handleProfilePress = () => {
    navigation.navigate('Profile')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>
        
        <TouchableOpacity
          style={styles.profileButton}
          onPress={handleProfilePress}
          activeOpacity={0.8}
        >
          <View style={styles.profileIcon}>
            <Text style={styles.profileText}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#a8e4a0',
  },
  header: {
    backgroundColor: '#a8e4a0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'android' ? 20 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    color: 'white',
    fontWeight: '700',
    letterSpacing: -0.5,
    ...Platform.select({
      ios: { fontFamily: 'AvenirNext-Bold', fontWeight: '500' },
      android: { fontFamily: 'sans-serif-condensed', fontWeight: 'normal' },
      web: { fontFamily: 'Segoe UI Black, Arial Black, sans-serif', fontWeight: '500' },
      default: { fontFamily: 'System', fontWeight: '800' },
    }),
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  profileText: {
    fontSize: 18,
  },
}) 