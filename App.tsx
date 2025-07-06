// App.tsx
import { useEffect } from 'react';
import RootNavigator from './navigation';
import { init } from './services/db';

export default function App() {
  useEffect(() => { init(); }, []);
  return <RootNavigator />;
}
