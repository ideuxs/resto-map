import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
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
import { Image } from 'expo-image';
import { X } from './FlaticonIcon';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Collection } from '../types';
import { COLLECTION_ICONS } from '../constants/collectionIcons';
import { useTheme } from '../theme/ThemeProvider';
import { BorderRadius, FontFamily, FontSize, Shadows, Spacing } from '../constants/theme';
import { saveImageLocally } from '../storage/imageStorage';

type Props = {
  visible: boolean;
  collection?: Collection | null;
  onClose: () => void;
  onSave: (data: { name: string; emoji: string; description: string; imageUri?: string }) => void | Promise<void>;
};

export default function CollectionFormModal({ visible, collection, onClose, onSave }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Bookmark');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>();
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const formScrollRef = useRef<ScrollView>(null);
  const descriptionInputRef = useRef<TextInput>(null);
  const formViewportHeightRef = useRef(0);
  const descriptionLayoutRef = useRef({ y: 0, height: 0 });

  const revealDescription = useCallback(() => {
    requestAnimationFrame(() => {
      const { y, height } = descriptionLayoutRef.current;
      const viewportHeight = formViewportHeightRef.current;
      if (!viewportHeight || !height) return;

      formScrollRef.current?.scrollTo({
        y: Math.max(0, y + height - viewportHeight + Spacing.md),
        animated: true,
      });
    });
  }, []);

  useEffect(() => {
    setName(collection?.name || '');
    setIconName(collection?.emoji || 'Bookmark');
    setDescription(collection?.description || '');
    setImageUri(collection?.imageUri);
    setNameTouched(false);
  }, [collection, visible]);

  useEffect(() => {
    if (!visible) {
      setKeyboardVisible(false);
      return undefined;
    }

    const keyboardShowSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const keyboardHideSubscription = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    const revealSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (descriptionInputRef.current?.isFocused()) revealDescription();
    });

    return () => {
      keyboardShowSubscription.remove();
      keyboardHideSubscription.remove();
      revealSubscription.remove();
    };
  }, [revealDescription, visible]);

  const chooseCover = async () => {
    Keyboard.dismiss();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos non autorisées', 'Autorisez l’accès aux photos pour choisir une couverture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.82 });
    if (result.canceled || !result.assets[0]?.uri) return;
    setImageUri(await saveImageLocally(result.assets[0].uri));
  };

  const submit = async () => {
    setNameTouched(true);
    if (!name.trim() || saving) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      await onSave({ name: name.trim(), emoji: iconName, description: description.trim(), imageUri });
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
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.screen, { backgroundColor: colors.surface }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {collection ? 'Modifier la liste' : 'Nouvelle liste'}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
              hitSlop={8}
              style={({ pressed }) => [styles.close, { opacity: pressed ? 0.55 : 1 }]}
            >
              <X size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            ref={formScrollRef}
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            onLayout={(event) => {
              formViewportHeightRef.current = event.nativeEvent.layout.height;
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.label, { color: colors.textPrimary }]}>Image de couverture <Text style={{ color: colors.textMuted }}>(facultatif)</Text></Text>
            <Pressable
              onPress={chooseCover}
              accessibilityRole="button"
              accessibilityLabel={imageUri ? 'Modifier l’image de couverture' : 'Ajouter une image de couverture'}
              style={({ pressed }) => [styles.coverPicker, Shadows.hard, { backgroundColor: colors.surfaceLight, borderColor: colors.textPrimary, opacity: pressed ? 0.72 : 1 }]}
            >
              {imageUri ? <Image source={{ uri: imageUri }} style={styles.coverPreview} contentFit="cover" /> : null}
              <View style={styles.coverCopy}>
                <Text style={[styles.coverTitle, { color: colors.textPrimary }]}>{imageUri ? 'Modifier la couverture' : 'Ajouter une couverture'}</Text>
                <Text style={[styles.coverDetail, { color: colors.textMuted }]}>Une image pour reconnaître la liste en un coup d’œil.</Text>
              </View>
            </Pressable>
            {imageUri ? (
              <Pressable onPress={() => setImageUri(undefined)} accessibilityRole="button" accessibilityLabel="Retirer l’image de couverture" style={styles.removeCover}>
                <Text style={[styles.removeCoverText, { color: colors.danger }]}>Retirer l’image</Text>
              </Pressable>
            ) : null}

            <Text style={[styles.label, { color: colors.textPrimary }]}>Nom</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={() => setNameTouched(true)}
              onSubmitEditing={Keyboard.dismiss}
              returnKeyType="done"
              blurOnSubmit
              placeholder="Ex. Dîners à deux"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              accessibilityLabel="Nom de la liste"
              style={[
                styles.input,
                Shadows.hard,
                { color: colors.textPrimary, backgroundColor: colors.background, borderColor: nameTouched && !name.trim() ? colors.danger : colors.textPrimary },
              ]}
            />
            {nameTouched && !name.trim() ? (
              <Text style={[styles.error, { color: colors.danger }]}>Saisissez un nom pour créer la liste.</Text>
            ) : null}

            <Text style={[styles.label, { color: colors.textPrimary }]}>Icône</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.iconList}>
              {COLLECTION_ICONS.map(({ name: value, label, icon: Icon }) => {
                const selected = iconName === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => { Keyboard.dismiss(); setIconName(value); }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={label}
                    style={({ pressed }) => [
                      styles.iconButton,
                      {
                        backgroundColor: selected ? `${colors.accent}18` : colors.background,
                        borderColor: selected ? colors.accent : colors.textPrimary,
                        opacity: pressed ? 0.6 : 1,
                      },
                    ]}
                  >
                    <Icon size={23} color={selected ? colors.accent : colors.textSecondary} strokeWidth={2} />
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.descriptionLabelRow}>
              <Text style={[styles.label, styles.descriptionLabel, { color: colors.textPrimary }]}>Description <Text style={{ color: colors.textMuted }}>(facultatif)</Text></Text>
              <Pressable
                onPress={Keyboard.dismiss}
                accessibilityRole="button"
                accessibilityLabel="Fermer le clavier de la description"
                style={({ pressed }) => [styles.descriptionDone, { opacity: pressed ? 0.55 : 1 }]}
              >
                <Text style={[styles.descriptionDoneText, { color: colors.accent }]}>Terminé</Text>
              </Pressable>
            </View>
            <TextInput
              ref={descriptionInputRef}
              value={description}
              onChangeText={setDescription}
              onFocus={revealDescription}
              onLayout={(event) => {
                descriptionLayoutRef.current = event.nativeEvent.layout;
              }}
              placeholder="Ce qui relie ces adresses"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              multiline
              numberOfLines={3}
              accessibilityLabel="Description de la liste"
              style={[styles.input, styles.multiline, Shadows.hard, { color: colors.textPrimary, backgroundColor: colors.background, borderColor: colors.textPrimary }]}
            />
          </ScrollView>

          {!keyboardVisible ? (
            <View style={[styles.footer, { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.md }]}>
              <Pressable
                onPress={submit}
                disabled={!name.trim() || saving}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.save,
                  Shadows.hard,
                  { backgroundColor: colors.accentPink, borderColor: colors.textPrimary, opacity: !name.trim() || saving ? 0.42 : pressed ? 0.72 : 1 },
                ]}
              >
                <Text style={[styles.saveText, { color: colors.textOnAccent }]}>
                  {saving ? 'Enregistrement…' : collection ? 'Enregistrer' : 'Créer la liste'}
                </Text>
              </Pressable>
            </View>
          ) : null}
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
  screen: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bottomSafeAreaFill: { position: 'absolute', right: 0, bottom: 0, left: 0, zIndex: 20 },
  sheet: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'hidden',
  },
  header: {
    minHeight: 44,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xl },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  formScroll: { flex: 1 },
  formContent: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxl },
  label: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
  },
  descriptionLabelRow: { marginTop: Spacing.lg, marginBottom: Spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  descriptionLabel: { flex: 1, marginTop: 0, marginBottom: 0 },
  descriptionDone: { minWidth: 76, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  descriptionDoneText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  input: {
    minHeight: 48,
    paddingHorizontal: Spacing.md,
    borderWidth: 1.5,
    borderRadius: 8,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
  },
  coverPicker: { minHeight: 76, padding: Spacing.sm, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, borderWidth: 1.5, borderRadius: 10 },
  coverPreview: { width: 62, height: 62, borderRadius: BorderRadius.md },
  coverCopy: { flex: 1 },
  coverTitle: { fontFamily: FontFamily.semiBold, fontSize: FontSize.sm },
  coverDetail: { marginTop: 3, fontFamily: FontFamily.regular, fontSize: FontSize.xs, lineHeight: 17 },
  removeCover: { alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center', paddingHorizontal: Spacing.xs },
  removeCoverText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.xs },
  multiline: { minHeight: 88, paddingTop: Spacing.md, textAlignVertical: 'top' },
  error: { marginTop: 6, fontFamily: FontFamily.medium, fontSize: FontSize.xs },
  iconList: { gap: Spacing.sm, paddingVertical: 2, paddingRight: Spacing.xl },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: { paddingTop: Spacing.md, paddingHorizontal: Spacing.xl },
  save: { minHeight: 52, borderRadius: 8, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontFamily: FontFamily.semiBold, fontSize: FontSize.md },
});
