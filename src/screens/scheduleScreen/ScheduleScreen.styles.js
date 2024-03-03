import React from "react";
import { StatusBar, StyleSheet } from "react-native";
import { fontWeight } from "../../utils/strings";

const styles = StyleSheet.create({
  headerText: {
    fontFamily: fontWeight[600],
    fontSize: 28,
    color: "#fff",
    textAlign: "right",
    marginTop: 35,
    marginBottom: 16,
  },
  sessionHeaderText: {
    fontFamily: fontWeight[400],
    fontSize: 21,
    color: "#fff",
  },
  sessionGpText: {
    fontFamily: fontWeight[400],
    fontSize: 14,
    color: "#969696",
    marginVertical: 12,
  },
  sprintWeekendText: {
    fontFamily: fontWeight[300],
    fontSize: 12,
    color: "#696969",
  },
  sectionCard: {
    width: "100%",
    marginVertical: 21,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: "#969696",
    borderBottomRightRadius: 21,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sectionCardTrack: {
    height: 85,
    width: 85,
    marginRight: 16,
    marginBottom: 8,
  },
});

export default styles;
