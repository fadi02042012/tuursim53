const fs = require("fs");

const cities = JSON.parse(fs.readFileSync("output/by_country/US.json", "utf8"));

function isUnitedStates(lat, lng) {
  const conus = lat >= 24.39 && lat <= 49.39 && lng >= -125.0 && lng <= -66.9;
  const alaska = lat >= 51.2 && lat <= 71.5 && lng >= -180 && lng <= -129;
  const hawaii = lat >= 18.8 && lat <= 22.3 && lng >= -160.3 && lng <= -154.7;
  return conus || alaska || hawaii;
}

const invalid = cities.filter(city => !isUnitedStates(city.lat, city.lng));

if (invalid.length) {
  console.error(`US.json contains ${invalid.length} coordinate(s) outside the United States:`);
  for (const city of invalid) {
    console.error(`- ${city.city} (${city.lat}, ${city.lng})`);
  }
  process.exit(1);
}

console.log(`OK: ${cities.length} cities in US.json have coordinates inside the United States.`);
