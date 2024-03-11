import React, { useMemo } from "react";
import { Text, View } from "react-native";
import { Image } from "expo-image";
import styles from "./ScheduleScreen.styles";
import moment from "moment";

const SectionCard = ({ data }) => {
  const { location, trackImg, events } = data?.item;

  const formatDate = (date: string) => {
    const retDate = moment(date).format("ddd, MMM Do");
    return retDate;
  };

  const eventLen = events?.length || 0;

  const isSprintWeekend = useMemo(() => {
    for (const event of events) {
      if (event.summary.toLowerCase().includes("sprint")) {
        return true;
      }
    }
    return false;
  }, []);

  return (
    <View style={styles.sectionCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sessionHeaderText}>{location}</Text>
        <Text style={styles.sessionGpText}>
          {`${formatDate(events?.[0]?.startDate)}  -  ${formatDate(
            events?.[eventLen - 1]?.startDate
          )}`}
        </Text>
        {isSprintWeekend ? (
          <Text style={styles.sprintWeekendText}>Sprint Weekend</Text>
        ) : null}
      </View>
      {trackImg ? (
        <Image
          style={styles.sectionCardTrack}
          source={trackImg}
          //   placeholder={blurhash}
          contentFit="contain"
          transition={1000}
        />
      ) : null}
    </View>
  );
};

export default SectionCard;
