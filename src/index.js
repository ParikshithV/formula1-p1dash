import React, { useEffect, useMemo } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text } from "react-native";
import axios from "axios";
import ScheduleScreen from "./screens/scheduleScreen";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

const Tab = createBottomTabNavigator();

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Home Screen</Text>
    </View>
  );
}

function MyTabs() {
  useEffect(() => {
    axios
      .get("https://api.openf1.org/v1/sessions?year=2024")
      .then((res) => {
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const btmTabBArOpts = useMemo(() => {
    const screenOptions = {
      headerShown: false,
      tabBarStyle: {
        backgroundColor: "#000",
        borderTopWidth: 0,
        height: 75,
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
        }}
        name="Drivers"
        component={HomeScreen}
      />
      <Tab.Screen
        options={{
          tabBarIcon: ({ focused, color, size }) => (
            <FontAwesome name={"group"} color={color} size={size - 5} />
          ),
        }}
        name="Teams"
        component={HomeScreen}
      />
    </Tab.Navigator>
  );
}

export default MyTabs;
