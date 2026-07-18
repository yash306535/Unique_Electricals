import React, { useState } from 'react';
import {
  View,
  Image,
  TouchableOpacity,
  Text,
  FlatList,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Photo {
  id: string;
  url: string;
  cloudinaryId: string;
  description?: string;
  uploadedBy?: string;
  createdAt?: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  onDelete?: (photoId: string, cloudinaryId: string) => Promise<void>;
  isLoading?: boolean;
  disabled?: boolean;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  onDelete,
  isLoading = false,
  disabled = false,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!photos || photos.length === 0) {
    return null;
  }

  const handleDeletePhoto = async (photo: Photo) => {
    if (!onDelete || disabled) return;

    try {
      setDeleting(true);
      await onDelete(photo.id, photo.cloudinaryId);
      setSelectedPhoto(null);
    } catch (error) {
      console.error('Error deleting photo:', error);
    } finally {
      setDeleting(false);
    }
  };

  const renderThumbnail = ({ item }: { item: Photo }) => (
    <TouchableOpacity
      style={styles.thumbnail}
      onPress={() => setSelectedPhoto(item)}
      disabled={disabled}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.image}
        onError={(error) => console.log('Image load error:', error)}
      />
      <View style={styles.imageOverlay}>
        <Ionicons name="expand" size={20} color="#FFF" />
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="image" size={16} color="#6B7280" />
          <Text style={styles.title}>
            Photos ({photos.length})
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderThumbnail}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEnabled={photos.length > 3}
            contentContainerStyle={styles.photoList}
          />
        )}
      </View>

      <Modal
        visible={!!selectedPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSelectedPhoto(null)}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
            {onDelete && !disabled && (
              <TouchableOpacity
                onPress={() => selectedPhoto && handleDeletePhoto(selectedPhoto)}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="trash" size={24} color="#EF4444" />
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.modalContent}>
            {selectedPhoto && (
              <>
                <Image
                  source={{ uri: selectedPhoto.url }}
                  style={styles.fullImage}
                  onError={(error) => console.log('Image load error:', error)}
                />
                {!!selectedPhoto.description && (
                  <View style={styles.photoDescription}>
                    <Text style={styles.descriptionLabel}>Description</Text>
                    <Text style={styles.descriptionText}>
                      {selectedPhoto.description}
                    </Text>
                  </View>
                )}
                {!!selectedPhoto.createdAt && (
                  <View style={styles.photoMeta}>
                    <Ionicons name="calendar" size={14} color="#9CA3AF" />
                    <Text style={styles.metaText}>
                      {new Date(selectedPhoto.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  photoList: {
    gap: 8,
    paddingRight: 8,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  loadingContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '100%',
    height: '80%',
    resizeMode: 'contain',
  },
  photoDescription: {
    backgroundColor: '#1F2937',
    padding: 12,
    marginTop: 12,
    borderRadius: 8,
    marginHorizontal: 16,
  },
  descriptionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#FFF',
  },
  photoMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 16,
  },
  metaText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});

export default PhotoGallery;
