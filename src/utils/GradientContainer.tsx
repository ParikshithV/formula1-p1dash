import React, { PropsWithChildren } from "react";
import { StatusBar, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export const topGap = StatusBar.currentHeight + 25;

const GradientContainer = ({ children }) => {
  return (
    <View style={styles.parentBgView}>
      <LinearGradient
        colors={["#e10600", "transparent"]}
        style={styles.linearGradient}
      />
      {children}
    </View>
  );
};

interface stylesheetProp {}

const styles = StyleSheet.create({
  linearGradient: {
    width: "100%",
    height: topGap,
    ...(StyleSheet.absoluteFill as object),
  },
  parentBgView: {
    backgroundColor: "#000",
    flex: 1,
    paddingTop: topGap,
  },
});

export default GradientContainer;
