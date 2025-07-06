import { useState } from 'react';
import {
  View,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem   from 'expo-file-system';
import * as Crypto from 'expo-crypto';

import { geoFromAddress }  from '../services/geocode';
import { insertRestaurant, insertImage } from '../services/db';   // ← NEW

export default function AddScreen({ navigation }: { navigation: any }) {
  const [name,    setName]    = useState('');
  const [address, setAddress] = useState('');
  const [notes,   setNotes]   = useState('');
  const [images,  setImages]  = useState<string[]>([]);
  const [saving,  setSaving]  = useState(false);

  /* ====================  Sélection de photos  ==================== */
  const pickImages = async () => {
    // permission iOS / Android
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'J’ai besoin d’accéder à ta galerie.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,          // new enum (plus de warning)
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (res.canceled) return;

    const base = FileSystem.documentDirectory ?? FileSystem.cacheDirectory!;
    const copied: string[] = [];

    for (const a of res.assets) {
      const filename = a.uri.split('/').pop()!;
      const dest     = base + filename;
      await FileSystem.copyAsync({ from: a.uri, to: dest });
      copied.push(dest);
    }
    setImages(prev => [...prev, ...copied]);
  };

  /* ====================  Enregistrement  ==================== */
  const save = async () => {
    if (!name.trim() || !address.trim()) {
      Alert.alert('Nom et adresse requis');
      return;
    }

    setSaving(true);
    try {
      const coords = await geoFromAddress(address.trim());
      if (!coords) {
        Alert.alert('Adresse introuvable', 'Ajoute le numéro ou le code-postal.');
        return;
      }

      const idd = Crypto.randomUUID();
      const restoId = await insertRestaurant({
        id:idd,
        name: name.trim(),
        address: address.trim(),
        notes: notes.trim(),
        ...coords,
      });
    
      await Promise.all(images.map(uri => insertImage(restoId, uri)));
    
    
      await Promise.all(images.map(uri => insertImage(restoId, uri))); // ③ on réutilise
    

      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ====================  UI  ==================== */
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#1E1E1E' }}>
      <SafeAreaView >
        <View style={styles.container}>
          <Text style={styles.title}>Ajouter un resto</Text>

          <TextInput
            placeholder="Nom"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />

          <TextInput
            placeholder="Adresse complète"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
          />

          <TextInput
            placeholder="Notes (optionnel)"
            value={notes}
            onChangeText={setNotes}
            multiline
            style={[styles.input, { height: 80 }]}
          />

          {/* bouton pour sélectionner les photos */}
          <TouchableOpacity style={styles.photoBtn} onPress={pickImages}>
            <Text style={{ fontWeight: '600' }}>
              {images.length ? '+ Ajouter' : 'Ajouter des photos'}
            </Text>
          </TouchableOpacity>

          {/* grille d’aperçu */}
          <FlatList
            data={images}
            keyExtractor={uri => uri}
            numColumns={3}
            renderItem={({ item }) => <Image source={{ uri: item }} style={styles.thumb} />}
            style={{ marginTop: 12 }}
          />

          {saving ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <TouchableOpacity
              onPress={save}
              style={[
                styles.saveBtn,
                !(name.trim() && address.trim()) && { opacity: 0.5 },
              ]}
              disabled={!(name.trim() && address.trim())}
            >
              <Text style={{ fontWeight: '600' }}>Enregistrer</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </ScrollView>
  );
}

/* ──────────────── STYLES ──────────────── */
const styles = StyleSheet.create({
  container: { padding: 20, paddingTop: 140 },
  title: {
    fontSize: 32,
    marginBottom: 24,
    color: '#fff',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  input: {
    height: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 15,
    marginBottom: 16,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  photoBtn: {
    marginTop: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderRadius: 25,
    alignItems: 'center',
    width: '60%',
    alignSelf: 'center',
  },
  thumb: {
    width: '30%',
    aspectRatio: 1,
    margin: '1.6%',
    borderRadius: 6,
  },
  saveBtn: {
    marginTop: 24,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
    width: '60%',
    alignSelf: 'center',
  },
});
