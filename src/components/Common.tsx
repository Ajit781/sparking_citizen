import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {colors} from '../theme/colors';

export const AppIcon = ({
  symbol,
  size = 24,
  color = colors.primary,
}: {
  symbol: string;
  size?: number;
  color?: string;
}) => (
  <Text style={{fontSize: size, color, fontWeight: '900'}}>{symbol}</Text>
);

export const Logo = ({small = false}: {small?: boolean}) => (
  <Image
    source={require('../../assets/SmartParkingLogo.png')}
    style={[
      {width: 92, height: 92, borderRadius: 46},
      small && {width: 48, height: 48, borderRadius: 24},
    ]}
    resizeMode="contain"
  />
);

export const Header = ({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) => (
  <View style={styles.header}>
    {onBack ? (
      <Pressable onPress={onBack} style={styles.iconButton}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
    ) : (
      <View style={{width: 42}} />
    )}
    <View style={{flex: 1}}>
      <Text style={styles.headerTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
    </View>
    <View style={{width: 42}} />
  </View>
);

export const PrimaryButton = ({
  label,
  onPress,
  icon = '→',
}: {
  label: string;
  onPress?: () => void;
  icon?: string;
}) => (
  <Pressable onPress={onPress} style={({pressed}) => [
    styles.primaryButton,
    pressed && {opacity: 0.88},
  ]}>
    <Text style={styles.primaryButtonText}>{label}</Text>
    <Text style={styles.primaryButtonIcon}>{icon}</Text>
  </Pressable>
);

export const SecondaryButton = ({
  label,
  onPress,
  icon = '⌖',
}: {
  label: string;
  onPress?: () => void;
  icon?: string;
}) => (
  <Pressable onPress={onPress} style={styles.secondaryButton}>
    <Text style={styles.secondaryIcon}>{icon}</Text>
    <Text style={styles.secondaryButtonText}>{label}</Text>
  </Pressable>
);

export const Field = ({
  label,
  placeholder,
  required,
  multiline,
  keyboardType = 'default',
  value,
  onChangeText,
  ...rest
}: any) => (
  <View style={{marginBottom: 14}}>
    <Text style={styles.label}>
      {label}
      {required ? <Text style={{color: colors.danger}}> *</Text> : null}
    </Text>
    <TextInput
      placeholder={placeholder}
      placeholderTextColor="#A8846B"
      keyboardType={keyboardType}
      multiline={multiline}
      value={value}
      onChangeText={onChangeText}
      style={[styles.input, multiline && styles.multiline]}
      {...rest}
    />
  </View>
);

export const SelectField = ({
  label,
  value,
  required,
}: {
  label: string;
  value: string;
  required?: boolean;
}) => (
  <View style={{marginBottom: 14}}>
    <Text style={styles.label}>
      {label}
      {required ? <Text style={{color: colors.danger}}> *</Text> : null}
    </Text>
    <View style={styles.select}>
      <Text style={styles.selectText}>{value}</Text>
      <Text style={styles.chevron}>⌄</Text>
    </View>
  </View>
);

export const Card = ({children}: {children: React.ReactNode}) => (
  <View style={styles.card}>{children}</View>
);

const styles = StyleSheet.create({
  logo: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoSmall: {width: 62, height: 62, borderRadius: 31},
  logoS: {
    color: '#fff',
    fontSize: 46,
    fontWeight: '900',
    lineHeight: 48,
  },
  logoText: {
    color: '#fff',
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  header: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  backText: {
    color: colors.primaryDark,
    fontSize: 38,
    lineHeight: 38,
    marginTop: -4,
  },
  headerTitle: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  headerSubtitle: {
    textAlign: 'center',
    color: colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  primaryButton: {
    minHeight: 56,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  primaryButtonIcon: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 22,
  },
  secondaryButton: {
    minHeight: 54,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: '#fff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryIcon: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: colors.primary,
    fontWeight: '900',
    fontSize: 16,
  },
  label: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  input: {
    minHeight: 54,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  select: {
    minHeight: 54,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 22,
    color: colors.primaryDark,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F7E8DA',
  },
});
