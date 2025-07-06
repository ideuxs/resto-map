import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import { useRef, useState, useCallback } from 'react';
import { View,Text } from 'react-native';
import { fetchRestaurants } from '../services/db';
import { Restaurant } from '../types/restaurants';
import { FAB } from 'react-native-paper';

export default function MapScreen({ navigation }: {navigation : any}) {
  const [data, setData] = useState<Restaurant[]>([]);
  const mapRef = useRef<MapView>(null);

  // Charger BDD à chaque fois qu’on revient sur l’écran
  useFocusEffect(
    useCallback(() => {
      fetchRestaurants().then(rs => {
        setData(rs);
        console.log(rs);
        // Si on a au moins un resto → on adapte le viewport
        if (rs.length && mapRef.current) {
          mapRef.current.fitToCoordinates(
            rs.map(r => ({ latitude: r.lat, longitude: r.lng })),
            { edgePadding: { top: 80, right: 80, bottom: 80, left: 80 }, animated: true }
          );
        }
      });
    }, [])
  );

  return (
    <>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        showsUserLocation
        initialRegion={{
          latitude: 48.853495,
          longitude: 2.340419,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {data.map(r => (
          <Marker
            key={r.id}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            title={r.name}
            description={r.address ??r.notes }
          />
        ))}
      </MapView>
      {!data.length && (
        <View style={{
          position: 'absolute', top: 80, alignSelf: 'center',
          backgroundColor: 'white', padding: 20, borderRadius: 8, shadowOpacity: .4
        }}>
          <Text>Aucun restaurant. Appuie sur + pour commencer.</Text>
        </View>
      )}

      <FAB
        icon="format-list-bulleted"
        style={{ position: 'absolute', bottom: 30, left: 20 }}
        onPress={() => navigation.navigate('List')}
      />
      {/* Bouton + */}
      <FAB icon="plus" style={{ position: 'absolute', bottom: 30, right: 20 }}
           onPress={() => navigation.navigate('Add')} />
    </>
  );
}
