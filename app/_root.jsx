import { PaperProvider, MD3LightTheme } from 'react-native-paper';

export default function RootLayout({ children }) {
  return (
    <PaperProvider theme={MD3LightTheme}>
      {children}
    </PaperProvider>
  );
} 