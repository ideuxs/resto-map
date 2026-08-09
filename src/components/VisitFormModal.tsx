import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CalendarDays, Camera, ChevronDown, ChevronUp, LockKeyhole, NotebookPen, Star, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import type { Visit } from '../types';
import { saveVisit } from '../storage/storage';
import { saveImageLocally } from '../storage/imageStorage';
import { BorderRadius, FontFamily, FontSize, Spacing } from '../constants/theme';
import { useTheme } from '../theme/ThemeProvider';

type Props = {
  visible: boolean;
  placeId: string;
  visit?: Visit | null;
  onClose: () => void;
};

type ReturnChoice = boolean | null;

function formatDateInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function dateToInput(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getFullYear()),
  ].join('/');
}

function parseInputDate(value: string): Date | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day, 12);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return date <= endOfToday ? date : null;
}

export default function VisitFormModal({ visible, placeId, visit, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [dateText, setDateText] = useState('');
  const [dateValue, setDateValue] = useState(new Date());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [wouldReturn, setWouldReturn] = useState<ReturnChoice>(null);
  const [dishesText, setDishesText] = useState('');
  const [amountText, setAmountText] = useState('');
  const [companions, setCompanions] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateError, setDateError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const initialDate = new Date(visit?.visitedAt || new Date().toISOString());
    const safeDate = Number.isNaN(initialDate.getTime()) ? new Date() : initialDate;
    setDateValue(safeDate);
    setDateText(dateToInput(safeDate.toISOString()));
    setDatePickerOpen(false);
    setRating(visit?.rating || 0);
    setWouldReturn(visit?.wouldReturn ?? null);
    setDishesText((visit?.dishes || []).join(', '));
    setAmountText(visit?.amount != null ? String(visit.amount).replace('.', ',') : '');
    setCompanions(visit?.companions || '');
    setNotes(visit?.notes || '');
    setImageUris(visit?.imageUris || []);
    setDetailsOpen(Boolean(
      visit?.dishes.length ||
      visit?.amount != null ||
      visit?.companions ||
      visit?.notes ||
      visit?.imageUris.length
    ));
    setDateError('');
    setAmountError('');
    setDirty(false);
    setSaving(false);
  }, [visit, visible]);

  const addPhotos = async () => {
    if (imageUris.length >= 5) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos non autorisées', 'Autorisez l’accès aux photos pour les joindre à cette visite privée.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5 - imageUris.length,
      quality: 0.82,
    });
    if (result.canceled) return;
    const saved = await Promise.all(
      result.assets.slice(0, 5 - imageUris.length).map((asset) => saveImageLocally(asset.uri))
    );
    setImageUris((current) => [...current, ...saved].slice(0, 5));
    setDirty(true);
  };

  const requestClose = () => {
    if (saving) return;
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert('Abandonner les modifications ?', 'Les informations saisies ne seront pas enregistrées.', [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Abandonner', style: 'destructive', onPress: onClose },
    ]);
  };

  const submit = async () => {
    if (saving) return;
    const visitedAt = parseInputDate(dateText);
    const normalizedAmount = amountText.trim().replace(',', '.');
    const amount = normalizedAmount ? Number(normalizedAmount) : undefined;
    const invalidAmount = amount != null && (!Number.isFinite(amount) || amount < 0);

    setDateError(visitedAt ? '' : 'Saisissez une date valide, qui ne soit pas dans le futur.');
    setAmountError(invalidAmount ? 'Saisissez un montant positif.' : '');
    if (!visitedAt || invalidAmount) return;

    setSaving(true);
    const now = new Date().toISOString();
    try {
      await saveVisit({
        id: visit?.id || uuidv4(),
        placeId,
        visitedAt: visitedAt.toISOString(),
        rating: rating || undefined,
        wouldReturn: wouldReturn ?? undefined,
        dishes: dishesText.split(',').map((dish) => dish.trim()).filter(Boolean),
        amount,
        companions: companions.trim() || undefined,
        notes: notes.trim() || undefined,
        imageUris,
        createdAt: visit?.createdAt || now,
        updatedAt: now,
        dateIsEstimated: false,
      });
      setDirty(false);
      onClose();
    } catch {
      Alert.alert('Visite non enregistrée', 'Réessayez dans quelques instants.');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (nextDate?: Date) => {
    if (!nextDate) return;
    setDateValue(nextDate);
    setDateText(dateToInput(nextDate.toISOString()));
    setDateError('');
    setDirty(true);
    if (Platform.OS !== 'ios') setDatePickerOpen(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      presentationStyle="fullScreen"
      animationType="slide"
      statusBarTranslucent
      onRequestClose={requestClose}
    >
      <View style={[styles.modalRoot, { backgroundColor: colors.surface }]}>
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              borderColor: colors.textPrimary,
              paddingTop: insets.top,
              paddingBottom: insets.bottom,
            },
          ]}
        >
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {visit ? 'Modifier la visite' : 'Noter une visite'}
              </Text>
              <View style={styles.privateLine}>
                <LockKeyhole size={14} color={colors.textMuted} />
                <Text style={[styles.privateText, { color: colors.textMuted }]}>Privé sur cet appareil</Text>
              </View>
            </View>
            <Pressable
              onPress={requestClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={8}
              style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}
            >
              <X size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={[styles.formScroll, { backgroundColor: colors.surface }]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            alwaysBounceVertical={false}
            contentInsetAdjustmentBehavior="never"
            automaticallyAdjustContentInsets={false}
            automaticallyAdjustKeyboardInsets
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.formContent, { backgroundColor: colors.surface }]}
          >
            <View style={[styles.essentialPanel, { backgroundColor: colors.surfaceLight, borderColor: colors.textPrimary }]}>
              <View style={styles.essentialHeader}>
                <View style={[styles.essentialIcon, { backgroundColor: colors.surface, borderColor: colors.textPrimary }]}>
                  <NotebookPen size={20} color={colors.accent} />
                </View>
                <View style={styles.essentialHeaderCopy}>
                  <Text style={[styles.essentialTitle, { color: colors.textPrimary }]}>L’essentiel</Text>
                  <Text style={[styles.essentialSubtitle, { color: colors.textMuted }]}>Trois informations pour garder un souvenir utile.</Text>
                </View>
              </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Date</Text>
            {Platform.OS === 'ios' ? (
              <View style={[styles.datePickerShell, { backgroundColor: colors.surface, borderColor: dateError ? colors.danger : colors.textPrimary }]}>
                <CalendarDays size={19} color={colors.accent} />
                <View style={styles.datePickerSpacer} />
                <DateTimePicker
                  value={dateValue}
                  mode="date"
                  display="compact"
                  maximumDate={new Date()}
                  accentColor={colors.accent}
                  onChange={(_, nextDate) => handleDateChange(nextDate)}
                  accessibilityLabel="Date de la visite"
                />
              </View>
            ) : (
              <>
                <Pressable
                  onPress={() => setDatePickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Date de la visite"
                  style={({ pressed }) => [styles.dateButton, { backgroundColor: colors.surface, borderColor: dateError ? colors.danger : colors.textPrimary, opacity: pressed ? 0.7 : 1 }]}
                >
                  <CalendarDays size={19} color={colors.accent} />
                  <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>{dateText || 'JJ/MM/AAAA'}</Text>
                </Pressable>
                {datePickerOpen ? (
                  <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={(_, nextDate) => handleDateChange(nextDate)}
                  />
                ) : null}
              </>
            )}
            {dateError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{dateError}</Text> : null}

            <Text style={[styles.label, { color: colors.textPrimary }]}>Note</Text>
            <View style={styles.ratingRow} accessibilityLabel="Note sur cinq">
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = value <= rating;
                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setRating(rating === value ? 0 : value);
                      setDirty(true);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: rating === value }}
                    accessibilityLabel={`${value} étoile${value > 1 ? 's' : ''}`}
                    style={({ pressed }) => [styles.starButton, { opacity: pressed ? 0.5 : 1 }]}
                  >
                    <Star size={27} color={colors.accentYellow} fill={selected ? colors.accentYellow : 'transparent'} />
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: colors.textPrimary }]}>Envie d’y retourner ?</Text>
            <View style={styles.returnRow} accessibilityLabel="Envie d’y retourner">
              {([
                { label: 'Oui', value: true },
                { label: 'Non', value: false },
                { label: 'Pas décidé', value: null },
              ] as const).map((option) => {
                const selected = wouldReturn === option.value;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => {
                      setWouldReturn(option.value);
                      setDirty(true);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => [
                      styles.returnOption,
                      {
                        backgroundColor: selected ? `${colors.accent}18` : colors.surface,
                        borderColor: selected ? colors.accent : colors.textPrimary,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.returnOptionText, { color: selected ? colors.accent : colors.textSecondary }]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            </View>

            <Pressable
              onPress={() => setDetailsOpen((current) => !current)}
              accessibilityRole="button"
              accessibilityState={{ expanded: detailsOpen }}
              style={({ pressed }) => [styles.detailsToggle, { backgroundColor: colors.surface, borderColor: colors.textPrimary, opacity: pressed ? 0.6 : 1 }]}
            >
              <View style={styles.detailsToggleCopy}>
                <Text style={[styles.detailsTitle, { color: colors.textPrimary }]}>Ajouter des détails</Text>
                <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.detailsHint, { color: colors.textMuted }]}>Plats, dépense, accompagnants et notes</Text>
              </View>
              {detailsOpen ? <ChevronUp size={20} color={colors.textSecondary} /> : <ChevronDown size={20} color={colors.textSecondary} />}
            </Pressable>

            {detailsOpen ? (
              <View style={styles.details}>
                <Text style={[styles.label, styles.firstDetailLabel, { color: colors.textPrimary }]}>Plats à retenir</Text>
                <TextInput
                  value={dishesText}
                  onChangeText={(value) => { setDishesText(value); setDirty(true); }}
                  placeholder="Ex. cookie miso, raviolis"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  accessibilityLabel="Plats à retenir"
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.textPrimary, color: colors.textPrimary }]}
                />
                <Text style={[styles.helper, { color: colors.textMuted }]}>Séparez les plats par une virgule.</Text>

                <Text style={[styles.label, { color: colors.textPrimary }]}>Dépense</Text>
                <TextInput
                  value={amountText}
                  onChangeText={(value) => {
                    setAmountText(value);
                    setAmountError('');
                    setDirty(true);
                  }}
                  placeholder="0,00 €"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  keyboardType="decimal-pad"
                  accessibilityLabel="Montant dépensé en euros"
                  style={[
                    styles.input,
                    { backgroundColor: colors.surface, borderColor: amountError ? colors.danger : colors.textPrimary, color: colors.textPrimary },
                  ]}
                />
                {amountError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{amountError}</Text> : null}

                <Text style={[styles.label, { color: colors.textPrimary }]}>Accompagnants</Text>
                <TextInput
                  value={companions}
                  onChangeText={(value) => { setCompanions(value); setDirty(true); }}
                  placeholder="Avec qui ?"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  accessibilityLabel="Accompagnants"
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.textPrimary, color: colors.textPrimary }]}
                />

                <Text style={[styles.label, { color: colors.textPrimary }]}>Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={(value) => { setNotes(value); setDirty(true); }}
                  placeholder="Ambiance, service, ce que vous voulez retenir…"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.accent}
                  multiline
                  textAlignVertical="top"
                  accessibilityLabel="Notes personnelles"
                  style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.textPrimary, color: colors.textPrimary }]}
                />

                <View style={styles.photoLabelRow}>
                  <Text style={[styles.label, { color: colors.textPrimary }]}>Photos privées</Text>
                  <Text style={[styles.photoCount, { color: colors.textMuted }]}>{imageUris.length}/5</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                  {imageUris.map((uri) => (
                    <View key={uri} style={styles.photoWrap}>
                      <Image source={{ uri }} style={styles.photo} />
                      <Pressable
                        onPress={() => { setImageUris((current) => current.filter((item) => item !== uri)); setDirty(true); }}
                        accessibilityLabel="Retirer cette photo"
                        style={[styles.removePhoto, { backgroundColor: colors.surface, borderColor: colors.textPrimary, borderWidth: 1.5 }]}
                      >
                        <X size={15} color={colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                  {imageUris.length < 5 ? (
                    <Pressable
                      onPress={addPhotos}
                      accessibilityLabel="Ajouter des photos privées"
                        style={[styles.addPhoto, { borderColor: colors.textPrimary, backgroundColor: colors.surface }]}
                    >
                      <Camera size={21} color={colors.accent} />
                      <Text style={[styles.addPhotoText, { color: colors.accent }]}>Ajouter</Text>
                    </Pressable>
                  ) : null}
                </ScrollView>
              </View>
            ) : null}
            <View style={[styles.footer, { backgroundColor: colors.surface }]}>
              <Pressable
                onPress={submit}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{ disabled: saving, busy: saving }}
                style={({ pressed }) => [
                  styles.saveButton,
                  { backgroundColor: colors.accentPink, borderColor: colors.textPrimary, opacity: saving ? 0.42 : pressed ? 0.72 : 1 },
                ]}
              >
                <Text style={[styles.saveText, { color: colors.textOnAccent }]}>
                  {saving ? 'Enregistrement…' : visit ? 'Enregistrer' : 'Ajouter au journal'}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.bottomSafeAreaFill,
            { height: insets.bottom + 2, backgroundColor: colors.surface },
          ]}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  bottomSafeAreaFill: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
  },
  sheet: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1.5,
  },
  formScroll: { flex: 1 },
  header: {
    minHeight: 76,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerCopy: { flex: 1 },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xl, lineHeight: 29 },
  privateLine: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  privateText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  formContent: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  essentialPanel: {
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderRadius: 12,
  },
  essentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  essentialIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
  },
  essentialHeaderCopy: { flex: 1, minWidth: 0 },
  essentialTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  essentialSubtitle: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  label: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderRadius: 8,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
  },
  datePickerShell: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  datePickerSpacer: { flex: 1 },
  dateButton: {
    minHeight: 52,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1.5,
    borderRadius: 8,
  },
  dateButtonText: { fontFamily: FontFamily.regular, fontSize: FontSize.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  returnRow: { flexDirection: 'row', gap: Spacing.sm },
  returnOption: {
    minHeight: 48,
    flex: 1,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderRadius: 8,
  },
  returnOptionText: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, textAlign: 'center' },
  detailsToggle: {
    minHeight: 64,
    marginTop: Spacing.xxl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1.5,
    borderRadius: 10,
  },
  detailsToggleCopy: { flex: 1, minWidth: 0 },
  detailsTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  detailsHint: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  details: { paddingBottom: Spacing.sm },
  firstDetailLabel: { marginTop: Spacing.xl },
  notesInput: { minHeight: 112, paddingTop: Spacing.md },
  photoLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  photoCount: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  photoRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  photoWrap: { width: 84, height: 84 },
  photo: { width: 84, height: 84, borderRadius: BorderRadius.md },
  removePhoto: { position: 'absolute', top: -5, right: -5, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addPhoto: { width: 84, height: 84, borderWidth: 1.5, borderRadius: 8, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  helper: { marginTop: 6, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  error: { marginTop: 6, fontFamily: FontFamily.medium, fontSize: FontSize.xs, lineHeight: 18 },
  footer: { marginTop: 'auto', paddingTop: Spacing.xxl, paddingBottom: Spacing.sm },
  saveButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1.5,
  },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
});
