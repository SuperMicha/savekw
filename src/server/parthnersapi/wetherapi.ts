// weather-service.js
//https://www.weatherapi.com/docs/
import {
  AddSystemLog,
  GetSystemSetting,
  getGeneralSettingsByUserId,
  GetUserProperty,
  setUserProperty,
} from "@/server/databaseapi";
import { logger } from "@/logger";
// Use the global fetch (Node 18+). If your runtime provides fetch globally, declare it for TypeScript.
// If you need a polyfill instead, run: npm install node-fetch@2 @types/node-fetch and restore the import.
declare const fetch: any;

export class WeatherService {
  private token: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() { }

  async init() {
    this.token = await GetSystemSetting("weather_api_token");
    if (!this.token) {
      logger.error(
        "❌ WeatherService: weather_api_token not found in system settings",
      );
    } else {
      logger.info("✅ WeatherService initialized with API token");
    }
  }

  async GetUserWeather(user_id = ""): Promise<void> {
    try {
      if (!user_id) {
        logger.error("❌ GetUserWeather: missing user_id");
        return;
      }

      // Перевіряємо чи токен ініціалізовано
      if (!this.token) {
        logger.error("❌ GetUserWeather: weather_api_token not initialized");
        return;
      }

      // --- 1. Отримуємо локацію користувача ---
      const user_location = await GetUserProperty(user_id, "location");
      logger.debug("📍 User location:", user_location);
      if (!user_location?.value) {
        logger.warn(`⚠️ User ${user_id} has no location set`);
        return;
      }

      // --- 2. Отримуємо загальні налаштування ---
      const general_settings = await getGeneralSettingsByUserId(user_id);
      if (!general_settings) return;

      // --- 3. Отримуємо погоду (наприклад: 2 дні вперед) ---
      const response = await this.GetWeather(2, user_location.value, "UA");
      logger.debug("🌦 Weather response:", response);

      if (!response || !Array.isArray(response) || response.length < 2) {
        logger.error("⚠️ Invalid weather response");
        return;
      }
      let cloud_density=general_settings.cloud_density; 
      if(cloud_density===undefined || cloud_density===null){
        cloud_density=50; //значення за замовчуванням
      }
      // --- 4. Формуємо прогноз на сьогодні ---
      const today_forecast = this.sunForecast(response[0].hour,cloud_density);
      const calculated_sun_today = this.countSunnyHours(
        today_forecast.sunActivity,
        general_settings.active_solar_start,
        general_settings.active_solar_end,
      );
      today_forecast.sunnyHours = calculated_sun_today;

      // --- 5. Формуємо прогноз на завтра ---
      const tomorrow_forecast = this.sunForecast(response[1].hour,cloud_density);
      const calculated_sun_tomorrow = this.countSunnyHours(
        tomorrow_forecast.sunActivity,
        general_settings.active_solar_start,
        general_settings.active_solar_end,
      );
      tomorrow_forecast.sunnyHours = calculated_sun_tomorrow;

      logger.debug("☀️ Sunny hours today:", calculated_sun_today);
      logger.debug("☀️ Sunny hours tomorrow:", calculated_sun_tomorrow);
      const logmessage = `Прогноз погоди отримано: сьогодні сонячних годин - ${calculated_sun_today}, завтра сонячних годин - ${calculated_sun_tomorrow}`;
      // --- 6. Зберігаємо прогноз ---
      const sun_forecast = [today_forecast, tomorrow_forecast];
      await setUserProperty(user_id, "sun_forecast", sun_forecast);

      logger.debug("✅ Sun forecast saved successfully");
      await AddSystemLog(
        user_id,
        "Прогноз погоди",
        "Зміна",
        "Прогноз",
        "",
        logmessage,
      );
    } catch (e) {
      logger.error("❌ Error in GetUserWeather:", e);
      await AddSystemLog(
        user_id,
        "Прогноз погоди",
        "⚠️Помилка",
        "Прогноз",
        "",
        String(e),
      );
    }
  }

  async GetWeather(
    days = 2,
    location = "50.47573854648793, 30.7604154909624",
    language = "UA",
  ) {
    if (language == "UA") {
      language = "UK";
    }
    const url =
      "http://api.weatherapi.com/v1/forecast.json?key=" +
      this.token +
      "&q=" +
      location +
      "&days=" +
      days +
      "&aqi=no&alerts=yes&lang=" +
      language;

    const data = await this.getRequest(url);
    //Logger.log(data);

    if (data == undefined) return [];
    logger.debug(data.forecast.forecastday);
    return data.forecast.forecastday;
  }

  sunForecast(forecast: any[], density: number = 50) {
    const sunActivity = forecast.map(
      (hour: {
        cloud: any; condition: { code: any }; is_day: any 
}) => {
        const code = hour.condition?.code;
        const isDay = hour.is_day;
        const cloud_density = hour.cloud;
        return isDay === 1 && (code === 1000 || (code === 1003 && cloud_density<density )) ? 1 : 0;
      },
    );

    const sunnyHours = sunActivity.reduce((sum: any, val: any) => sum + val, 0);

    return { sunActivity, sunnyHours };
  }
  GetSunnyHours(data: {
    hour: {
      filter: (arg0: (o: any) => boolean) => {
        (): any;
        new(): any;
        length: any;
      };
    };
  }) {
    return data.hour.filter(
      (o) =>
        o.is_day == 1 && (o.condition.code == 1000 || (o.condition.code == 1003 && o.cloud < 50)),
    ).length;
  }

  async getRequest(url = "") {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      logger.error("Ошибка при запросе:", err);
    }
  }

  countSunnyHours(
    sunActivity: number[] = [],
    solar_activity_start = 0,
    solar_activity_end = 0,
  ): number {
    let sunnyHours = 0;

    for (let h = solar_activity_start; h <= solar_activity_end; h++) {
      if (sunActivity[h] === 1) {
        sunnyHours++;
      }
    }

    return sunnyHours;
  }

  

}
