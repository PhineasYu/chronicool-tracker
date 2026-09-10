// Hardcoded daily schedule (from the user's real routine). Editing in-app is a
// planned follow-up — for now this is the single source of truth.

export interface ScheduleItem {
  id: string;
  time: string;
  label: string;
  sub?: string;
}

export const SCHEDULE: ScheduleItem[] = [
  { id: "strength", time: "05:00", label: "Strength Training", sub: "1h" },
  { id: "cardio", time: "06:00", label: "Cardio", sub: "1h" },
  { id: "breakfast", time: "07:30", label: "Breakfast + Vit D / Fish Oil", sub: "kvarg + oats" },
  { id: "focus", time: "Daytime", label: "Internship / Deep Focus", sub: "start each block with a work-start ritual" },
  { id: "lunch", time: "Lunch", label: "Main Protein Meal + Creatine", sub: "get protein in by breakfast + lunch" },
  { id: "snack", time: "Evening", label: "Fruit Snack", sub: "no main meal" },
  { id: "jog", time: "20:00–21:00", label: "Park Jog / Walk", sub: "1h · relaxation · mindfulness" },
  { id: "bedtime", time: "Bedtime", label: "Bedtime Routine" },
];

export const TOTAL_ITEMS = SCHEDULE.length;

export const MEAL_ROTATION = {
  PRO: ["Chicken breast", "Salmon", "Shrimp", "Eggs"],
  CARB: ["Rice", "Potato", "Pasta"],
  VEG: ["Frozen broccoli", "Frozen peas / spinach", "Mixed veg", "Cucumber", "Lettuce"],
};

export function localDateString(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
