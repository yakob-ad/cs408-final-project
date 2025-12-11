// Base units for data storage / API
const UNITS = [
  "kg", "gram", "lb", "oz",          // weight
  "liter", "ml", "cup", "pint", "quart", // volume
  "tbsp", "tsp",                     // small volume measures
  "piece", "clove", "leaf", "pack"   // count / packaging / produce descriptors
];

// Optional plural forms for display
const UNITS_PLURAL = [
  "kgs", "grams", "lbs", "oz",       // weight plurals
  "liters", "ml", "cups", "pints", "quarts", // volume plurals
  "tbsp", "tsp",                     // tablespoons/teaspoons often shown without plural change
  "pieces", "cloves", "leaves", "packs" // count / packaging / produce descriptors
];


// Plural form of Unit name
function getPlural(unit) {
  const idx = UNITS.indexOf(unit);
  return idx !== -1 ? UNITS_PLURAL[idx] : unit;
}