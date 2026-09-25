"use client";

import dynamic from "next/dynamic";

export const DeferredWeatherWarningBar = dynamic(
  () =>
    import("./weather-warning-bar").then(
      (module) => module.WeatherWarningBar,
    ),
  { ssr: false, loading: () => null },
);
