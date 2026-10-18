import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { clearOpenMeteoForecastCache } from "@/lib/weather/open-meteo-client";
import { createActionPreparationWeatherRequest, useActionPreparationWeather } from "./use-action-preparation-weather";

const forecastResponse = {
  hourly: {
    time: ["2026-10-20T09:00", "2026-10-20T10:00"],
    temperature_2m: [2, 3],
    apparent_temperature: [1, 2],
    precipitation: [1, 0],
    precipitation_probability: [70, 20],
    wind_speed_10m: [12, 10],
    wind_gusts_10m: [20, 18],
    weather_code: [61, 2],
  },
};

function request() {
  return createActionPreparationWeatherRequest({
    actionDate: "2026-10-20",
    scheduledStartTime: "09:00",
    scheduledEndTime: "11:00",
    latitude: 48.85,
    longitude: 2.35,
    now: new Date("2026-10-19T09:00:00.000Z"),
  });
}

function Harness({ weatherRequest = request() }: { weatherRequest?: ReturnType<typeof request> }) {
  const weather = useActionPreparationWeather({ request: weatherRequest });
  return <button type="button" data-state={weather.weatherState} onClick={() => void weather.requestWeather()} />;
}

describe("useActionPreparationWeather", () => {
  beforeEach(() => clearOpenMeteoForecastCache());
  afterEach(() => vi.unstubAllGlobals());

  it("does not call Open-Meteo before the explicit request", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(forecastResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    let renderer!: ReactTestRenderer;

    await act(async () => { renderer = create(<Harness />); });

    expect(fetcher).not.toHaveBeenCalled();
    expect(renderer.root.findByType("button").props["data-state"]).toBe("idle");

    await act(async () => { await renderer.root.findByType("button").props.onClick(); });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(renderer.root.findByType("button").props["data-state"]).toBe("success");
    renderer.unmount();
  });

  it("deduplicates concurrent clicks for the same weather request", async () => {
    let resolveResponse!: (response: Response) => void;
    const fetcher = vi.fn(() => new Promise<Response>((resolve) => { resolveResponse = resolve; }));
    vi.stubGlobal("fetch", fetcher);
    let renderer!: ReactTestRenderer;

    await act(async () => { renderer = create(<Harness />); });
    const button = renderer.root.findByType("button");
    const first = button.props.onClick();
    const second = button.props.onClick();
    expect(fetcher).toHaveBeenCalledTimes(1);

    resolveResponse(new Response(JSON.stringify(forecastResponse), { status: 200 }));
    await act(async () => { await Promise.all([first, second]); });
    expect(renderer.root.findByType("button").props["data-state"]).toBe("success");
    renderer.unmount();
  });

  it("returns to idle without fetching when the action context changes", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(forecastResponse), { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    let renderer!: ReactTestRenderer;

    await act(async () => { renderer = create(<Harness />); });
    await act(async () => { renderer.update(<Harness weatherRequest={{ ...request()!, scheduledStartAt: "2026-10-21T09:00", scheduledEndAt: "2026-10-21T11:00" }} />); });

    expect(fetcher).not.toHaveBeenCalled();
    expect(renderer.root.findByType("button").props["data-state"]).toBe("idle");
    renderer.unmount();
  });
});
