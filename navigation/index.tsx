import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import MapScreen from '../screens/MapScreen';
import AddScreen from '../screens/AddScreen';
import ListScreen from '../screens/ListScreens';   // ← NEW

const Stack = createStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Map"
          component={MapScreen}
          options={{ title: 'Carte' }}
        />
        <Stack.Screen
          name="List"
          component={ListScreen}
          options={{ title: 'Mes restaurants' }}
        />
        <Stack.Screen
          name="Add"
          component={AddScreen}
          options={{ title: 'Ajouter un resto' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
