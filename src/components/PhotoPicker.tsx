import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { pickImage, takePhoto, uploadToCloudinary } from '../utils/photoUtils';

interface PhotoPickerProps {
  onPhotoSelected: (uri: string, cloudinaryUrl: string, cloudinaryId: string) => void;
  onError?: (error: string) => void;
  folder?: string;
  disabled?: boolean;
}

const PhotoPicker: React.FC<PhotoPickerProps> = ({
  onPhotoSelected,
  onError,
  folder = 'construction-manager',
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleSelectFromGallery = async () => {
    try {
      setUploading(true);
      const imageUri = await pickImage();
      
      if (!imageUri) {
        setShowModal(false);
        setUploading(false);
        return;
      }

      const result = await uploadToCloudinary(imageUri, folder);
      
      if (result) {
        onPhotoSelected(imageUri, result.url, result.cloudinaryId);
        setShowModal(false);
      } else {
        onError?.('Failed to upload photo. Please check internet connection and try again.');
      }
    } catch (error) {
      console.error('Gallery upload error:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error uploading photo');
    } finally {
      setUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setUploading(true);
      const imageUri = await takePhoto();
      
      if (!imageUri) {
        setShowModal(false);
        setUploading(false);
        return;
      }

      const result = await uploadToCloudinary(imageUri, folder);
      
      if (result) {
        onPhotoSelected(imageUri, result.url, result.cloudinaryId);
        setShowModal(false);
      } else {
        onError?.('Failed to upload photo. Please check internet connection and try again.');
      }
    } catch (error) {
      console.error('Camera upload error:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error uploading photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={() => setShowModal(true)}
        disabled={disabled || uploading}
      >
        {uploading ? (
          <>
            <ActivityIndicator size="small" color="#FFF" />
            <Text style={styles.buttonText}>Uploading...</Text>
          </>
        ) : (
          <>
            <Ionicons name="camera" size={18} color="#FFF" />
            <Text style={styles.buttonText}>Add Photo</Text>
          </>
        )}
      </TouchableOpacity>

      <Modal
        visible={showModal && !uploading}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Photo</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.option}
              onPress={handleTakePhoto}
              disabled={uploading}
            >
              <Ionicons name="camera" size={32} color="#3B82F6" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Take Photo</Text>
                <Text style={styles.optionDescription}>
                  Use your device camera
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={handleSelectFromGallery}
              disabled={uploading}
            >
              <Ionicons name="images" size={32} color="#10B981" />
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Choose from Gallery</Text>
                <Text style={styles.optionDescription}>
                  Select from your photos
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
            </TouchableOpacity>

            {uploading && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.uploadingText}>Uploading photo...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  uploadingContainer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
});

export default PhotoPicker;
