import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  LocateFixed,
  MapPin,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { v4 as uuidv4 } from 'uuid';

import { PriceBand, Restaurant, RestaurantCategory, RestaurantsStackParamList } from '../types';
import { addRestaurantToCollection, saveRestaurant } from '../storage/storage';
import { saveImageLocally } from '../storage/imageStorage';
import { geoFromAddress } from '../../services/geocode';
import { CATEGORY_LIST } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
import { PRICE_BANDS, priceBandBounds, priceBandForRestaurant } from '../domain/priceBands';

type Props = NativeStackScreenProps<RestaurantsStackParamList, 'AddRestaurant'>;

export default function AddRestaurantScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const editing = route.params?.restaurant;
  const initialCollectionId = route.params?.collectionId;
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(editing?.name || '');
  const [category, setCategory] = useState<RestaurantCategory>(editing?.category || 'restaurant');
  const [address, setAddress] = useState(editing?.address || '');
  const [coordinates, setCoordinates] = useState(editing?.location);
  const [priceBand, setPriceBand] = useState<PriceBand | null>(() => editing ? priceBandForRestaurant(editing) : null);
  const [description, setDescription] = useState(editing?.description || '');
  const [tagsText, setTagsText] = useState((editing?.tags || []).join(', '));
  const [images, setImages] = useState<string[]>(editing?.images || []);
  const [nameTouched, setNameTouched] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const locationLabel = useMemo(() => {
    if (coordinates && address) return 'Adresse et position enregistrées';
    if (coordinates) return 'Position enregistrée';
    if (address) return 'Adresse à localiser';
    return 'Ajoutez une adresse ou utilisez votre position';
  }, [coordinates, address]);

  const continueToDetails = async () => {
    setNameTouched(true);
    if (!name.trim()) return;
    if (address.trim() && !coordinates) {
      setLocationLoading(true);
      try {
        const result = await geoFromAddress(address.trim());
        if (result) setCoordinates({ latitude: result.lat, longitude: result.lng, address: address.trim() });
      } catch {
        // The address is still valid text; the restaurant simply won't appear on the map yet.
      } finally {
        setLocationLoading(false);
      }
    }
    setStep(2);
  };

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Position non autorisée', 'Autorisez RestoHub dans les réglages, ou saisissez une adresse.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coordinate = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCoordinates(coordinate);
      const reverse = await Location.reverseGeocodeAsync(coordinate);
      const place = reverse[0];
      if (place) {
        const value = [place.streetNumber, place.street, place.postalCode, place.city].filter(Boolean).join(' ');
        if (value) setAddress(value);
      }
    } catch {
      Alert.alert('Position indisponible', 'Saisissez l’adresse manuellement.');
    } finally {
      setLocationLoading(false);
    }
  };

  const addPhotos = async () => {
    if (images.length >= 5) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos non autorisées', 'Autorisez l’accès aux photos dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - images.length,
      quality: 0.82,
    });
    if (result.canceled) return;
    const saved = await Promise.all(result.assets.slice(0, 5 - images.length).map((asset) => saveImageLocally(asset.uri)));
    setImages((current) => [...current, ...saved].slice(0, 5));
  };

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const restaurant: Restaurant = {
        id: editing?.id || uuidv4(),
        name: name.trim(),
        category,
        address: address.trim() || undefined,
        location: coordinates ? { ...coordinates, address: address.trim() || coordinates.address } : undefined,
        priceBand: priceBand || undefined,
        priceMin: priceBand ? priceBandBounds(priceBand)?.min : undefined,
        priceMax: priceBand ? priceBandBounds(priceBand)?.max : undefined,
        description: description.trim() || undefined,
        tags: tagsText.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8),
        images,
        origin: editing?.origin || { kind: 'personal' },
        createdAt: editing?.createdAt || now,
        updatedAt: now,
      };
      const savedPlaceId = await saveRestaurant(restaurant);
      if (initialCollectionId) await addRestaurantToCollection(initialCollectionId, savedPlaceId);
      navigation.goBack();
    } catch {
      Alert.alert('Enregistrement impossible', 'Vérifiez les informations puis réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.screen, { backgroundColor: colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topBar, { paddingTop: insets.top, borderColor: colors.border }]}>
        <Pressable
          onPress={() => step === 2 ? setStep(1) : navigation.goBack()}
          accessibilityLabel={step === 2 ? 'Revenir à l’étape précédente' : 'Fermer'}
          style={styles.topAction}
        >
          <ArrowLeft size={23} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.topCopy}>
          <Text style={[styles.topTitle, { color: colors.textPrimary }]}>{editing ? 'Modifier l’adresse' : 'Ajouter une adresse'}</Text>
          <Text style={[styles.stepText, { color: colors.textMuted }]}>{step} sur 2 · {step === 1 ? 'Essentiel' : 'Détails facultatifs'}</Text>
        </View>
        <Pressable onPress={() => navigation.goBack()} accessibilityLabel="Annuler" style={styles.topAction}>
          <X size={22} color={colors.textPrimary} />
        </Pressable>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.progressValue, { width: step === 1 ? '50%' : '100%', backgroundColor: colors.accent }]} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 104 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 ? (
          <>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Les informations pour le retrouver</Text>
            <FieldLabel label="Nom" required />
            <TextInput
              autoFocus={!editing}
              value={name}
              onChangeText={setName}
              onBlur={() => setNameTouched(true)}
              placeholder="Ex. Mokonuts"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              accessibilityLabel="Nom du restaurant"
              style={[styles.input, Shadows.hard, { backgroundColor: colors.surface, borderColor: nameTouched && !name.trim() ? colors.danger : colors.textPrimary, color: colors.textPrimary }]}
            />
            {nameTouched && !name.trim() ? <Text style={[styles.error, { color: colors.danger }]}>Le nom est nécessaire pour continuer.</Text> : null}

            <FieldLabel label="Type" required />
            <View style={styles.categoryGrid}>
              {CATEGORY_LIST.map((item) => {
                const Icon = item.icon;
                const selected = category === item.value;
                return (
                  <Pressable
                    key={item.value}
                    onPress={() => setCategory(item.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.categoryOption,
                      { opacity: pressed ? 0.6 : 1 },
                    ]}
                  >
                    <View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFillObject,
                        styles.optionSurface,
                        Shadows.hard,
                        { backgroundColor: selected ? `${item.color}18` : colors.surface, borderColor: selected ? item.color : colors.textPrimary },
                      ]}
                    />
                    <Icon size={19} color={selected ? item.color : colors.textSecondary} />
                    <Text style={[styles.categoryText, { color: selected ? colors.textPrimary : colors.textSecondary }]} numberOfLines={1}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <FieldLabel label="Adresse ou position" />
            <View style={[styles.addressField, Shadows.hard, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
              <MapPin size={20} color={coordinates ? colors.accentGreen : colors.textMuted} />
              <TextInput
                value={address}
                onChangeText={(value) => { setAddress(value); setCoordinates(undefined); }}
                placeholder="12 rue… ou nom de la ville"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                accessibilityLabel="Adresse"
                style={[styles.addressInput, { color: colors.textPrimary }]}
              />
            </View>
            <View style={styles.locationStatus}>
              <Text style={[styles.helper, { color: coordinates ? colors.accentGreen : colors.textMuted }]}>{locationLabel}</Text>
              <Pressable
                onPress={useCurrentLocation}
                disabled={locationLoading}
                style={({ pressed }) => [styles.locationButton, { borderColor: colors.textPrimary, opacity: pressed ? 0.55 : 1 }]}
              >
                {locationLoading ? <ActivityIndicator size="small" color={colors.accent} /> : <LocateFixed size={17} color={colors.accent} />}
                <Text style={[styles.locationButtonText, { color: colors.textPrimary }]}>Ma position</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.heading, { color: colors.textPrimary }]}>Complétez seulement ce qui vous sert</Text>

            <FieldLabel label="Budget" />
            <View style={styles.priceRow}>
              {PRICE_BANDS.map((band) => {
                const selected = priceBand === band.id;
                return (
                  <Pressable
                    key={band.id}
                    onPress={() => setPriceBand(selected ? null : band.id)}
                    style={({ pressed }) => [styles.priceOption, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFillObject,
                        styles.optionSurface,
                        Shadows.hard,
                        { backgroundColor: selected ? `${colors.accent}18` : colors.surface, borderColor: selected ? colors.accent : colors.textPrimary },
                      ]}
                    />
                    <Text style={[styles.priceText, { color: selected ? colors.accent : colors.textSecondary }]}>{band.label}</Text>
                  </Pressable>
                );
              })}
            </View>

            <FieldLabel label="Photos" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {images.map((uri) => (
                <View key={uri}>
                  <Image source={{ uri }} style={styles.photo} />
                  <Pressable onPress={() => setImages((current) => current.filter((item) => item !== uri))} accessibilityLabel="Supprimer la photo" style={[styles.removePhoto, { backgroundColor: colors.surface }]}>
                    <X size={16} color={colors.textPrimary} />
                  </Pressable>
                </View>
              ))}
              {images.length < 5 ? (
                <Pressable onPress={addPhotos} style={({ pressed }) => [styles.addPhoto, { backgroundColor: colors.surface, borderColor: colors.textPrimary, opacity: pressed ? 0.6 : 1 }]}>
                  <Camera size={23} color={colors.accent} />
                  <Text style={[styles.addPhotoText, { color: colors.textSecondary }]}>Ajouter</Text>
                </Pressable>
              ) : null}
            </ScrollView>
            <Text style={[styles.helper, { color: colors.textMuted }]}>Sans photo, RestoHub crée une illustration avec le type et les initiales.</Text>

            <FieldLabel label="Description" />
            <TextInput value={description} onChangeText={setDescription} placeholder="Ambiance, service, ce qui vaut le détour…" placeholderTextColor={colors.textMuted} selectionColor={colors.accent} multiline style={[styles.input, styles.multiline, { backgroundColor: colors.surface, borderColor: colors.textPrimary, color: colors.textPrimary }]} />

            <FieldLabel label="Tags" />
            <TextInput value={tagsText} onChangeText={setTagsText} placeholder="terrasse, date, veggie" placeholderTextColor={colors.textMuted} selectionColor={colors.accent} autoCapitalize="none" style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.textPrimary, color: colors.textPrimary }]} />
            <Text style={[styles.helper, { color: colors.textMuted }]}>Séparez les tags par une virgule.</Text>
          </>
        )}
        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
          <Pressable
            onPress={step === 1 ? continueToDetails : submit}
            disabled={(step === 1 && !name.trim()) || saving || locationLoading}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: colors.accent, opacity: (step === 1 && !name.trim()) || saving || locationLoading ? 0.42 : pressed ? 0.72 : 1 },
            ]}
          >
            {saving || locationLoading ? <ActivityIndicator size="small" color={colors.textOnAccent} /> : step === 1 ? <ArrowRight size={19} color={colors.textOnAccent} /> : <Check size={19} color={colors.textOnAccent} />}
            <Text style={[styles.primaryButtonText, { color: colors.textOnAccent }]}>{step === 1 ? 'Continuer' : editing ? 'Enregistrer' : 'Ajouter le resto'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );

  function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
    return (
      <Text style={[styles.label, { color: colors.textPrimary }]}>
        {label}{required ? <Text style={{ color: colors.accent }}> *</Text> : null}
      </Text>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: { minHeight: 54, paddingHorizontal: Spacing.sm, paddingBottom: 6, flexDirection: 'row', alignItems: 'flex-end' },
  topAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topCopy: { flex: 1, alignItems: 'center', paddingBottom: 7 },
  topTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  stepText: { marginTop: 2, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  progressTrack: { height: 3 },
  progressValue: { height: 3 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xxl },
  heading: { marginBottom: Spacing.lg, fontFamily: FontFamily.semiBold, fontSize: FontSize.xl, lineHeight: 29, letterSpacing: -0.4 },
  label: { marginTop: Spacing.xl, marginBottom: Spacing.sm, fontFamily: FontFamily.medium, fontSize: FontSize.sm },
  input: { minHeight: 50, paddingHorizontal: Spacing.md, borderWidth: 1.5, borderRadius: 8, fontFamily: FontFamily.regular, fontSize: FontSize.md },
  multiline: { minHeight: 112, paddingTop: Spacing.md, textAlignVertical: 'top' },
  error: { marginTop: 6, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  helper: { fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  categoryOption: { position: 'relative', width: '31%', minHeight: 64, padding: Spacing.sm, alignItems: 'center', justifyContent: 'center', gap: 6 },
  optionSurface: { borderWidth: 1.5, borderRadius: 8 },
  categoryText: { maxWidth: '100%', fontFamily: FontFamily.medium, fontSize: 11 },
  addressField: { minHeight: 50, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1.5, borderRadius: 8 },
  addressInput: { flex: 1, minHeight: 48, fontFamily: FontFamily.regular, fontSize: FontSize.md },
  locationStatus: { minHeight: 48, marginTop: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  locationButton: { minHeight: 44, paddingHorizontal: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 8 },
  locationButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  priceRow: { flexDirection: 'row', gap: Spacing.sm },
  priceOption: { position: 'relative', flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
  priceText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  photoRow: { gap: Spacing.sm, paddingRight: Spacing.lg },
  photo: { width: 88, height: 88, borderRadius: BorderRadius.md },
  removePhoto: { position: 'absolute', top: 4, right: 4, width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
  addPhoto: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: BorderRadius.md },
  addPhotoText: { fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  bottomBar: { marginTop: Spacing.xxl, marginBottom: Spacing.lg, padding: Spacing.sm, borderWidth: 1.5, borderRadius: 12 },
  primaryButton: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: BorderRadius.md },
  primaryButtonText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
});
