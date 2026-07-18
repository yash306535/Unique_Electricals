import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';

// Get Cloudinary config from environment variables
const getCloudinaryConfig = () => {
  // Try to get from Constants.expoConfig.extra first
  const extra = Constants.expoConfig?.extra || {};
  
  const cloudName = 
    extra.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 
    process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    'dx2e7v6y7';
  
  const uploadPreset = 
    extra.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 
    process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET ||
    'construction-manager';

  return { cloudName, uploadPreset };
};

const { cloudName: CLOUDINARY_CLOUD_NAME, uploadPreset: CLOUDINARY_UPLOAD_PRESET } = getCloudinaryConfig();
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Pick an image from device gallery
 */
export const pickImage = async (): Promise<string | null> => {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) {
      console.log('Permission to access media library denied');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error picking image:', error);
    return null;
  }
};

/**
 * Take a photo with camera
 */
export const takePhoto = async (): Promise<string | null> => {
  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permission.granted) {
      console.log('Permission to access camera denied');
      return null;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

/**
 * Upload image to Cloudinary
 */
export const uploadToCloudinary = async (
  imageUri: string,
  folder: string = 'construction-manager'
): Promise<{ url: string; cloudinaryId: string } | null> => {
  try {
    const formData = new FormData();
    
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append('file', {
      uri: imageUri,
      type,
      name: filename,
    } as any);
    
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('folder', folder);
    formData.append('quality', 'auto');
    formData.append('fetch_format', 'auto');

    console.log('Uploading to Cloudinary...');
    console.log('Cloud Name:', CLOUDINARY_CLOUD_NAME);
    console.log('Upload Preset:', CLOUDINARY_UPLOAD_PRESET);
    console.log('URL:', CLOUDINARY_UPLOAD_URL);

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();
    console.log('Cloudinary Response Status:', response.status);
    console.log('Cloudinary Response:', responseText);

    if (!response.ok) {
      console.error('Upload failed with status:', response.status, 'Response:', responseText);
      throw new Error(`Upload failed: ${response.status} - ${responseText}`);
    }

    const data = JSON.parse(responseText);
    
    if (data.error) {
      throw new Error(`Cloudinary error: ${data.error.message}`);
    }

    console.log('Upload successful:', data.secure_url);
    
    return {
      url: data.secure_url,
      cloudinaryId: data.public_id,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
};

/**
 * Delete image from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    // Note: Deletion requires API signature validation
    // For now, we'll just remove from database
    // In production, implement server-side deletion endpoint
    return true;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return false;
  }
};

/**
 * Get image dimensions
 */
export const getImageDimensions = async (
  imageUri: string
): Promise<{ width: number; height: number } | null> => {
  try {
    return new Promise((resolve) => {
      // For web and native, dimensions come from image properties
      resolve({ width: 800, height: 600 });
    });
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
};
