import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
  Alert,
  PermissionsAndroid,
  Modal,
} from 'react-native';
import { Camera, CameraType } from 'react-native-camera-kit';
import { Images } from 'react-native-nitro-image';
import { colors } from '../theme/colors';

interface VisionCameraProps {
  visible: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
}

export default function VisionCamera({ visible, onClose, onCapture }: VisionCameraProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const camera = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    if (visible) {
      checkPermission();
    }
  }, [visible]);

  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera permission to capture vehicle photo',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
        } else {
          setHasPermission(false);
          Alert.alert('Permission Denied', 'Camera permission is required.');
          onClose();
        }
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  };



  const handleCapture = async () => {
    if (!camera.current || isCapturing) return;

    setIsCapturing(true);
    try {
      console.log('[VisionCamera] Calling capture()...');
      const image = await camera.current.capture();
      console.log('[VisionCamera] capture() success.', image.uri);

      let filePath = image.uri;
      if (Platform.OS === 'android' && !filePath.startsWith('file://')) {
        filePath = `file://${filePath}`;
      }

      console.log('[VisionCamera] Final filePath to fetch:', filePath);

      // --- Compress image via nitro-image ---
      let finalFilePath = filePath;
      try {
        const nitroImage = await Images.loadFromFileAsync(filePath.replace('file://', ''));
        const smallNitroImage = await nitroImage.resizeAsync(400, Math.floor(400 * (nitroImage.height / nitroImage.width)));
        const compressedPath = await smallNitroImage.saveToTemporaryFileAsync('jpg', 40);
        finalFilePath = `file://${compressedPath}`;
        console.log('[VisionCamera] Compression success, new path:', finalFilePath);
      } catch (err) {
        console.error('[VisionCamera] nitro-image error:', err);
      }
      // ----------------------------------------

      const response = await fetch(finalFilePath);
      const blob = await response.blob();
      console.log('[VisionCamera] Blob created, size:', blob.size);

      const reader = new FileReader();
      reader.onloadend = () => {
        console.log('[VisionCamera] FileReader onloadend triggered. Converting to base64...');
        let base64data = reader.result as string;
        
        // The backend expects RAW base64 string without data URI prefix
        if (base64data.includes('base64,')) {
          base64data = base64data.split('base64,')[1];
        }

        console.log('[VisionCamera] Success! Raw Base64 string length:', base64data.length);
        onCapture(base64data);
        setIsCapturing(false);
      };
      reader.onerror = (err) => {
        console.error('[VisionCamera] FileReader Error:', err);
        setIsCapturing(false);
      };
      reader.readAsDataURL(blob);

    } catch (error) {
      console.error('[VisionCamera] Capture Exception:', error);
      setIsCapturing(false);
    }
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
        <View style={[StyleSheet.absoluteFill, s.centerContainer, { backgroundColor: '#000' }]}>
          <ActivityIndicator size="large" color="#FFF" />
          <Text style={s.text}>Requesting Camera Permission...</Text>
          <Pressable style={[s.closeBtn, { marginTop: 20 }]} onPress={onClose}>
            <Text style={s.closeBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
        <View style={[StyleSheet.absoluteFill, s.centerContainer, { backgroundColor: '#000' }]}>
          <Text style={s.text}>Camera Permission Denied</Text>
          <Pressable style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeBtnText}>Close</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]}>
        <View style={{ flex: 1 }}>
          <Camera
            ref={camera}
            style={{ flex: 1 }}
            cameraType={CameraType.Back}
            flashMode="auto"
          />
          
          {/* Top Header */}
          <View style={s.header}>
            <Pressable onPress={onClose} style={s.headerCloseBtn} hitSlop={20}>
              <Text style={s.headerCloseIcon}>✕</Text>
            </Pressable>
          </View>

          {/* Bottom Controls */}
          <View style={s.bottomControls}>
            <View style={s.captureRing}>
              <Pressable 
                onPress={handleCapture}
                disabled={isCapturing}
                style={({ pressed }) => [
                  s.captureButton,
                  pressed && { transform: [{ scale: 0.95 }] },
                  isCapturing && { opacity: 0.5 }
                ]}
              >
                {isCapturing && <ActivityIndicator color={colors.primary} />}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 20,
  },
  closeBtn: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  closeBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 20,
    zIndex: 10,
  },
  headerCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCloseIcon: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
