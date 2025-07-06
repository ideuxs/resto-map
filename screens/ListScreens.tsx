import { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, View, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { fetchRestaurants, deleteRestaurant } from '../services/db';
import { Restaurant } from '../types/restaurants';
import RestaurantCard from '../components/RestaurantCard';          // ← chemin ajusté

export default function ListScreen() {
  const [data, setData] = useState<Restaurant[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchRestaurants().then(setData);
    }, [])
  );

  const askDelete = (id: string) => {
    Alert.alert('Supprimer ce restaurant ?', 'Cette action est définitive.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteRestaurant(id);
          setData(prev => prev.filter(r => r.id !== id));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(uri, index) => `${uri}-${index}`}
        renderItem={({ item }) => (
          <RestaurantCard item={item} onDelete={askDelete} />
        )}
        style={styles.list}
        contentContainerStyle={data.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={<Text style={styles.emptyText}>Aucun restaurant pour l’instant</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1E1E1E' },
  list: { flex: 1 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: 'white', fontSize: 16 },
});
