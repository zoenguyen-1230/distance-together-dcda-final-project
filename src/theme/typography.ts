import { Platform } from "react-native";

const displayFamily = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "Georgia",
});

const sansFamily = Platform.select({
  ios: "Avenir Next",
  android: "sans-serif",
  default: "Avenir Next, Helvetica Neue, sans-serif",
});

const sansFamilyMedium = Platform.select({
  ios: "Avenir Next",
  android: "sans-serif-medium",
  default: "Avenir Next, Helvetica Neue, sans-serif",
});

export const typography = {
  displayFamily,
  sansFamily,
  sansFamilyMedium,
};
