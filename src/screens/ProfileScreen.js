import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
} from 'react-native'
import { supabase } from '../utils/supabase'
import * as ImagePicker from 'expo-image-picker'
import * as Haptics from 'expo-haptics'
import GuestIcon from '../../assets/guest.png'

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [avatarModalVisible, setAvatarModalVisible] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarLoadError, setAvatarLoadError] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
  })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      setLoading(true)
      
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        Alert.alert('Error', 'No user found')
        navigation.goBack()
        return
      }
      
      setUser(currentUser)

      // Fetch profile data
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching profile:', error)
        Alert.alert('Error', 'Failed to load profile data')
        return
      }

      setProfile(profileData || {})
      setEditForm({
        full_name: profileData?.full_name || '',
        email: currentUser.email || '',
        phone: profileData?.phone || '',
        address: profileData?.address || '',
      })
    } catch (error) {
      console.error('Error:', error)
      Alert.alert('Error', 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditModalVisible(true);
  }

  const handleSave = async () => {
    if (!editForm.full_name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Name is required')
      return
    }

    try {
      setSaving(true)
      
      // Update email in Supabase Auth if it changed
      if (editForm.email.trim() !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editForm.email.trim()
        })
        
        if (emailError) {
          console.error('Email update error:', emailError)
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert('Error', 'Failed to update email: ' + emailError.message)
          setSaving(false)
          return
        }
      }
      
      // Update profile data
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: editForm.full_name.trim(),
          phone: editForm.phone.trim() || null,
          address: editForm.address.trim() || null,
          updated_at: new Date().toISOString(),
        })

      if (error) {
        console.error('Error updating profile:', error)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Error', 'Failed to update profile')
        return
      }

      // Update local state
      setProfile(prev => ({
        ...prev,
        full_name: editForm.full_name.trim(),
        phone: editForm.phone.trim() || null,
        address: editForm.address.trim() || null,
      }))
      
      // Update user state with new email
      if (editForm.email.trim() !== user.email) {
        setUser(prev => ({
          ...prev,
          email: editForm.email.trim()
        }))
      }

      setEditModalVisible(false)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Profile updated successfully')
    } catch (error) {
      console.error('Error:', error)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photo library')
        return
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        await uploadAvatar(result.assets[0].uri)
      }
    } catch (error) {
      console.error('Error picking image:', error)
      Alert.alert('Error', 'Failed to pick image')
    }
  }

  const uploadAvatar = async (uri) => {
    try {
      setUploading(true)
      
      // Convert URI to blob
      const response = await fetch(uri)
      const blob = await response.blob()
      
      // Upload to Supabase Storage
      const fileExt = uri.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        Alert.alert('Error', 'Failed to upload avatar')
        return
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      console.log('Generated public URL:', publicUrl);
      console.log('File path:', filePath);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        })

      if (updateError) {
        console.error('Update error:', updateError)
        Alert.alert('Error', 'Failed to update avatar')
        return
      }

      // Update local state
      setProfile(prev => ({
        ...prev,
        avatar_url: publicUrl,
      }))

      console.log('Profile updated with new avatar URL:', publicUrl);
      Alert.alert('Success', 'Avatar updated successfully')
    } catch (error) {
      console.error('Error:', error)
      Alert.alert('Error', 'Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const getDisplayValue = (value) => {
    return value && value.trim() ? value.trim() : 'No Info'
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#a0b796" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.heading}>Profile</Text>
        </View>

        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setAvatarModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            {profile?.avatar_url && !avatarLoadError ? (
              <Image 
                source={{ 
                  uri: profile.avatar_url + '?t=' + Date.now() // Cache busting
                }} 
                style={styles.avatar}
                onError={(error) => {
                  console.log('Avatar image error:', error);
                  setAvatarLoadError(true)
                }}
                onLoad={() => {
                  console.log('Avatar image loaded successfully');
                  setAvatarLoadError(false)
                }}
              />
            ) : (
              <Image source={GuestIcon} style={styles.defaultAvatar} />
            )}
            <View style={styles.avatarOverlay}>
              <Text style={styles.avatarOverlayText}>Change</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <TouchableOpacity onPress={handleEdit} style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{getDisplayValue(profile?.full_name)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email || 'No Info'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{getDisplayValue(profile?.phone)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{getDisplayValue(profile?.address)}</Text>
            </View>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              try {
                const { error } = await supabase.auth.signOut()
                if (error) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert('Error', 'Failed to logout')
                } else {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert('Success', 'Logged out successfully')
                  navigation.navigate('Menu')
                }
              } catch (error) {
                console.error('Logout error:', error)
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', 'Failed to logout')
              }
            }}
          >
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={editForm.full_name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, full_name: text }))}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={editForm.email}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, email: text }))}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={editForm.phone}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, phone: text }))}
                placeholder="Enter your phone number"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.input}
                value={editForm.address}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, address: text }))}
                placeholder="Enter your address"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setEditModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.avatarModalContent}>
            <Text style={styles.modalTitle}>Change Profile Picture</Text>
            
            <View style={styles.avatarOptionsContainer}>
              <TouchableOpacity
                style={styles.avatarOption}
                onPress={() => {
                  setAvatarModalVisible(false)
                  handleAvatarChange()
                }}
                disabled={uploading}
              >
                <Text style={styles.avatarOptionIcon}>📷</Text>
                <Text style={styles.avatarOptionText}>
                  {uploading ? 'Uploading...' : 'Choose from Library'}
                </Text>
                <Text style={styles.avatarOptionSubtext}>
                  Select a photo from your gallery
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.avatarOptionSecondary}
                onPress={() => setAvatarModalVisible(false)}
                disabled={uploading}
              >
                <Text style={styles.avatarOptionSecondaryText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 0,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: {
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  backText: {
    color: '#a0b796',
    fontSize: 16,
    fontWeight: '600',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    letterSpacing: -0.5,
  },
  avatarSection: {
    padding: 20,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  defaultAvatar: {
    width: '100%',
    height: '100%',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarOverlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  profileSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  editButton: {
    padding: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#a0b796',
    borderRadius: 4,
  },
  editButtonText: {
    color: '#a0b796',
    fontSize: 16,
    fontWeight: '600',
  },
  infoContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 50,
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderRadius: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelButton: {
    padding: 12,
    borderWidth: 1,
    borderColor: '#a0b796',
    borderRadius: 4,
  },
  cancelButtonText: {
    color: '#a0b796',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    padding: 12,
    backgroundColor: '#a0b796',
    borderRadius: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarModalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 8,
    width: '80%',
    maxWidth: 400,
  },
  avatarOptionsContainer: {
    alignItems: 'center',
    gap: 16,
  },
  avatarOption: {
    padding: 20,
    borderWidth: 2,
    borderColor: '#a0b796',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8fff8',
    width: '100%',
  },
  avatarOptionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  avatarOptionText: {
    color: '#a0b796',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  avatarOptionSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  avatarOptionSecondary: {
    padding: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  avatarOptionSecondaryText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '500',
  },
  logoutSection: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  logoutButton: {
    padding: 12,
    backgroundColor: '#a0b796',
    borderRadius: 4,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}) 