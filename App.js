// In App.js in a new project

import * as React from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MyTabs from "./src";
import { axiosInterceptor } from "./src/services/axiosInterceptor";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import GradientContainer from "./src/utils/GradientContainer";

const Stack = createNativeStackNavigator();

axiosInterceptor();

const customFonts = {
  "TitilliumWeb-Black": require("./src/assets/fonts/TitilliumWeb-Black.ttf"),
  "TitilliumWeb-Bold": require("./src/assets/fonts/TitilliumWeb-Bold.ttf"),
  "TitilliumWeb-Light": require("./src/assets/fonts/TitilliumWeb-Light.ttf"),
  "TitilliumWeb-ExtraLight": require("./src/assets/fonts/TitilliumWeb-ExtraLight.ttf"),
  "TitilliumWeb-Regular": require("./src/assets/fonts/TitilliumWeb-Regular.ttf"),
  "TitilliumWeb-SemiBold": require("./src/assets/fonts/TitilliumWeb-SemiBold.ttf"),
};

function App() {
  const [isFontsLoaded] = useFonts(customFonts);

  if (!isFontsLoaded) {
    return <GradientContainer />;
  }
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
