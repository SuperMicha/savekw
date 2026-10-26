import {
  AddSystemLog,
  setUserProperty,
  GetJSONUserProperty,
} from "@/server/databaseapi";
import { logger } from "@/logger";
// eslint-disable-next-line @typescript-eslint/no-floating-promises
export class SmartLifeAPI {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() { }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  execute() { }

  async SmartLifeAuth(user_id = "U093BTK78TV") {
    const creds = await GetJSONUserProperty(user_id, "smart_life_creds");
    if (!creds) return null;

    const userName = creds.smart_life_user;
    const password = creds.smart_life_pswd;
    const url_user = encodeURIComponent(userName);
    const url_pswd = encodeURIComponent(password);
    logger.debug(url_user);
    logger.debug(url_pswd);

    const url =
      "https://px1.tuyaeu.com/homeassistant/auth.do?userName=" +
      url_user +
      "&password=" +
      url_pswd +
      "&countryCode=44&bizType=smart_life&from=tuya";

    const resp = await fetch(url, { method: "POST" });
    const response = await resp.json();
    logger.debug(response);
    const status = response.responseStatus;
    logger.debug(status);
    if (response.access_token != null) {
      creds.smart_life_token = response.access_token;
      await setUserProperty(user_id, "smart_life_creds", creds);
      logger.debug("Auth done");
    }

    return response;
  }

  async sendDishWasherCommand(
    user_id = "",
    state = "",
    dishwasher_device_id = "",
  ) {
    try {
      logger.debug("DishWasher control");

      let result;
      if (state == "on") {
        result = await this.SwitchControl(user_id, 1, dishwasher_device_id);
      }

      logger.debug(result);
      if (result.header.code == "SUCCESS") {
        if (state == "on") {
          logger.debug("Посудомийку включено:");
          void AddSystemLog(
            user_id,
            "Управління посдомийкою",
            "Зміна",
            "Стан посудомийки",
            "",
            "Посудомийку включено",
          );
        }
        return true;
      } else {
        void AddSystemLog(
          user_id,
          "Управління посдомийкою",
          "⚠️Помилка",
          "Стан посудомийки",
          "",
          result.header.code,
        );
        return false;
      }
    } catch (e) {
      logger.error(`❌ Помилка під час надсилання команди: ${e}`);
      void AddSystemLog(
        user_id,
        "Управління посдомийкою",
        "⚠️Помилка",
        "Стан посудомийки",
        "",
        `${e}`,
      );
      return false;
    }
  }

  async sendWasherCommand(user_id = "", state = "", washer_device_id = "") {
    try {
      logger.debug("Washer control");

      //const washer_device_id = this.GetDeviceId(user_id, "washer");
      //Logger.log(washer_device_id);

      let result;
      if (state == "on") {
        result = await this.SwitchControl(user_id, 1, washer_device_id);
      }

      logger.debug(result);
      if (result.header.code == "SUCCESS") {
        if (state == "on") {
          logger.debug("Пральну машину включено:");
          void AddSystemLog(
            user_id,
            "Управління пральною машиною",
            "Зміна",
            "Стан пральної машини",
            "",
            "Пральну машину включено",
          );
        }
        return true;
      } else {
        void AddSystemLog(
          user_id,
          "Управління пральною машиною",
          "⚠️Помилка",
          "Стан пральної машини",
          "",
          result.header.code,
        );
        return false;
      }
    } catch (e) {
      logger.error(`❌ Помилка під час надсилання команди: ${e}`);
      AddSystemLog(
        user_id,
        "Управління пральною машиною",
        "⚠️Помилка",
        "Стан пральної машини",
        "",
        `${e}`,
      );
      return false;
    }
  }

  async sendBoilerCommand(
    user_id = "U093BTK78TV",
    state = "on",
    boiler_device_id = "",
  ) {
    try {
      logger.debug(boiler_device_id);
      let result;
      if (state == "on") {
        result = await this.SwitchControl(user_id, 1, boiler_device_id);
      }
      if (state == "off") {
        result = await this.SwitchControl(user_id, 0, boiler_device_id);
      }
      logger.debug(result);
      if (result.header.code == "SUCCESS") {
        if (state == "on") {
          logger.debug("Бойлер включено:");
          void AddSystemLog(
            user_id,
            "Управління бойлером",
            "Зміна",
            "Стан бойлера",
            "",
            "Бойлер включено",
          );
        }
        if (state == "off") {
          logger.debug("Бойлер виключено:");
          void AddSystemLog(
            user_id,
            "Управління бойлером",
            "Зміна",
            "Стан бойлера",
            "",
            "Бойлер відключено",
          );
        }

        return true;
      } else {
        void AddSystemLog(
          user_id,
          "Управління бойлером",
          "⚠️Помилка",
          "Стан бойлера",
          "",
          result.header.code,
        );
        return false;
      }
    } catch (e) {
      logger.debug(`❌ Помилка під час надсилання команди: ${e}`);
      void AddSystemLog(
        user_id,
        "Управління бойлером",
        "⚠️Помилка",
        "",
        "Стан бойлера",
        `${e}`,
      );
      return false;
    }
  }

  async SwitchControl(
    user_id = "U0891JULK4M",
    state = 1,
    device_id = "bf17b0kbwphsganz",
  ) {
    try {
      const creds = await GetJSONUserProperty(user_id, "smart_life_creds");
      if (!creds) {
        console.warn(
          "❌ Не знайдено облікові дані smart_life_creds для користувача:",
          user_id,
        );
        return null;
      }

      let token = creds.smart_life_token ?? "";

      // Якщо токен відсутній або порожній — отримуємо новий
      if (!token) {
        const auth = await this.SmartLifeAuth(user_id);
        token = auth?.access_token ?? "";
        if (!token) {
          console.error(
            "❌ Не вдалося отримати access_token для користувача:",
            user_id,
          );
          return null;
        }
      }

      // Виконуємо основну операцію
      let result = await this.SwitchOperation(state, device_id, token);

      // Якщо сервіс недоступний — повторюємо з новим токеном
      if (result?.header?.code === "DependentServiceUnavailable") {
        console.warn(
          "⚠️ Токен недійсний або сервіс недоступний. Отримуємо новий токен...",
        );
        const auth = await this.SmartLifeAuth(user_id);
        const newToken = auth?.access_token;

        if (newToken) {
          token = newToken;
          result = await this.SwitchOperation(state, device_id, token);
        } else {
          console.error("❌ Не вдалося оновити токен SmartLife.");
        }
      }

      return result;
    } catch (e) {
      logger.error("❌ Помилка у SwitchControl:", e);
      return null;
    }
  }

  async SwitchOperation(
    state = 1,
    device_id = "bff28e79102f946f53yqoh",
    token = "234",
  ) {
    const url = "https://px1.tuyaeu.com/homeassistant/skill";

    const headers = {
      "Content-Type": "application/json",
    };

    const payload = {
      header: {
        name: "turnOnOff",
        namespace: "control",
        payloadVersion: 1,
      },
      payload: {
        accessToken: token,
        devId: device_id,
        value: state,
      },
    };

    const options = {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    };

    logger.debug(options);

    const resp = await fetch(url, options);
    const response = await resp.json();
    logger.debug(response);

    return response;
  }

  async Discovery(user_id = "U0891JULK4M") {
    try {
      const creds = await GetJSONUserProperty(user_id, "smart_life_creds");
      if (!creds) {
        console.warn(
          "❌ Не знайдено облікові дані smart_life_creds для користувача:",
          user_id,
        );
        return null;
      }

      let token = "";

        const auth = await this.SmartLifeAuth(user_id);
        token = auth?.access_token ?? "";
        if (!token) {
          console.error(
            "❌ Не вдалося отримати access_token для користувача:",
            user_id,
          );
          return null;
        }
      
      const url = "https://px1.tuyaeu.com/homeassistant/skill";

      const headers = {
        "Content-Type": "application/json",
      };


      const payload = {
        header: {
          name: "Discovery",
          namespace: "discovery",
          payloadVersion: 1,
        },
        payload: {
          accessToken: token

        },
      };

      const options = {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      };

      logger.debug(options);

      const resp = await fetch(url, options);
      const response = await resp.json();
      logger.debug(response);

      return response;
    } catch (e) {
      console.error(
        "❌ Discovery error for user:",
        user_id,
      );
    }

  }

}
