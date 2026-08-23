import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { CreditsProvider } from "../context/CreditsContext";
import { ClaimsProvider } from "../context/ClaimsContext";
import { ListingsProvider } from "../context/ListingsContext";
import { MessagesProvider } from "../context/MessagesContext";
import { TasksProvider } from "../context/TasksContext";
import { AffiliationsProvider } from "../context/AffiliationsContext";
import { colors } from "../constants/theme";

function RootLayoutNav() {
  const { session, profile, loading, profileLoading } = useAuth();

  if (loading || (session && profileLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accentDark} />
      </View>
    );
  }

  const isOrg = profile?.account_type === "Company" || profile?.account_type === "Institution";
  const isIndividual = !isOrg;

  return (
    <CreditsProvider>
      <ClaimsProvider>
        <ListingsProvider>
          <MessagesProvider>
            <TasksProvider>
              <AffiliationsProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Protected guard={!!session && isIndividual}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="new-claim" options={{ presentation: "modal" }} />
                    <Stack.Screen name="submit-task" options={{ presentation: "modal" }} />
                    <Stack.Screen name="link-organization" options={{ presentation: "modal" }} />
                    <Stack.Screen name="new-listing" options={{ presentation: "modal" }} />
                    <Stack.Screen name="apply-listing" options={{ presentation: "modal" }} />
                    <Stack.Screen name="startup/[id]" />
                  </Stack.Protected>
                  <Stack.Protected guard={!!session && isOrg}>
                    <Stack.Screen name="(org)" />
                    <Stack.Screen name="new-task" options={{ presentation: "modal" }} />
                    <Stack.Screen name="new-listing" options={{ presentation: "modal" }} />
                  </Stack.Protected>
                  <Stack.Protected guard={!session}>
                    <Stack.Screen name="(auth)" />
                  </Stack.Protected>
                  <Stack.Protected guard={!!session}>
                    <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
                    <Stack.Screen name="candidate/[id]" />
                    <Stack.Screen name="conversation" />
                  </Stack.Protected>
                  <Stack.Screen name="verify/[token]" />
                </Stack>
              </AffiliationsProvider>
            </TasksProvider>
          </MessagesProvider>
        </ListingsProvider>
      </ClaimsProvider>
    </CreditsProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
});
