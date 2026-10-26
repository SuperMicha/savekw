import { PrismaClient } from "@prisma/client";
import { config } from "dotenv";

// Завантажуємо змінні з env.local
config({ path: "env.local" });

const prisma = new PrismaClient();

const DEFAULT_ALGORITHMS = {
  general_settings: {
    sunny_hours_threshold: 6,
    day_tarif_start: 6,
    night_tarif_start: 23,
    active_solar_start: 7,
    active_solar_end: 17,
    autodetect_active_solar_timeframe: true,
  },
  algorithms: [
    {
      id: 1,
      device_id: "",
      description: "Робота інвертора за прогнозом",
      status: 1,
      name: "algorithm1",
      out_priority_nosun: 3,
      out_priority_sun: 2,
      charge_priority_nosun: 2,
      charge_priority_sun: 1,
      appliances_required: ["energy_meeter", "invertor", "solar_panel"],
      appliances_absent: [],
      equipment: [1],
    },
    {
      id: 2,
      device_id: "",
      description: "Робота інвертора за розкладом",
      status: 1,
      name: "algorithm2",
      charge_time: "23",
      discharge_time: "07",
      out_priority_charge: 2,
      out_priority_discharge: 2,
      charge_priority_charge: 2,
      charge_priority_discharge: 2,
      appliances_required: ["energy_meeter", "invertor"],
      appliances_absent: ["solar_panel"],
      equipment: [1],
    },
    {
      id: 3,
      device_id: "",
      description: "Робота бойлера в нічний час",
      status: 1,
      name: "algorithm3",
      night_start: 3,
      night_end: 7,
      appliances_required: ["energy_meeter", "boiler"],
      appliances_absent: ["solar_panel"],
      equipment: [2],
    },
    {
      id: 4,
      device_id: "",
      description: "Робота пральної машини в нічний час",
      status: 1,
      name: "algorithm4",
      night_start: 0,
      appliances_required: ["energy_meeter", "washer"],
      appliances_absent: ["solar_panel"],
      equipment: [3, 4],
    },
    {
      id: 5,
      device_id: "",
      description: "Робота посудомийки в нічний час",
      status: 1,
      name: "algorithm5",
      night_start: 2,
      appliances_required: ["energy_meeter", "dishwasher"],
      appliances_absent: ["solar_panel"],
      equipment: [3, 4],
    },
    {
      id: 6,
      device_id: "",
      description: "Робота бойлера вдень та вночі",
      status: 1,
      name: "algorithm6",
      day_start: 12,
      day_end: 17,
      night_start: 3,
      night_end: 7,
      appliances_required: [
        "energy_meeter",
        "boiler",
        "solar_panel",
        "invertor",
      ],
      appliances_absent: [],
      equipment: [2],
    },
    {
      id: 7,
      device_id: "",
      description: "Робота пральної машини вдень та вночі",
      status: 1,
      name: "algorithm7",
      day_start: 11,
      night_start: 0,
      appliances_required: [
        "energy_meeter",
        "washer",
        "solar_panel",
        "invertor",
      ],
      appliances_absent: [],
      equipment: [3, 4],
    },
    {
      id: 8,
      device_id: "",
      description: "Робота посудомийки вдень та вночі",
      status: 1,
      name: "algorithm8",
      day_start: 10,
      night_start: 0,
      appliances_required: [
        "energy_meeter",
        "dishwasher",
        "solar_panel",
        "invertor",
      ],
      appliances_absent: [],
      equipment: [3, 4],
    },
  ],
};

const WEATHER_API_TOKEN = "your-weatherapi-token";

async function main() {
  console.log("🌱 Seeding system settings...");

  // Seed default_algorithms
  await prisma.systemSettings.upsert({
    where: { key: "default_algorithms" },
    create: {
      key: "default_algorithms",
      value: JSON.stringify(DEFAULT_ALGORITHMS),
    },
    update: {
      value: JSON.stringify(DEFAULT_ALGORITHMS),
    },
  });
  console.log("✅ default_algorithms seeded");

  // Seed weather_api_token
  await prisma.systemSettings.upsert({
    where: { key: "weather_api_token" },
    create: {
      key: "weather_api_token",
      value: WEATHER_API_TOKEN,
    },
    update: {
      value: WEATHER_API_TOKEN,
    },
  });
  console.log("✅ weather_api_token seeded");

  console.log("🎉 System settings seeded successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding system settings:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
