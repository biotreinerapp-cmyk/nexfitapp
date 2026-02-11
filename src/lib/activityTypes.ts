export type ActivityCategory = "deslocamento" | "estacionario";

export interface ActivityType {
  id: string;
  name: string;
  category: ActivityCategory;
  usesGps: boolean;
  usesDistance: boolean;
}

export const ACTIVITY_TYPES: ActivityType[] = [
  {
    id: "corrida",
    name: "Corrida",
    category: "deslocamento",
    usesGps: true,
    usesDistance: true,
  },
  {
    id: "caminhada",
    name: "Caminhada",
    category: "deslocamento",
    usesGps: true,
    usesDistance: true,
  },
  {
    id: "ciclismo",
    name: "Ciclismo",
    category: "deslocamento",
    usesGps: true,
    usesDistance: true,
  },
  {
    id: "trilha",
    name: "Trilha",
    category: "deslocamento",
    usesGps: true,
    usesDistance: true,
  },
  {
    id: "musculacao",
    name: "Musculação",
    category: "estacionario",
    usesGps: false,
    usesDistance: false,
  },
  {
    id: "funcional",
    name: "Funcional",
    category: "estacionario",
    usesGps: false,
    usesDistance: false,
  },
  {
    id: "crossfit",
    name: "Cross Training",
    category: "estacionario",
    usesGps: false,
    usesDistance: false,
  },
  {
    id: "yoga",
    name: "Yoga",
    category: "estacionario",
    usesGps: false,
    usesDistance: false,
  },
  {
    id: "alongamento",
    name: "Alongamento",
    category: "estacionario",
    usesGps: false,
    usesDistance: false,
  },
];

export const getActivityTypeById = (id: string): ActivityType | null => {
  return ACTIVITY_TYPES.find((activity) => activity.id === id) ?? null;
};
