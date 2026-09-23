import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  Pressable,
} from 'react-native';
import { colors } from '../theme/colors';

interface ErrorModalProps {
  visible: boolean;
  message: string;
  title?: string;
  onClose: () => void;
}

export default function ErrorModal({
  visible,
  message,
  title = 'Notice',
  onClose,
}: ErrorModalProps) {
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        {/* Transparent touchable area to close on outside click */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View style={s.card}>
          <View style={s.iconCircle}>
            <Text style={s.iconText}>⚠️</Text>
          </View>
          <Text style={s.title}>{title}</Text>
          <Text style={s.message}>{message}</Text>
          
          <Pressable style={s.button} onPress={onClose}>
            <Text style={s.buttonText}>OK</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FECACA',
  },
  iconText: {
    fontSize: 28,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
