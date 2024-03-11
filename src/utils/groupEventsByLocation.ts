import React from "react";

function formatEventsArray(groupedEvents: any[]) {
  const formattedArray = [];

  for (const location in groupedEvents) {
    const trackImg = groupedEvents[location][0].img || ""; // Assuming all events in the same location have the same image
    const events = groupedEvents[location];

    formattedArray.push({
      location: location,
      trackImg: trackImg,
      events: events,
    });
  }

  return formattedArray;
}

export const groupEventsByLocation = (events: any[], imgs: any[]) => {
  const groupedEvents: any = {};

  events.forEach((event: any) => {
    const { location } = event;

    // Ignore events with empty location
    if (!location) {
      return;
    }

    // Find the matching image URL
    let imageUrl = imgs.find((img) =>
      img.includes(encodeURIComponent(location))
    );

    if (!imageUrl) {
      const wordsInSummary = event.summary?.split(/\s+/) || [];
      for (const word of wordsInSummary) {
        const matchingImg = imgs.find((img) =>
          img.includes(encodeURIComponent(word))
        );
        if (matchingImg) {
          imageUrl = matchingImg;
          break;
        }
      }
    }

    // Add the image URL to the event if found
    if (imageUrl) {
      event.img = imageUrl;
    }

    // Group events by location
    if (!groupedEvents[location]) {
      groupedEvents[location] = [];
    }

    // Sort events by startDate within each location
    // for (const location in groupedEvents) {
    //   groupedEvents[location].sort((a, b) => {
    //     const startDateA = moment(a.startDate);
    //     const startDateB = moment(b.startDate);
    //     return startDateA.diff(startDateB);
    //   });
    // }

    groupedEvents[location].push(event);
  });

  return formatEventsArray(groupedEvents);
};
