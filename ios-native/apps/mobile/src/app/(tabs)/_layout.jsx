import { Tabs } from "expo-router";
import { Home, Search, Plus, MessageCircle, User } from "lucide-react-native";
import { View } from "react-native";

export default function TabLayout() {
  const colors = {
    background: "#FFFFFF",
    foreground: "#0A0A0A",
    border: "#E5E5E5",
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingTop: 4,
        },
        tabBarActiveTintColor: colors.foreground,
        tabBarInactiveTintColor: "#6B6B6B",
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <Home color={color} size={24} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: "Browse",
          tabBarIcon: ({ color }) => (
            <Search color={color} size={24} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: "Sell",
          tabBarIcon: ({ color }) => (
            <View
              style={{
                width: 52,
                height: 52,
                backgroundColor: colors.foreground,
                borderRadius: 26,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
              }}
            >
              <Plus color={colors.background} size={26} strokeWidth={2.5} />
            </View>
          ),
          tabBarLabel: "",
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color }) => (
            <MessageCircle color={color} size={24} strokeWidth={2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <User color={color} size={24} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
