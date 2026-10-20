// Shapes returned by the Jolpica (Ergast-compatible) API. Only fields the app uses are typed.

export interface SessionTime {
  date: string;
  time?: string;
}

export interface Circuit {
  circuitId: string;
  circuitName: string;
  url: string;
  Location: { lat: string; long: string; locality: string; country: string };
}

export interface Race {
  season: string;
  round: string;
  raceName: string;
  url: string;
  date: string;
  time?: string;
  Circuit: Circuit;
  FirstPractice?: SessionTime;
  SecondPractice?: SessionTime;
  ThirdPractice?: SessionTime;
  SprintQualifying?: SessionTime;
  Sprint?: SessionTime;
  Qualifying?: SessionTime;
}

export interface Driver {
  driverId: string;
  permanentNumber?: string;
  code?: string;
  givenName: string;
  familyName: string;
  nationality: string;
  dateOfBirth?: string;
}

export interface Constructor {
  constructorId: string;
  name: string;
  nationality: string;
}

export interface RaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: Driver;
  Constructor: Constructor;
  grid?: string;
  laps?: string;
  status?: string;
  Time?: { millis?: string; time: string };
  FastestLap?: { rank: string; lap: string; Time: { time: string } };
}

export interface QualifyingResult {
  number: string;
  position: string;
  Driver: Driver;
  Constructor: Constructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface DriverStanding {
  position?: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface ConstructorStanding {
  position?: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  /** ISO timestamp, when the feed provides one. */
  published?: string;
}
