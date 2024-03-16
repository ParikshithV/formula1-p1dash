import React from "react";
import { StatusBar, StyleSheet } from "react-native";
import { fontWeight } from "../../utils/strings";

const styles = StyleSheet.create({
  headerText: {
    fontFamily: fontWeight[600],
    fontSize: 28,
    color: "#fff",
    textAlign: "right",
  },
  headerTextView: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 35,
    marginBottom: 16,
  },
  sessionHeaderText: {
    fontFamily: fontWeight[400],
    fontSize: 18,
    color: "#fff",
    marginBottom: 12,
  },
  sessionGpText: {
    fontFamily: fontWeight[400],
    fontSize: 14,
    color: "#969696",
    marginBottom: 12,
  },
  timezoneText: {
    fontFamily: fontWeight[400],
    fontSize: 14,
    color: "#969696",
    marginTop: 2,
    textAlign: "right",
  },
  sprintWeekendText: {
    fontFamily: fontWeight[300],
    fontSize: 12,
    color: "#ff3b38",
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
    marginLeft: 8,
    marginBottom: 8,
  },
  absoluteLoaderView: {
    alignItems: "center",
    justifyContent: "center",
    ...StyleSheet.absoluteFill,
  },
  historyBtn: {
    height: 35,
    width: 35,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  dayDetailsHeader: {
    fontFamily: fontWeight[600],
    fontSize: 14,
    color: "#696969",
    marginTop: 12,
  },
  dayDetailsSubHeader: {
    fontFamily: fontWeight[600],
    fontSize: 16,
    color: "#ededed",
    marginTop: 2,
  },
  DetailsViewRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#fff",
    marginBottom: 16,
  },
});

export default styles;
