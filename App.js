// In App.js in a new project

import * as React from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MyTabs from "./src";
import { axiosInterceptor } from "./src/services/axiosInterceptor";
import { StatusBar } from "expo-status-bar";

const Stack = createNativeStackNavigator();

axiosInterceptor();

function App() {
  return (
    <View style={{ flex: 1 }}>
      <StatusBar translucent StatusBarStyle={"dark"} />
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="HomeStack" component={MyTabs} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

export default App;
