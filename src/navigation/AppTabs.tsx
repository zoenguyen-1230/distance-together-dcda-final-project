import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { AppTabParamList } from "../types";
import { HomeScreen } from "../screens/app/HomeScreen";
import { ConnectionsScreen } from "../screens/app/ConnectionsScreen";
import { ChatScreen } from "../screens/app/ChatScreen";
import { SharedScreen } from "../screens/app/SharedScreen";
import { PlansScreen } from "../screens/app/PlansScreen";
import { TripsScreen } from "../screens/app/TripsScreen";
import { palette } from "../theme/palette";
import { typography } from "../theme/typography";
import { useAuth } from "../providers/AuthProvider";

const Tab = createBottomTabNavigator<AppTabParamList>();

const tabIcons: Record<keyof AppTabParamList, keyof typeof Feather.glyphMap> = {
  Home: "home",
  People: "users",
  Chat: "message-circle",
  Shared: "book-open",
  Plans: "heart",
  Trips: "map-pin",
};

function TabIcon({
  routeName,
  focused,
  color,
}: {
  routeName: keyof AppTabParamList;
  focused: boolean;
  color: string;
}) {
  return (
    <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
      <Feather
        name={tabIcons[routeName]}
        size={18}
        color={color}
        strokeWidth={2}
      />
    </View>
  );
}

export function AppTabs() {
  const { signOut } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: palette.background,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: palette.text,
          fontSize: 22,
          fontWeight: "800",
          fontFamily: typography.displayFamily,
          letterSpacing: -0.4,
        },
        headerTintColor: palette.text,
        tabBarStyle: {
          backgroundColor: palette.card,
          borderTopWidth: 0,
          borderColor: palette.line,
          height: 78,
          paddingTop: 10,
          paddingBottom: 12,
          paddingHorizontal: 8,
        },
        tabBarItemStyle: {
          gap: 4,
        },
        tabBarActiveTintColor: palette.berry,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: {
          fontSize: 13,
          fontFamily: typography.sansFamilyMedium,
          fontWeight: "700",
          letterSpacing: 0.3,
        },
        tabBarIcon: ({ focused, color }) => (
          <TabIcon routeName={route.name} focused={focused} color={color} />
        ),
        sceneStyle: {
          backgroundColor: palette.background,
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => {
              void signOut();
            }}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.card,
            }}
          >
            <Text
              style={{
                color: palette.text,
                fontWeight: "700",
                fontFamily: typography.sansFamilyMedium,
              }}
            >
              Sign out
            </Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="People" component={ConnectionsScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Shared" component={SharedScreen} />
      <Tab.Screen
        name="Plans"
        component={PlansScreen}
        options={{ title: "Connect", tabBarLabel: "Connect" }}
      />
      <Tab.Screen name="Trips" component={TripsScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabIconWrapActive: {
    backgroundColor: "#FFF1E7",
    borderColor: "#F4E6DF",
  },
});
