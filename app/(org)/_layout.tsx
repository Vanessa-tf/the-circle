import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TabBarButton from "../../components/TabBarButton";
import { CandidatesProvider } from "../../context/CandidatesContext";
import { colors } from "../../constants/theme";

const ITEM_HEIGHT = 56;
const TOP_PADDING = 12;

export default function OrgTabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
    <CandidatesProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopWidth: 0,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            height: ITEM_HEIGHT + TOP_PADDING + bottomInset,
            paddingTop: TOP_PADDING,
            paddingBottom: bottomInset,
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: -4 },
            elevation: 8,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Dashboard",
            tabBarButton: (props) => <TabBarButton {...props} iconName="grid" label="Dashboard" />,
          }}
        />
        <Tabs.Screen
          name="tasks"
          options={{
            title: "Tasks",
            tabBarButton: (props) => (
              <TabBarButton {...props} iconName="clipboard" label="Tasks" />
            ),
          }}
        />
        <Tabs.Screen
          name="candidates"
          options={{
            title: "Candidates",
            tabBarButton: (props) => (
              <TabBarButton {...props} iconName="search" label="Candidates" />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarButton: (props) => <TabBarButton {...props} iconName="user" label="Profile" />,
          }}
        />
        <Tabs.Screen name="task/[id]" options={{ href: null }} />
      </Tabs>
    </CandidatesProvider>
  );
}
