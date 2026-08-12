import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TabBarButton from "../../components/TabBarButton";
import { colors } from "../../constants/theme";

const ITEM_HEIGHT = 56;
const TOP_PADDING = 12;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, 12);

  return (
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
          title: "Home",
          tabBarButton: (props) => <TabBarButton {...props} iconName="home" label="Home" />,
        }}
      />
      <Tabs.Screen
        name="credits"
        options={{
          title: "Credits",
          tabBarButton: (props) => <TabBarButton {...props} iconName="star" label="Credits" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarButton: (props) => (
            <TabBarButton {...props} iconName="compass" label="Explore" />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarButton: (props) => (
            <TabBarButton {...props} iconName="message-circle" label="Messages" />
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
    </Tabs>
  );
}
