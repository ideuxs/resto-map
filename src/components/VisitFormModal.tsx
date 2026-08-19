import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CalendarDays, Camera, ChevronDown, ChevronUp, LockKeyhole, NotebookPen, Star, X } from './FlaticonIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import type { Visit } from '../types';
import { saveVisit } from '../storage/storage';
import { saveImageLocally } from '../storage/imageStorage';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
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
  const { colors, isDark } = useTheme();
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
      visit?.amount != null
      || (visit?.dishes && visit.dishes.length > 0)
      || visit?.companions
      || visit?.notes
      || (visit?.imageUris && visit.imageUris.length > 0),
    ));
    setDateError('');
    setAmountError('');
    setDirty(false);
    setSaving(false);
  }, [visit, visible]);

  const onDateChange = (_: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') setDatePickerOpen(false);
    if (!selectedDate) return;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    if (selectedDate > endOfToday) {
      setDateError('La date de visite ne peut pas être dans le futur.');
      return;
    }
    setDateError('');
    setDateValue(selectedDate);
    setDateText(dateToInput(selectedDate.toISOString()));
    setDirty(true);
  };

  const handleDateTextInput = (value: string) => {
    const formatted = formatDateInput(value);
    setDateText(formatted);
    setDirty(true);
    if (formatted.length === 10) {
      const parsed = parseInputDate(formatted);
      if (!parsed) {
        setDateError('Date invalide ou située dans le futur (format JJ/MM/AAAA).');
      } else {
        setDateError('');
        setDateValue(parsed);
      }
    } else {
      setDateError('');
    }
  };

  const addPhotos = async () => {
    Keyboard.dismiss();
    const remaining = 5 - imageUris.length;
    if (remaining <= 0) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos non autorisées', 'Autorisez l’accès aux photos dans les réglages pour ajouter des souvenirs de visite.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.82,
    });
    if (result.canceled || !result.assets.length) return;
    const nextSavedUris = await Promise.all(
      result.assets.slice(0, remaining).map((asset) => saveImageLocally(asset.uri)),
    );
    setImageUris((current) => [...current, ...nextSavedUris].slice(0, 5));
    setDirty(true);
  };

  const requestClose = () => {
    Keyboard.dismiss();
    if (!dirty) {
      onClose();
      return;
    }
    Alert.alert('Abandonner la visite ?', 'Les informations saisies ne seront pas enregistrées.', [
      { text: 'Continuer la saisie', style: 'cancel' },
      { text: 'Abandonner', style: 'destructive', onPress: onClose },
    ]);
  };

  const submit = async () => {
    Keyboard.dismiss();
    let hasError = false;
    let finalDate = dateValue;

    if (dateText.length === 10) {
      const parsed = parseInputDate(dateText);
      if (!parsed) {
        setDateError('Date invalide ou située dans le futur (JJ/MM/AAAA).');
        hasError = true;
      } else {
        finalDate = parsed;
        setDateError('');
      }
    } else if (dateText.length > 0) {
      setDateError('Saisissez une date complète au format JJ/MM/AAAA.');
      hasError = true;
    }

    let parsedAmount: number | undefined;
    if (amountText.trim()) {
      const normalized = Number(amountText.replace(',', '.').trim());
      if (Number.isNaN(normalized) || normalized < 0) {
        setAmountError('Saisissez un montant valide en euros (ex. 24,50).');
        hasError = true;
      } else {
        parsedAmount = Math.round(normalized * 100) / 100;
        setAmountError('');
      }
    }

    if (hasError) return;

    setSaving(true);
    try {
      const dishes = dishesText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

      const nextVisit: Visit = {
        id: visit?.id || uuidv4(),
        placeId,
        visitedAt: finalDate.toISOString(),
        rating: rating || undefined,
        wouldReturn: wouldReturn === null ? undefined : wouldReturn,
        dishes,
        amount: parsedAmount,
        companions: companions.trim() || undefined,
        notes: notes.trim() || undefined,
        imageUris,
        createdAt: visit?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveVisit(nextVisit);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      onClose();
    } catch {
      Alert.alert('Erreur', 'Impossible d’enregistrer cette visite. Réessayez.');
    } finally {
      setSaving(false);
    }
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
      <KeyboardAvoidingView
        style={[styles.modalRoot, { backgroundColor: colors.surface }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                {visit ? 'Modifier la visite' : 'Nouvelle visite'}
              </Text>
              <View style={styles.privateLine}>
                <LockKeyhole size={13} color={colors.lavender} />
                <Text style={[styles.privateText, { color: colors.textMuted }]}>
                  Journal privé · non partagé
                </Text>
              </View>
            </View>
            <Pressable
              onPress={requestClose}
              accessibilityLabel="Fermer"
              hitSlop={8}
              style={({ pressed }) => [styles.closeButton, { opacity: pressed ? 0.55 : 1 }]}
            >
              <X size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.essentialPanel, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.border }]}>
              <View style={styles.essentialHeader}>
                <View style={[styles.essentialIcon, { backgroundColor: isDark ? colors.surfaceAubergine : `${colors.primary}15`, borderColor: colors.border }]}>
                  <NotebookPen size={20} color={colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.essentialHeaderCopy}>
                  <Text style={[styles.essentialTitle, { color: colors.textPrimary }]}>L’essentiel</Text>
                  <Text style={[styles.essentialSubtitle, { color: colors.textMuted }]}>
                    Date et avis pour retrouver ce moment.
                  </Text>
                </View>
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Date du passage</Text>
              {Platform.OS === 'ios' ? (
                <View style={[styles.datePickerShell, { backgroundColor: colors.surface, borderColor: dateError ? colors.danger : colors.border }]}>
                  <CalendarDays size={18} color={colors.textMuted} />
                  <View style={styles.datePickerSpacer} />
                  <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display="default"
                    maximumDate={new Date()}
                    onChange={onDateChange}
                    textColor={colors.textPrimary}
                    themeVariant={isDark ? 'dark' : 'light'}
                    accentColor={colors.primary}
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => setDatePickerOpen(true)}
                    style={[styles.dateButton, { backgroundColor: colors.surface, borderColor: dateError ? colors.danger : colors.border }]}
                  >
                    <CalendarDays size={18} color={colors.textMuted} />
                    <Text style={[styles.dateButtonText, { color: colors.textPrimary }]}>
                      {dateText || 'Sélectionner la date'}
                    </Text>
                  </Pressable>
                  {datePickerOpen ? (
                    <DateTimePicker
                      value={dateValue}
                      mode="date"
                      display="default"
                      maximumDate={new Date()}
                      onChange={onDateChange}
                    />
                  ) : null}
                </>
              )}
              {dateError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{dateError}</Text> : null}

              <Text style={[styles.label, { color: colors.textPrimary }]}>Note du moment</Text>
              <View style={styles.ratingRow}>
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = star <= rating;
                  return (
                    <Pressable
                      key={star}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => undefined);
                        setRating(star === rating ? 0 : star);
                        setDirty(true);
                      }}
                      accessibilityLabel={`${star} étoile${star > 1 ? 's' : ''}`}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.starButton,
                        { transform: [{ scale: pressed ? 1.22 : 1 }] },
                      ]}
                    >
                      <Star
                        size={32}
                        color={active ? colors.accentYellow : (isDark ? '#E6E6E6' : '#111111')}
                        fill={active ? colors.accentYellow : 'transparent'}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: colors.textPrimary }]}>Envie d’y retourner ?</Text>
              <View style={styles.returnRow}>
                {[
                  { label: 'Oui', value: true },
                  { label: 'Mitigé', value: null },
                  { label: 'Non', value: false },
                ].map((option) => {
                  const selected = wouldReturn === option.value;
                  return (
                    <Pressable
                      key={option.label}
                      onPress={() => {
                        Haptics.selectionAsync().catch(() => undefined);
                        setWouldReturn(option.value as ReturnChoice);
                        setDirty(true);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.returnOption,
                        {
                          backgroundColor: selected ? (isDark ? colors.surfaceAubergine : `${colors.primary}18`) : colors.surface,
                          borderColor: selected ? colors.primary : colors.border,
                          transform: [{ scale: pressed ? 0.95 : 1 }],
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.returnOptionText, { color: selected ? colors.primary : colors.textPrimary }]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Optional details dropdown card */}
            <View style={[styles.detailsCard, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.border }]}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => undefined);
                  setDetailsOpen(!detailsOpen);
                }}
                accessibilityRole="button"
                accessibilityLabel={detailsOpen ? 'Masquer les détails facultatifs' : 'Afficher les détails facultatifs'}
                style={({ pressed }) => [
                  styles.detailsToggle,
                  {
                    transform: [{ scale: pressed ? 0.985 : 1 }],
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.detailsToggleCopy}>
                  <Text style={[styles.detailsTitle, { color: colors.textPrimary }]}>
                    Détails facultatifs
                  </Text>
                  <Text style={[styles.detailsHint, { color: colors.textMuted }]}>
                    Plats, budget, accompagnants, notes et photos.
                  </Text>
                </View>
                {detailsOpen ? <ChevronUp size={20} color={colors.textMuted} /> : <ChevronDown size={20} color={colors.textMuted} />}
              </Pressable>

              {detailsOpen ? (
                <View style={[styles.detailsInner, { borderTopColor: colors.border }]}>
                  <Text style={[styles.label, styles.firstDetailLabel, { color: colors.textPrimary }]}>Plats testés</Text>
                  <TextInput
                    value={dishesText}
                    onChangeText={(value) => { setDishesText(value); setDirty(true); }}
                    onSubmitEditing={Keyboard.dismiss}
                    returnKeyType="done"
                    blurOnSubmit
                    placeholder="Ex. Risotto truffe, Tiramisu…"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                    accessibilityLabel="Plats testés"
                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  />
                  <Text style={[styles.fieldNotice, { color: colors.textMuted }]}>
                    Séparez les différents plats par des virgules.
                  </Text>

                  <Text style={[styles.label, { color: colors.textPrimary }]}>Montant dépensé</Text>
                  <TextInput
                    value={amountText}
                    onChangeText={(value) => { setAmountText(value); setDirty(true); }}
                    onSubmitEditing={Keyboard.dismiss}
                    returnKeyType="done"
                    blurOnSubmit
                    placeholder="0,00 €"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Montant dépensé en euros"
                    style={[
                      styles.input,
                      { backgroundColor: colors.surface, borderColor: amountError ? colors.danger : colors.border, color: colors.textPrimary },
                    ]}
                  />
                  {amountError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.danger }]}>{amountError}</Text> : null}

                  <Text style={[styles.label, { color: colors.textPrimary }]}>Accompagnants</Text>
                  <TextInput
                    value={companions}
                    onChangeText={(value) => { setCompanions(value); setDirty(true); }}
                    onSubmitEditing={Keyboard.dismiss}
                    returnKeyType="done"
                    blurOnSubmit
                    placeholder="Ex. Camille, Thomas…"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                    accessibilityLabel="Accompagnants"
                    style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                  />
                  <Text style={[styles.fieldNotice, { color: colors.textMuted }]}>
                    Séparez les prénoms par des virgules.
                  </Text>

                  <Text style={[styles.label, { color: colors.textPrimary }]}>Notes</Text>
                  <TextInput
                    value={notes}
                    onChangeText={(value) => { setNotes(value); setDirty(true); }}
                    onSubmitEditing={Keyboard.dismiss}
                    blurOnSubmit
                    placeholder="Ambiance, service, ce que vous voulez retenir…"
                    placeholderTextColor={colors.textMuted}
                    selectionColor={colors.accent}
                    multiline
                    textAlignVertical="top"
                    accessibilityLabel="Notes personnelles"
                    style={[styles.input, styles.notesInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
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
                          style={[styles.removePhoto, Shadows.card, { backgroundColor: colors.surface }]}
                        >
                          <X size={14} color={colors.danger} />
                        </Pressable>
                      </View>
                    ))}
                    {imageUris.length < 5 ? (
                      <Pressable
                        onPress={addPhotos}
                        accessibilityLabel="Ajouter des photos privées"
                        style={[styles.addPhoto, { borderColor: colors.border, backgroundColor: colors.surface }]}
                      >
                        <Camera size={20} color={colors.primary} />
                        <Text style={[styles.addPhotoText, { color: colors.primary }]}>Ajouter</Text>
                      </Pressable>
                    ) : null}
                  </ScrollView>
                </View>
              ) : null}
            </View>

            <View style={[styles.footer, { backgroundColor: colors.surface }]}>
              <Pressable
                onPress={submit}
                disabled={saving}
                accessibilityRole="button"
                accessibilityState={{ disabled: saving, busy: saving }}
                style={({ pressed }) => [
                  styles.saveButton,
                  Shadows.card,
                  {
                    backgroundColor: colors.primary,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                    opacity: saving ? 0.42 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.saveText, { color: colors.textOnPrimary }]}>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
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
  },
  formScroll: { flex: 1 },
  header: {
    minHeight: 64,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  headerCopy: { flex: 1 },
  title: { fontFamily: FontFamily.bold, fontSize: FontSize.xl, lineHeight: 28, letterSpacing: -0.3 },
  privateLine: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  privateText: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  formContent: { flexGrow: 1, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  essentialPanel: {
    marginTop: Spacing.sm,
    padding: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
  essentialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  essentialIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  essentialHeaderCopy: { flex: 1, minWidth: 0 },
  essentialTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  essentialSubtitle: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  label: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
  },
  datePickerShell: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  datePickerSpacer: { flex: 1 },
  dateButton: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  dateButtonText: { fontFamily: FontFamily.regular, fontSize: FontSize.md },
  ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.sm },
  starButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  returnRow: { flexDirection: 'row', gap: Spacing.sm },
  returnOption: {
    minHeight: 44,
    flex: 1,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  returnOptionText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm, textAlign: 'center' },
  detailsCard: {
    marginTop: Spacing.xl,
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  detailsToggle: {
    minHeight: 58,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailsToggleCopy: { flex: 1, minWidth: 0 },
  detailsTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
  detailsHint: { marginTop: 2, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  detailsInner: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
  },
  firstDetailLabel: { marginTop: Spacing.md },
  fieldNotice: {
    marginTop: 5,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
  notesInput: { minHeight: 100, paddingTop: Spacing.md },
  photoLabelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  photoCount: { fontFamily: FontFamily.regular, fontSize: FontSize.xs },
  photoRow: { gap: Spacing.sm, paddingBottom: Spacing.sm },
  photoWrap: { width: 80, height: 80 },
  photo: { width: 80, height: 80, borderRadius: BorderRadius.md },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhoto: { width: 80, height: 80, borderWidth: 1, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  helper: { marginTop: 6, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 18 },
  error: { marginTop: 6, fontFamily: FontFamily.medium, fontSize: FontSize.xs, lineHeight: 18 },
  footer: { marginTop: 'auto', paddingTop: Spacing.xl, paddingBottom: Spacing.sm },
  saveButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.button,
  },
  saveText: { fontFamily: FontFamily.bold, fontSize: FontSize.md, letterSpacing: 0.1 },
});
