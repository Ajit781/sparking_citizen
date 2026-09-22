import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
} from 'react-native';
import { colors } from '../theme/colors';

interface ImagePickerActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickGallery: () => void;
  title?: string;
  subtitle?: string;
}

export default function ImagePickerActionSheet({
  visible,
  onClose,
  onTakePhoto,
  onPickGallery,
  title = 'Select Photo Source',
  subtitle = 'Choose a photo to verify your citizen profile',
}: ImagePickerActionSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={s.sheet}>
          {/* Bottom Sheet Pill Handle */}
          <View style={s.handle} />

          {/* Sheet Header */}
          <View style={s.header}>
            <View style={s.badgeRow}>
              <View style={s.themeTag}>
                <Text style={s.themeTagText}>PHOTO UPLOAD</Text>
              </View>
            </View>
            <Text style={s.title}>{title}</Text>
            <Text style={s.subtitle}>{subtitle}</Text>
          </View>

          {/* Options Container */}
          <View style={s.optionsContainer}>

            {/* Option 1: Take Photo */}
            <Pressable
              style={({ pressed }) => [s.optionBtn, pressed && s.optionBtnPressed]}
              onPress={() => {
                onClose();
                setTimeout(onTakePhoto, 250);
              }}>
              <View style={s.iconBox}>
                <Image
                  source={require('../../assets/icons/icon_camera_real.png')}
                  style={s.iconImg}
                  resizeMode="contain"
                />
              </View>

              <View style={s.optionTextCol}>
                <Text style={s.optionLabel}>Take Photo</Text>
                <Text style={s.optionDesc}>Use device camera to click live photo</Text>
              </View>

              <Image
                source={require('../../assets/icons/icon_chevron.png')}
                style={s.chevronIcon}
                resizeMode="contain"
              />
            </Pressable>

            {/* Option 2: Choose from Gallery */}
            <Pressable
              style={({ pressed }) => [s.optionBtn, pressed && s.optionBtnPressed]}
              onPress={() => {
                onClose();
                setTimeout(onPickGallery, 250);
              }}>
              <View style={s.iconBox}>
                <Image
                  source={require('../../assets/icons/icon_file_text.png')}
                  style={s.iconImg}
                  resizeMode="contain"
                />
              </View>

              <View style={s.optionTextCol}>
                <Text style={s.optionLabel}>Choose from Gallery</Text>
                <Text style={s.optionDesc}>Select an existing image from photos</Text>
              </View>

              <Image
                source={require('../../assets/icons/icon_chevron.png')}
                style={s.chevronIcon}
                resizeMode="contain"
              />
            </Pressable>
          </View>

          {/* Cancel Button */}
          <Pressable
            style={({ pressed }) => [s.cancelBtn, pressed && s.cancelBtnPressed]}
            onPress={onClose}>
            <Text style={s.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  handle: {
    width: 44,
    height: 4.5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    marginBottom: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  themeTag: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  themeTagText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
    lineHeight: 17,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 22,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  optionBtnPressed: {
    backgroundColor: '#FFFBF7',
    borderColor: colors.primary,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  iconImg: {
    width: 20,
    height: 20,
    tintColor: colors.primary,
  },
  optionTextCol: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 11.5,
    color: '#64748B',
    fontWeight: '500',
  },
  chevronIcon: {
    width: 14,
    height: 14,
    tintColor: '#94A3B8',
    marginLeft: 6,
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelBtnPressed: {
    backgroundColor: '#E2E8F0',
    transform: [{ scale: 0.99 }],
  },
  cancelText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '800',
  },
});