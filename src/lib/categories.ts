// Mappa categorie merceologiche → filtri tag OpenStreetMap (Overpass QL).
// Ogni voce può matchare più coppie chiave=valore.

export interface CategoryDef {
  id: string;
  label: string;
  osmFilters: { key: string; value: string }[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "ristoranti",
    label: "Ristoranti & Pizzerie",
    osmFilters: [
      { key: "amenity", value: "restaurant" },
      { key: "amenity", value: "pizzeria" },
      { key: "cuisine", value: "pizza" },
    ],
  },
  {
    id: "bar_caffe",
    label: "Bar & Caffè",
    osmFilters: [
      { key: "amenity", value: "bar" },
      { key: "amenity", value: "cafe" },
    ],
  },
  {
    id: "idraulici",
    label: "Idraulici",
    osmFilters: [{ key: "craft", value: "plumber" }],
  },
  {
    id: "elettricisti",
    label: "Elettricisti",
    osmFilters: [{ key: "craft", value: "electrician" }],
  },
  {
    id: "dentisti",
    label: "Studi Dentistici",
    osmFilters: [{ key: "amenity", value: "dentist" }],
  },
  {
    id: "medici",
    label: "Studi Medici",
    osmFilters: [
      { key: "amenity", value: "doctors" },
      { key: "amenity", value: "clinic" },
    ],
  },
  {
    id: "parrucchieri",
    label: "Parrucchieri & Barbieri",
    osmFilters: [
      { key: "shop", value: "hairdresser" },
      { key: "shop", value: "beauty" },
    ],
  },
  {
    id: "officine",
    label: "Officine & Gommisti",
    osmFilters: [
      { key: "shop", value: "car_repair" },
      { key: "shop", value: "tyres" },
    ],
  },
  {
    id: "palestre",
    label: "Palestre & Fitness",
    osmFilters: [
      { key: "leisure", value: "fitness_centre" },
      { key: "leisure", value: "sports_centre" },
    ],
  },
  {
    id: "hotel",
    label: "Hotel & B&B",
    osmFilters: [
      { key: "tourism", value: "hotel" },
      { key: "tourism", value: "guest_house" },
    ],
  },
  {
    id: "panetterie",
    label: "Panetterie & Pasticcerie",
    osmFilters: [
      { key: "shop", value: "bakery" },
      { key: "shop", value: "confectionery" },
    ],
  },
  {
    id: "fioristi",
    label: "Fioristi",
    osmFilters: [{ key: "shop", value: "florist" }],
  },
  {
    id: "avvocati",
    label: "Studi Legali & Commercialisti",
    osmFilters: [
      { key: "office", value: "lawyer" },
      { key: "office", value: "accountant" },
    ],
  },
  {
    id: "immobiliari",
    label: "Agenzie Immobiliari",
    osmFilters: [{ key: "office", value: "estate_agent" }],
  },
  {
    id: "veterinari",
    label: "Veterinari",
    osmFilters: [{ key: "amenity", value: "veterinary" }],
  },
];

export function getCategory(id: string): CategoryDef | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
