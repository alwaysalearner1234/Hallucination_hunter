// app/(tabs)/verify.tsx — Verify tab (redirects to verify index)
import { Redirect } from 'expo-router';
export default function VerifyTab() {
  return <Redirect href="/verify/index" />;
}
