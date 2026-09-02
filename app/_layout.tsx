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
  const { session, profile, loading, profileLoading, isPasswordRecovery } = useAuth();

  if (loading || (session && profileLoading && !isPasswordRecovery)) {
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
                  <Stack.Protected guard={isPasswordRecovery}>
                    <Stack.Screen name="reset-password" />
                  </Stack.Protected>
                  <Stack.Protected guard={!!session && isIndividual && !isPasswordRecovery}>
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen name="new-claim" options={{ presentation: "modal" }} />
                    <Stack.Screen name="submit-task" options={{ presentation: "modal" }} />
                    <Stack.Screen name="link-organization" options={{ presentation: "modal" }} />
                    <Stack.Screen name="new-listing" options={{ presentation: "modal" }} />
                  </Stack.Protected>
                  <Stack.Protected guard={!!session && isOrg && !isPasswordRecovery}>
                    <Stack.Screen name="(org)" />
                    <Stack.Screen name="new-task" options={{ presentation: "modal" }} />
                    <Stack.Screen name="new-listing" options={{ presentation: "modal" }} />
                  </Stack.Protected>
                  <Stack.Protected guard={!session && !isPasswordRecovery}>
                    <Stack.Screen name="(auth)" />
                  </Stack.Protected>
                  <Stack.Protected guard={!!session && !isPasswordRecovery}>
                    <Stack.Screen name="edit-profile" options={{ presentation: "modal" }} />
                    <Stack.Screen name="candidate/[id]" />
                    <Stack.Screen name="conversation" />
                    <Stack.Screen name="search" />
                    <Stack.Screen name="org/[id]" />
                    <Stack.Screen name="directory/[id]" />
                    <Stack.Screen name="startup/[id]" />
                    <Stack.Screen name="apply-listing" options={{ presentation: "modal" }} />
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
