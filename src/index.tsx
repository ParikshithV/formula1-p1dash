import React, { useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import ScheduleScreen from "./screens/scheduleScreen";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { fontWeight } from "./utils/strings";
import GradientContainer from "./utils/GradientContainer";

const Tab = createBottomTabNavigator();

function PlaceholderScreen() {
  return <GradientContainer children={null} />;
}

function MyTabs() {
  const btmTabBArOpts = useMemo(() => {
    const screenOptions = {
      headerShown: false,
      tabBarStyle: {
        backgroundColor: "#000",
        borderTopWidth: 0,
        height: 65,
        paddingBottom: 15,
      },
      tabBarActiveTintColor: "#e10600",
    };

    return screenOptions;
  }, []);

  return (
    <Tab.Navigator screenOptions={btmTabBArOpts}>
      <Tab.Screen
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome5 name={"calendar-alt"} color={color} size={size - 2} />
          ),
          tabBarLabelStyle: { fontFamily: fontWeight[200] },
        }}
        name="GP Schedule"
        component={ScheduleScreen}
      />
      <Tab.Screen
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <MaterialCommunityIcons
              name={"racing-helmet"}
              color={color}
              size={size + 5}
            />
          ),
          tabBarLabelStyle: { fontFamily: fontWeight[200] },
        }}
        name="Drivers"
        component={PlaceholderScreen}
      />
      <Tab.Screen
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome name={"group"} color={color} size={size - 5} />
          ),
          tabBarLabelStyle: { fontFamily: fontWeight[200] },
        }}
        name="Teams"
        component={PlaceholderScreen}
      />
    </Tab.Navigator>
  );
}

export default MyTabs;
