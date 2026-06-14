export type SlotStatus = "empty" | "available" | "booked" | "blocked";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export const availabilityWeek = {
  label: "Week of June 9 – 15, 2025",
  stats: {
    available: 12,
    booked: 8,
    blocked: 2,
    sessionDuration: "20-minute speaking sessions",
  },
  days: [
    { key: "mon" as DayKey, label: "Mon", date: "9" },
    { key: "tue" as DayKey, label: "Tue", date: "10" },
    { key: "wed" as DayKey, label: "Wed", date: "11" },
    { key: "thu" as DayKey, label: "Thu", date: "12" },
    { key: "fri" as DayKey, label: "Fri", date: "13" },
    { key: "sat" as DayKey, label: "Sat", date: "14" },
    { key: "sun" as DayKey, label: "Sun", date: "15" },
  ],
  timeSlots: [
    "7:00",
    "8:00",
    "9:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
    "17:00",
    "18:00",
    "19:00",
    "20:00",
  ],
};

/** Grid keyed by time → day → status */
export const slotGrid: Record<string, Partial<Record<DayKey, SlotStatus>>> = {
  "9:00": {
    mon: "available",
    tue: "available",
    wed: "blocked",
    thu: "available",
    fri: "available",
  },
  "10:00": {
    mon: "available",
    tue: "booked",
    wed: "blocked",
    thu: "available",
    fri: "booked",
  },
  "11:00": {
    mon: "available",
    thu: "available",
    fri: "available",
  },
  "14:00": {
    thu: "booked",
  },
  "14:40": {
    thu: "booked",
  },
  "15:00": {
    thu: "available",
  },
  "16:00": {
    tue: "available",
    wed: "available",
  },
};

export function getSlotStatus(time: string, day: DayKey): SlotStatus {
  return slotGrid[time]?.[day] ?? "empty";
}
