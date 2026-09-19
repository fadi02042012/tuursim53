const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "output", "by_country");
const US_PATH = path.join(OUT, "US.json");

const world = JSON.parse(fs.readFileSync("/tmp/ne_110m_admin_0_countries.geojson", "utf8"));

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const hit = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, geometry) {
  if (!geometry) return false;
  if (geometry.type === "Polygon") {
    const [outer, ...holes] = geometry.coordinates;
    return pointInRing(point, outer) && !holes.some(h => pointInRing(point, h));
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some(poly => {
      const [outer, ...holes] = poly;
      return pointInRing(point, outer) && !holes.some(h => pointInRing(point, h));
    });
  }
  return false;
}

const countries = world.features
  .map(f => ({
    iso2: f.properties.ISO_A2,
    name: f.properties.NAME_EN || f.properties.NAME,
    geometry: f.geometry
  }))
  .filter(c => c.iso2 && c.iso2 !== "-99");

function locate(lat, lng) {
  const point = [lng, lat];
  return countries.find(c => pointInPolygon(point, c.geometry)) || null;
}

const us = JSON.parse(fs.readFileSync(US_PATH, "utf8"));
const moves = new Map();

for (const city of us) {
  const country = locate(Number(city.lat), Number(city.lng));
  if (country && country.iso2 !== "US") {
    if (!moves.has(country.iso2)) moves.set(country.iso2, []);
    moves.get(country.iso2).push(city);
  }
}

if (!moves.size) {
  console.log("No foreign coordinates found in US.json. Checked " + us.length + " records.");
  process.exit(0);
}

const moved = new Set([...moves.values()].flat().map(c => JSON.stringify(c)));
const correctedUS = us.filter(c => !moved.has(JSON.stringify(c)));
fs.writeFileSync(US_PATH, JSON.stringify(correctedUS, null, 2) + "\n");

for (const [iso2, cities] of moves) {
  const target = path.join(OUT, iso2 + ".json");
  const existing = fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, "utf8")) : [];
  const seen = new Set(existing.map(c => c.city + "|" + c.lat + "|" + c.lng));
  for (const city of cities) {
    const key = city.city + "|" + city.lat + "|" + city.lng;
    if (!seen.has(key)) existing.push(city);
  }
  existing.sort((a, b) => String(a.city).localeCompare(String(b.city)));
  fs.writeFileSync(target, JSON.stringify(existing, null, 2) + "\n");
  console.log("Moved " + cities.length + " city/cities from US.json to " + iso2 + ".json");
}

console.log("Corrected " + [...moves.values()].reduce((n, xs) => n + xs.length, 0) + " city/cities across " + moves.size + " country file(s).");
