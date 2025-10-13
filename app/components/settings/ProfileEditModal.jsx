import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import PersonalInfoForm from './PersonalInfoForm';
import PhotoSection from './PhotoSection';
import BioSection from './BioSection';

export default function ProfileEditModal({
  visible,
  onClose,
  loading,
  saving,
  firstName,
  setFirstName,
  lastName,
  setLastName,
  residence,
  setResidence,
  validationStatus,
  photos,
  setPhotos,
  onRemovePhoto,
  bio,
  setBio,
  interests,
  setInterests,
  onSave,
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.profileContainer}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <LottieView
              source={require('../../../assets/animations/heart.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
              speed={1}
            />
          </View>
        ) : (
          <>
            {/* Modal Header */}
            <View style={styles.profileModalHeader}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <MaterialIcons name="close" size={24} color="black" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.profileSaveButton,
                  saving && styles.disabledProfileSaveButton
                ]}
                onPress={onSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.profileSaveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.profileForm} 
              contentContainerStyle={styles.profileFormContent}
              showsVerticalScrollIndicator={false}
            >
              <PersonalInfoForm
                firstName={firstName}
                setFirstName={setFirstName}
                lastName={lastName}
                setLastName={setLastName}
                residence={residence}
                setResidence={setResidence}
                validationStatus={validationStatus}
              />
              <PhotoSection
                photos={photos}
                setPhotos={setPhotos}
                required={true}
                onRemovePhoto={onRemovePhoto}
              />
              <BioSection
                bio={bio}
                setBio={setBio}
                interests={interests}
                setInterests={setInterests}
              />
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  profileContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    padding: 5,
  },
  profileSaveButton: {
    backgroundColor: 'hotpink',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  disabledProfileSaveButton: {
    backgroundColor: '#ccc',
  },
  profileSaveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  lottieAnimation: {
    width: 200,
    height: 200,
  },
  profileForm: {
    flex: 1,
    paddingHorizontal: 25,
    paddingVertical: 20,
  },
  profileFormContent: {
    paddingVertical: 20,
    gap: 25,
  },
});

