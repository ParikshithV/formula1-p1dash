import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import styles from "./ScheduleScreen.styles";
import GradientContainer, { topGap } from "../../utils/GradientContainer";
import { fontWeight } from "../../utils/strings";
import axios from "axios";
import icsToJson from "ics-to-json";
import { trackImgs } from "../../utils/f1Imgs";
import { groupEventsByLocation } from "../../utils/groupEventsByLocation";
import SectionCard from "./SectionCard";
import moment from "moment";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";

const icsLink =
  "https://ics.ecal.com/ecal-sub/65e47a3c06cfae0008e8b27b/Formula%201.ics";

const ScheduleScreen = () => {
  const [scheduleData, setScheduleData] = useState(null);
  const [historyMode, setHistoryMode] = useState(false);

  useEffect(() => {
    !scheduleData && getScheduleData();
  }, [scheduleData]);

  const filterListing = (item: any) => {
    const eventsArr = item?.events || [];
    const eventsLen = eventsArr?.length - 1;
    const lastDate = eventsArr[eventsLen]?.endDate || 0;
    let retVal: boolean;
    if (historyMode) {
      retVal = moment(lastDate).isBefore();
    } else {
      retVal = moment(lastDate).isAfter();
    }
    return retVal;
  };

  const listingData = useMemo(() => {
    let resArr = scheduleData?.filter((item: object) => filterListing(item));
    resArr?.sort((a: any, b: any) => {
      const aStartDate = a?.events?.[0]?.startDate;
      const bStartDate = b?.events?.[0]?.startDate;
      const startDateA = moment(aStartDate);
      const startDateB = moment(bStartDate);
      return startDateA.diff(startDateB);
    });
    return resArr;
  }, [scheduleData, historyMode]);

  const getScheduleData = async () => {
    const fetchICS = async (fileUrl: string) => {
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
      <View style={styles.headerTextView}>
        <Pressable
          style={[
            styles.historyBtn,
            {
              opacity: historyMode ? 1 : 0.5,
            },
          ]}
          onPress={() => setHistoryMode((prev) => !prev)}
        >
          <FontAwesome5 name={"history"} color={"#fff"} size={18} />
        </Pressable>
        <Text style={styles.headerText}>{`F1 Schedule ${moment().format(
          "YYYY"
        )}`}</Text>
      </View>
    );
  };

  const GpSection = (data: object) => {
    return <SectionCard data={data} />;
  };

  const AbsoluteLoader = () => {
    return (
      <View style={styles.absoluteLoaderView}>
        <ActivityIndicator size={"large"} color={"#fff"} />
      </View>
    );
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
        data={listingData}
        keyExtractor={(item) => item?.location}
        renderItem={GpSection}
        ListHeaderComponent={TitleTextView}
        overScrollMode="never"
        ListEmptyComponent={AbsoluteLoader}
      />
    </GradientContainer>
  );
};

export default ScheduleScreen;
