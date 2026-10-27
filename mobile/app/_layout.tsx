// app/_layout.tsx — Root layout with fonts and navigation
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { Colors } from '../constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="verify/index"
          options={{ title: 'Verify Text', headerBackTitle: 'Home' }}
        />
        <Stack.Screen
          name="verify/analysis"
          options={{ title: 'Analyzing...', headerBackVisible: false }}
        />
        <Stack.Screen
          name="verify/results"
          options={{ title: 'Results' }}
        />
        <Stack.Screen
          name="verify/claim-detail"
          options={{ title: 'Claim Detail' }}
        />
        <Stack.Screen
          name="screenshot"
          options={{ title: 'Scan Screenshot' }}
        />
        <Stack.Screen
          name="history/index"
          options={{ title: 'History' }}
        />
        <Stack.Screen
          name="history/[id]"
          options={{ title: 'Verification Detail' }}
        />
        <Stack.Screen
          name="privacy"
          options={{ title: 'Privacy & Data' }}
        />
        <Stack.Screen
          name="portal/auth"
          options={{ title: 'Portal Login & Registration', headerShown: false }}
        />
        <Stack.Screen
          name="portal/trader/index"
          options={{ title: 'Trader Dashboard', headerShown: false }}
        />
        <Stack.Screen
          name="portal/trader/register-instrument"
          options={{ title: 'Register Instrument', headerShown: false }}
        />
        <Stack.Screen
          name="portal/trader/apply-verification"
          options={{ title: 'Apply for Verification', headerShown: false }}
        />
        <Stack.Screen
          name="portal/trader/applications"
          options={{ title: 'Application Tracking', headerShown: false }}
        />
        <Stack.Screen
          name="portal/admin/index"
          options={{ title: 'Admin & Inspector Portal', headerShown: false }}
        />
        <Stack.Screen
          name="portal/verify-certificate"
          options={{ title: 'Certificate Verification', headerShown: false }}
        />
        <Stack.Screen
          name="portal/ai-assistant"
          options={{ title: 'Legal Metrology AI Assistant', headerShown: false }}
        />
      </Stack>
    </View>
  );
}
