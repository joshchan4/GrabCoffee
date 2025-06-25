import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  SafeAreaView,
  Image,
} from 'react-native';
import { supabase } from '../utils/supabase';
import GuestIcon from '../../assets/guest.png';

export default function PersistentHeader({ navigation, title = "GRAB COFFEE.", route }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Check for an existing session on component mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
    });

    // Listen for any authentication state changes (login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    // Cleanup the listener when the component unmounts
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId)
        .single();

      if (!error && profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleProfilePress = () => {
    if (user) {
      // If user is logged in, go to Profile screen
      navigation.navigate('Profile');
    } else {
      // If user is a guest, go to Signup screen
      // Get the current route name to return to after signup
      const returnScreen = route?.name || 'Menu';
      navigation.navigate('Signup', { returnScreen });
    }
  };

  const canGoBack = navigation.canGoBack();
  
  // Determine font size based on title length
  const getTitleFontSize = () => {
    if (title === "GRAB COFFEE.") {
      return 24;
    }
    return 18; // Smaller font for longer titles
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.leftContainer}>
          {canGoBack && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { fontSize: getTitleFontSize() }]} numberOfLines={1}>{title}</Text>
        </View>

        <View style={styles.rightContainer}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfilePress}
            activeOpacity={0.8}
          >
            <View style={styles.profileIcon}>
              {profile?.avatar_url ? (
                <Image 
                  source={{ 
                    uri: profile.avatar_url + '?t=' + Date.now() // Cache busting
                  }} 
                  style={styles.userAvatar}
                  onError={(error) => {
                    console.log('Header avatar image error:', error);
                  }}
                  onLoad={() => {
                    console.log('Header avatar image loaded successfully');
                  }}
                />
              ) : (
                <Image source={GuestIcon} style={styles.guestIcon} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#a0b796',
  },
  header: {
    backgroundColor: '#a0b796',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: Platform.OS === 'ios' ? 50 : 60,
  },
  leftContainer: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightContainer: {
    width: 50,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  backButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    color: 'white',
    textAlign: 'center',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
    fontFamily: 'Arial',
    fontWeight: '700',
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
  },
  profileText: {
    fontSize: 18,
  },
  guestIcon: {
    width: 22,
    height: 22,
    tintColor: 'white',
    opacity: 0.8,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
}); 