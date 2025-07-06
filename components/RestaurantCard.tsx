// ─── RestaurantCard.tsx ───────────────────────────────────────────
import { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet } from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';
import { fetchImages } from '../services/db';
import { Restaurant } from '../types/restaurants';

export default function RestaurantCard({
  item,
  onDelete,
}: {
  item: Restaurant;
  onDelete: (id: string) => void;
}) {
  /*  ICI les Hooks sont légaux  */
  const [pics, setPics] = useState<string[]>([]);

  useEffect(() => {
    fetchImages(item.id).then(setPics);
  }, [item.id]);

  return (
    <Card style={styles.card}>
      {pics.length > 0 && (
        <FlatList
          data={pics}
          horizontal
          keyExtractor={u => u}
          renderItem={({ item }) => (
            <Image source={{ uri: item }} style={styles.cover} />
          )}
          showsHorizontalScrollIndicator={false}
        />
      )}

      <Card.Title
        title={item.name}
        right={() => <IconButton icon="delete" onPress={() => onDelete(item.id)} />}
      />
      <Card.Content>
        <Text>Lat : {item.lat.toFixed(6)}</Text>
        <Text>Lng : {item.lng.toFixed(6)}</Text>
        {item.notes && <Text>Notes : {item.notes}</Text>}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 8, marginVertical: 4 },
  cover: { width: 200, height: 120, marginRight: 8, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
});
