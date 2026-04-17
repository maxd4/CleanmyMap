export async function snapPolylineToStreetNetwork(
  coordinates: [number, number][]
): Promise<[number, number][] | null> {
  // Requires at least 2 points to route
  if (!coordinates || coordinates.length < 2) {
    return coordinates;
  }

  // OSRM URL format: {longitude},{latitude};...
  // Leaflet provides [latitude, longitude]
  const coordString = coordinates
    .map((point) => `${point[1].toFixed(6)},${point[0].toFixed(6)}`)
    .join(";");

  // max coordinates for public OSRM /route is ~100
  // If >100, we simply return the raw ones to avoid error
  if (coordinates.length > 100) {
    return coordinates;
  }

  const url = `https://router.project-osrm.org/route/v1/foot/${coordString}?geometries=geojson&overview=full`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn("OSRM routing API returned an error:", response.status);
      return null;
    }

    const data = await response.json();

    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      // The geometry is a GeoJSON LineString => coords are [longitude, latitude]
      const geojsonLine = data.routes[0].geometry.coordinates as [number, number][];
      
      // Convert back to Leaflet [latitude, longitude]
      return geojsonLine.map((point) => [
        Number(point[1].toFixed(6)),
        Number(point[0].toFixed(6)),
      ]);
    }
    
    return null;
  } catch (error) {
    console.warn("OSRM routing API failed:", error);
    return null;
  }
}
