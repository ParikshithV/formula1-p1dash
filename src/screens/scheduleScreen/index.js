import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import styles from "./ScheduleScreen.styles";
import GradientContainer, { topGap } from "../../utils/GradientContainer";
import { fontWeight } from "../../utils/strings";
import axios from "axios";
import icsToJson from "ics-to-json";
import { trackImgs } from "../../utils/f1Imgs";
import { groupEventsByLocation } from "../../utils/groupEventsByLocation";
import SectionCard from "./SectionCard";
import moment from "moment";

const icsLink =
  "https://ics.ecal.com/ecal-sub/65e47a3c06cfae0008e8b27b/Formula%201.ics";

const ScheduleScreen = () => {
  const [scheduleData, setScheduleData] = useState(null);

  useEffect(() => {
    !scheduleData && getScheduleData();
  }, [scheduleData]);

  const getScheduleData = async () => {
    const fetchICS = async (fileUrl) => {
      try {
        const response = await fetch(fileUrl);
        const data = await response.text();
        const events = icsToJson(data);
        const schArr = groupEventsByLocation(events, trackImgs);
        // console.log("fetchICS", JSON.stringify(schArr));
        setScheduleData(schArr);
      } catch (error) {
        console.error("Error fetching or parsing ICS file:", error);
      }
    };

    fetchICS(icsLink);
  };

  const TitleTextView = () => {
    return (
      <View>
        <Text style={styles.headerText}>{`F1 Schedule ${moment().format(
          "YYYY"
        )}`}</Text>
      </View>
    );
  };

  const GpSection = (data) => {
    return <SectionCard data={data} />;
  };

  return (
    <GradientContainer>
      <FlatList
        style={{
          paddingHorizontal: 16,
          marginTop: -15,
          paddingBottom: 16,
        }}
        fadingEdgeLength={50}
        data={scheduleData}
        keyExtractor={(item) => item?.location}
        renderItem={GpSection}
        ListHeaderComponent={TitleTextView}
        overScrollMode="never"
      />
    </GradientContainer>
  );
};

export default ScheduleScreen;
