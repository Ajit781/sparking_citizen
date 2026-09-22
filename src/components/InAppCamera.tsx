import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';

interface InAppCameraProps {
  onCapture: (path: string) => void;
  onCancel: () => void;
}

export default function InAppCamera({ onCapture, onCancel }: InAppCameraProps) {
  useEffect(() => {
    let isActive = true;
    
    // Use the extremely stable system camera via image-crop-picker instead of vision-camera
    ImagePicker.openCamera({
      mediaType: 'photo',
      compressImageQuality: 0.8,
    })
      .then((image) => {
        if (isActive) {
          console.log('[InAppCamera] System camera success:', image.path);
          onCapture(image.path);
        }
      })
      .catch((err) => {
        if (isActive) {
          console.log('[InAppCamera] System camera cancelled or error:', err);
          onCancel();
        }
      });

    return () => {
      isActive = false;
    };
  }, [onCapture, onCancel]);

  // While the system camera activity is opening above this app, show a loading screen
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
