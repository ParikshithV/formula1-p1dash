import moment from "moment";
import React from "react";
import { Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import styles from "./ScheduleScreen.styles";

const WeekendDetails = ({ data }) => {
  //   console.log("WeekendDetails data:", data);

  //   const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatInMoment = (dateTime: string, noDay: boolean) => {
    const formatStr = noDay ? "h:mma" : "ddd, Do h:mma";
    const retVal = moment(dateTime).format(formatStr);
    return retVal;
  };

  const DetailsView = ({ dayData }) => {
    const indexOfHyp = dayData.summary.indexOf(" - ") + 3;
    return (
      <Animated.View style={styles.DetailsViewRow}>
        <Text style={styles.dayDetailsHeader}>
          {formatInMoment(dayData.startDate, false)} to{" "}
          {formatInMoment(dayData.endDate, true)}
        </Text>
        <Text style={styles.dayDetailsSubHeader}>
          {dayData.summary.slice(0, 3)} {dayData.summary.slice(indexOfHyp)}
        </Text>
      </Animated.View>
    );
  };

  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp}>
      {data.map((day: any) => {
        return <DetailsView dayData={day} />;
      })}
    </Animated.View>
  );
};

export default WeekendDetails;
