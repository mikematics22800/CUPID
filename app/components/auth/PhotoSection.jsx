import { StyleSheet, Text, TouchableOpacity, View, Image, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';

export default function PhotoSection({
  photos,
  setPhotos,
  required = true, // Default to required for backward compatibility
  onRemovePhoto = null, // Optional callback for custom photo removal
}) {

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Check file size (50MB = 50 * 1024 * 1024 bytes)
        const maxSizeInBytes = 50 * 1024 * 1024; // 50MB
        
        if (asset.fileSize && asset.fileSize > maxSizeInBytes) {
          Alert.alert(
            'File Too Large', 
            'Please select an image smaller than 50MB. The selected image is too large.'
          );
          return;
        }
        
        const newPhoto = {
          uri: asset.uri,
          id: Date.now().toString(),
        };
        setPhotos(prev => [...prev, newPhoto]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const removePhoto = async (photoId) => {
    const photoToRemove = photos.find(photo => photo.id === photoId);
    
    if (onRemovePhoto && photoToRemove) {
      // Use custom removal logic if provided
      await onRemovePhoto(photoToRemove);
    } else {
      // Default removal logic
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
    }
  };

  // Render photo grid with uploaded photos
  const renderPhotoGrid = () => {
    const photoSlots = [];
    const maxPhotos = 9;
    const numPhotos = photos.length;
    
    for (let i = 0; i < maxPhotos; i++) {
      if (i < numPhotos) {
        // Display uploaded photo
        const photo = photos[i];
        photoSlots.push(
          <View key={photo.id} style={styles.photoContainer}>
            <Image source={{ uri: photo.uri }} style={styles.photo} />
            <TouchableOpacity 
              style={styles.removePhotoButton} 
              onPress={() => removePhoto(photo.id)}
            >
              <Ionicons name="close-circle" size={24} color="red" />
            </TouchableOpacity>
            <Text style={styles.photoNumber}>{i + 1}</Text>
          </View>
        );
      } else {
        // Render add photo button for remaining slots
        photoSlots.push(
          <TouchableOpacity key={`add-${i}`} style={styles.addPhotoButton} onPress={pickImage}>
            <Ionicons name="add" size={40} color="hotpink" />
            <Text style={styles.addPhotoText}>Add Photo</Text>
          </TouchableOpacity>
        );
      }
    }
    
    return photoSlots;
  };

  return (
    <View style={styles.photoSection}>
      <View style={styles.header}>
        <Text style={styles.requirementText}>
          {photos.length}/3 Minimum 
        </Text>
      </View>
      <View style={styles.photoGrid}>
        {renderPhotoGrid().slice(0, 3)}
      </View>
      <View style={styles.photoGrid}>
        {renderPhotoGrid().slice(3, 6)}
      </View>
      <View style={styles.photoGrid}>
        {renderPhotoGrid().slice(6, 9)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  photoSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  optionalText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  photoGrid: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  photoContainer: {
    width: '30%',
    height: 100,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  photoNumber: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  addPhotoButton: {
    width: '30%',
    height: 100,
    borderRadius: 10,
    backgroundColor: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'hotpink',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    color: 'hotpink',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  requirementText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
  },
}); 