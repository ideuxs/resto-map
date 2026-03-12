import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Animated,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ExpoLocation from 'expo-location';
import { v4 as uuidv4 } from 'uuid';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Camera, MapPin, Search, X, ArrowLeft, Check } from 'lucide-react-native';
import { BlurView } from 'expo-blur';

import { RestaurantsStackParamList, Restaurant, RestaurantCategory } from '../types';
import { saveRestaurant } from '../storage/storage';
import { saveImageLocally, deleteImage } from '../storage/imageStorage';
import { CATEGORY_LIST } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'AddRestaurant'>;

export default function AddRestaurantScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const editing = route.params?.restaurant;

  const [name, setName] = useState('');
  const [category, setCategory] = useState<RestaurantCategory>('restaurant');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [priceLevel, setPriceLevel] = useState(0);
  const [images, setImages] = useState<string[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationAddress, setLocationAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setCategory(editing.category);
      setAddress(editing.address || '');
      setDescription(editing.description || '');
      setPriceMin(editing.priceMin?.toString() || '');
      setPriceMax(editing.priceMax?.toString() || '');
      setPriceLevel(editing.priceLevel || 0);
      setImages([...editing.images]);
      if (editing.location) {
        setLatitude(editing.location.latitude);
        setLongitude(editing.location.longitude);
        setLocationAddress(editing.location.address || '');
      }
    }
  }, []);

  const pickImages = async () => {
    if (images.length >= 5) {
      Alert.alert('Maximum atteint', '5 images maximum par restaurant.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.8,
    });
    if (!result.canceled) {
      const newUris: string[] = [];
      for (const asset of result.assets) {
        try {
          const localUri = await saveImageLocally(asset.uri);
          newUris.push(localUri);
        } catch (e) {
          console.error("Error picking image:", e);
        }
      }
      setImages((prev) => [...prev, ...newUris].slice(0, 5));
    }
  };

  const removeImage = async (uri: string) => {
    if (!editing || !editing.images.includes(uri)) {
      await deleteImage(uri);
    }
    setImages((prev) => prev.filter((u) => u !== uri));
  };

  const getMyLocation = async () => {
    setLocating(true);
    try {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission refusée', 'Activez la localisation pour utiliser cette fonctionnalité.');
        return;
      }
      const loc = await ExpoLocation.getCurrentPositionAsync({});
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      const results = await ExpoLocation.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (results.length > 0) {
        const a = results[0];
        // Fix: Ensure all relevant address parts are included and correctly formatted
        const addrParts = [a.name, a.street, a.city, a.region, a.postalCode, a.country].filter(Boolean);
        const addr = addrParts.join(', ');
        setLocationAddress(addr);
      }
    } catch (e) {
      Alert.alert('Erreur', 'Impossible d\'obtenir la localisation.');
    } finally {
      setLocating(false);
    }
  };

  const geocodeAddress = async () => {
    if (!address.trim()) {
      Alert.alert('Adresse vide', 'Entrez une adresse pour la géolocaliser.');
      return;
    }
    setLocating(true);
    try {
      const results = await ExpoLocation.geocodeAsync(address.trim());
      if (results.length > 0) {
        setLatitude(results[0].latitude);
        setLongitude(results[0].longitude);
        setLocationAddress(address.trim());
        Alert.alert('Succès', 'Position trouvée !');
      } else {
        Alert.alert('Non trouvé', 'Impossible de géolocaliser cette adresse.');
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de géolocaliser cette adresse.');
    } finally {
      setLocating(false);
    }
  };

  const clearLocation = () => {
    setLatitude(null);
    setLongitude(null);
    setLocationAddress('');
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nom requis', 'Le nom du restaurant est obligatoire.');
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const restaurant: Restaurant = {
        id: editing?.id || uuidv4(),
        name: name.trim(),
        category,
        address: address.trim() || undefined,
        description: description.trim() || undefined,
        priceMin: priceMin ? parseFloat(priceMin) : undefined,
        priceMax: priceMax ? parseFloat(priceMax) : undefined,
        priceLevel: priceLevel || undefined,
        images,
        location:
          latitude != null && longitude != null
            ? { latitude, longitude, address: locationAddress || undefined }
            : undefined,
        createdAt: editing?.createdAt || now,
        updatedAt: now,
      };
      await saveRestaurant(restaurant);
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const inputContainerStyle = [
    styles.inputContainer,
    { backgroundColor: colors.surface, borderColor: colors.border }
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* Custom Header */}
      <BlurView intensity={isDark ? 50 : 90} tint={isDark ? "dark" : "light"} style={[styles.header, { paddingTop: insets.top, height: insets.top + 90 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {editing ? 'Modifier l\'adresse' : 'Nouveau resto'}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtnTop, { backgroundColor: colors.primary }, Shadows.sm]}
          onPress={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Check size={20} color="#FFF" strokeWidth={3} />}
        </TouchableOpacity>
      </BlurView>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 10, paddingBottom: insets.bottom + 100 }]}
        >
          {/* Main Info Section */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Informations générales</Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Nom du lieu *</Text>
          <View style={inputContainerStyle}>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={name}
              onChangeText={setName}
              placeholder="Ex: La Belle Assiette..."
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.primary}
            />
          </View>

          {/* Category Selector */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catRow} contentContainerStyle={{ paddingRight: Spacing.xl }}>
            {CATEGORY_LIST.map((c) => {
              const Icon = c.icon;
              const isSelected = category === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  activeOpacity={0.8}
                  style={[
                    styles.catChip,
                    { backgroundColor: colors.surface },
                    isSelected && { backgroundColor: c.color },
                    Shadows.sm
                  ]}
                  onPress={() => setCategory(c.value)}
                >
                  <Icon size={16} color={isSelected ? '#FFF' : colors.textSecondary} style={{ marginRight: 6 }} />
                  <Text
                    style={[
                      styles.catLabel,
                      { color: colors.textSecondary },
                      isSelected && { color: '#FFF', fontFamily: FontFamily.bold },
                    ]}
                  >
                    {c.label}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </ScrollView>

          {/* Location Section */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: Spacing.xxl }]}>Emplacement</Text>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Adresse postale</Text>
          <View style={[styles.addressRow]}>
            <View style={[inputContainerStyle, { flex: 1 }]}>
              <TextInput
                style={[styles.input, { color: colors.textPrimary }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Ex: 5 Rue de la Paix, Paris..."
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.primary}
              />
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.roundBtn, { backgroundColor: colors.surface }, Shadows.sm]}
              onPress={geocodeAddress}
            >
              <Search size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {latitude !== null && longitude !== null ? (
            <View style={[styles.locationBadge, { backgroundColor: colors.success + '15' }]}>
              <MapPin size={16} color={colors.success} style={{ marginRight: 8 }} />
              <Text style={[styles.locationText, { color: colors.success }]} numberOfLines={1}>
                {locationAddress || (latitude !== null && longitude !== null ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : '')}
              </Text>
              <TouchableOpacity onPress={clearLocation}>
                <X size={18} color={colors.success} style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.locationAction, { backgroundColor: colors.surface }, Shadows.sm]}
              onPress={getMyLocation}
              disabled={locating}
            >
              {locating ? <ActivityIndicator size="small" color={colors.primary} /> : (
                <>
                  <MapPin size={18} color={colors.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.locationActionText, { color: colors.primary }]}>Utiliser ma position actuelle</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Pricing Section */}
          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: Spacing.xxl }]}>Détails & Budget</Text>

          <View style={styles.priceGrid}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Prix Min (€)</Text>
              <View style={inputContainerStyle}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={priceMin}
                  onChangeText={setPriceMin}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Prix Max (€)</Text>
              <View style={inputContainerStyle}>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary }]}
                  value={priceMax}
                  onChangeText={setPriceMax}
                  placeholder="50"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  selectionColor={colors.primary}
                />
              </View>
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Niveau de prix</Text>
          <View style={styles.priceLevelRow}>
            {[1, 2, 3, 4].map((level) => {
              const isSelected = priceLevel === level;
              return (
                <TouchableOpacity
                  key={level}
                  activeOpacity={0.8}
                  style={[
                    styles.priceLevelBtn,
                    { backgroundColor: colors.surface },
                    isSelected && { backgroundColor: colors.primary },
                    Shadows.sm
                  ]}
                  onPress={() => setPriceLevel(isSelected ? 0 : level)}
                >
                  <Text
                    style={[
                      styles.priceLevelText,
                      { color: colors.textSecondary },
                      isSelected && { color: '#FFF', fontFamily: FontFamily.bold },
                    ]}
                  >
                    {'€'.repeat(level)}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Description */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Description & Avis</Text>
          <View style={[inputContainerStyle, styles.multilineContainer]}>
            <TextInput
              style={[styles.input, styles.multiline, { color: colors.textPrimary }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Qu'avez-vous pensé de cet endroit ?..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              selectionColor={colors.primary}
              textAlignVertical="top"
            />
          </View>

          {/* Images Section */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Photos ({images.length}/5)</Text>
            {images.length < 5 && (
              <TouchableOpacity onPress={pickImages}>
                <Text style={[styles.link, { color: colors.primary }]}>Ajouter</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageRow}>
            {images.map((uri) => (
              <View key={uri} style={[styles.imageThumb, Shadows.sm]}>
                <Image source={{ uri }} style={styles.thumbImg} />
                <TouchableOpacity
                  style={styles.removeImg}
                  onPress={() => removeImage(uri)}
                >
                  <X size={14} color="#fff" strokeWidth={3} />
                </TouchableOpacity>
              </View>
            ))}
            {images.length === 0 && (
              <TouchableOpacity
                style={[styles.addImagePlaceholder, { backgroundColor: colors.surface }, Shadows.sm]}
                onPress={pickImages}
              >
                <Camera size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
                <Text style={[styles.addImageText, { color: colors.textMuted }]}>Ajouter des photos</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Bottom Save Button */}
          <TouchableOpacity
            style={[styles.mainSaveBtn, { backgroundColor: colors.primary }, Shadows.glow(colors.primary), saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? <ActivityIndicator color="#FFF" /> : (
              <Text style={[styles.mainSaveBtnText, { color: '#FFF' }]}>
                {editing ? 'Mettre à jour' : 'Ajouter le restaurant'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    flex: 1,
    marginHorizontal: Spacing.md,
    textAlign: 'center',
  },
  saveBtnTop: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: FontSize.xl,
    fontFamily: FontFamily.bold,
    marginBottom: Spacing.lg,
    letterSpacing: -0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  link: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  label: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  inputContainer: {
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.lg,
    height: 56,
    justifyContent: 'center',
    borderWidth: 1,
  },
  input: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.medium,
    height: '100%',
  },
  multilineContainer: {
    height: 120,
    paddingVertical: Spacing.md,
  },
  multiline: {
    textAlignVertical: 'top',
  },
  catRow: {
    marginTop: Spacing.sm,
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.md,
  },
  catLabel: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  roundBtn: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.md,
  },
  locationText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.medium,
    flex: 1,
  },
  locationAction: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.sm,
  },
  locationActionText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
  },
  priceGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  priceLevelRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  priceLevelBtn: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceLevelText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
  },
  imageRow: {
    flexDirection: 'row',
  },
  imageThumb: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xxl,
    marginRight: Spacing.lg,
    overflow: 'hidden',
  },
  thumbImg: {
    width: '100%',
    height: '100%',
  },
  removeImg: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImagePlaceholder: {
    width: 160,
    height: 120,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(150,150,150,0.1)',
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.bold,
  },
  mainSaveBtn: {
    height: 64,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xxxl * 1.5,
  },
  mainSaveBtnText: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
  },
});
