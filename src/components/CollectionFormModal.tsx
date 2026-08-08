import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Folder,
  Star,
  Heart,
  Flame,
  Pizza,
  Utensils,
  MapPin,
  Coffee,
  Beer,
  Cake,
  Gem,
  Target,
  Globe,
  Camera,
  Music
} from 'lucide-react-native';
import { Collection } from '../types';
import { useTheme } from '../theme/ThemeProvider';
import { Spacing, BorderRadius, FontSize, FontFamily, Shadows } from '../constants/theme';

// Map icon names to Lucide components for the picker
const ICONS = [
  { name: 'Folder', component: Folder },
  { name: 'Star', component: Star },
  { name: 'Heart', component: Heart },
  { name: 'Flame', component: Flame },
  { name: 'Pizza', component: Pizza },
  { name: 'Utensils', component: Utensils },
  { name: 'MapPin', component: MapPin },
  { name: 'Coffee', component: Coffee },
  { name: 'Beer', component: Beer },
  { name: 'Cake', component: Cake },
  { name: 'Gem', component: Gem },
  { name: 'Target', component: Target },
  { name: 'Globe', component: Globe },
  { name: 'Camera', component: Camera },
  { name: 'Music', component: Music },
];

interface Props {
  visible: boolean;
  collection?: Collection | null;
  onClose: () => void;
  onSave: (data: { name: string; emoji: string; description: string }) => void;
}

export default function CollectionFormModal({ visible, collection, onClose, onSave }: Props) {
  const { colors, isDark } = useTheme();
  
  const [name, setName] = useState('');
  const [iconName, setIconName] = useState('Folder');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (collection) {
      setName(collection.name);
      setIconName(collection.emoji || 'Folder');
      setDescription(collection.description || '');
    } else {
      setName('');
      setIconName('Folder');
      setDescription('');
    }
  }, [collection, visible]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), emoji: iconName, description: description.trim() });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Glassmorphic Background Overlay */}
        <BlurView intensity={isDark ? 30 : 60} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFillObject}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </BlurView>

        <View style={[styles.sheet, { backgroundColor: colors.surface, borderTopColor: colors.borderLight }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {collection ? 'Modifier la collection' : 'Nouvelle collection'}
          </Text>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Nom</Text>
          <TextInput
            style={[
              styles.input,
              { 
                backgroundColor: colors.surfaceLight, 
                color: colors.textPrimary,
                borderColor: colors.border
              }
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Ex: Mes restos préférés..."
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
          />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Icône</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
            {ICONS.map((item) => {
              const IconComp = item.component;
              const isActive = iconName === item.name;
              return (
                <TouchableOpacity
                  key={item.name}
                  style={[
                    styles.emojiBtn,
                    { 
                      backgroundColor: isActive ? colors.primary + '15' : colors.surfaceLight,
                      borderColor: isActive ? colors.primary : 'transparent'
                    },
                    isActive && Shadows.glow(colors.primary)
                  ]}
                  onPress={() => setIconName(item.name)}
                >
                  <IconComp 
                    size={28} 
                    color={isActive ? colors.primary : colors.textMuted} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Description (optionnel)</Text>
          <TextInput
            style={[
              styles.input,
              styles.multiline,
              { 
                backgroundColor: colors.surfaceLight, 
                color: colors.textPrimary,
                borderColor: colors.border
              }
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Une petite description..."
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            multiline
            numberOfLines={3}
          />

          <View style={styles.buttons}>
            <TouchableOpacity 
              style={[styles.cancelBtn, { backgroundColor: colors.surfaceLight }]} 
              onPress={onClose}
            >
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                { backgroundColor: colors.primary },
                Shadows.glow(colors.primary),
                !name.trim() && styles.saveBtnDisabled
              ]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={[styles.saveText, { color: colors.textOnPrimary }]}>
                {collection ? 'Enregistrer' : 'Créer la collection'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: BorderRadius.xxl * 1.5,
    borderTopRightRadius: BorderRadius.xxl * 1.5,
    padding: Spacing.xxl,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xxxl * 2 : Spacing.xxxl + 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Shadows.lg,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xxl,
    fontFamily: FontFamily.bold,
    marginBottom: Spacing.xl,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    fontSize: FontSize.lg,
    fontFamily: FontFamily.medium,
    borderWidth: 1,
  },
  multiline: {
    height: 120,
    textAlignVertical: 'top',
  },
  emojiRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  emojiBtn: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
    borderWidth: 2,
  },
  buttons: {
    flexDirection: 'row',
    marginTop: Spacing.xxxl,
    gap: Spacing.md,
  },
  cancelBtn: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.semiBold,
  },
  saveBtn: {
    flex: 2,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  saveText: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
  },
});
