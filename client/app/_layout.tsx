import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
      <Stack.Screen name="auth/register" options={{ title: 'Register' }} />
      <Stack.Screen name="(buyer)" options={{ headerShown: false }} />
      <Stack.Screen name="(shopkeeper)" options={{ headerShown: false }} />
    </Stack>
  );
}
