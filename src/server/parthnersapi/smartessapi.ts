import crypto from "crypto";
import {
  AddSystemLog,
  GetSystemSetting,
  GetDeviceId,
  setUserProperty,
  GetJSONUserProperty,
} from "@/server/databaseapi";
import { logger } from "@/logger";
import type { init } from "next/dist/compiled/webpack/webpack";
export class Smartessapi {
  private baseUrl: string | undefined;
  private companyKey: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor() { }

  async init() {
    this.baseUrl = await GetSystemSetting("dessmonitor_url");
    this.companyKey = await GetSystemSetting("dessmonitor_comp_key");
  }
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  execute() { }

  async setParameter(user_id = "", device_id = "", parameter = "", value = "") {
    const creds = await GetJSONUserProperty(user_id, "smart_ess_creds");
    const token = creds.smart_ess_token;
    const secret = creds.smart_ess_secret;
    const devices = await GetJSONUserProperty(user_id, "smart_ess_devices");
    // const device = Array.isArray(devices) ? devices.find((o: { pn: any; }) => o.pn == device_id) : undefined;
    const device = Array.isArray(devices)
      ? devices.find((o: { sn: any }) => o.sn == device_id)
      : undefined;

    logger.debug("Device to control:", device);

    const output_priority_id = (
      await GetJSONUserProperty(user_id, "output_priority_options")
    )?.id;
    const charge_source_priority_options = (
      await GetJSONUserProperty(user_id, "charge_source_priority_options")
    )?.id;
    logger.debug(output_priority_id);
    logger.debug(charge_source_priority_options);
    let parameter_id = "";
    if (parameter == "output_priority") parameter_id = output_priority_id;
    if (parameter == "charge_priority")
      parameter_id = charge_source_priority_options;

    const action =
      "&action=ctrlDevice&source=1&pn=" +
      device.pn +
      "&sn=" +
      device.sn +
      "&devcode=" +
      device.devcode +
      "&devaddr=" +
      device.devaddr +
      "&id=" +
      parameter_id +
      "&val=" +
      value +
      "&i18n=en_US";
    logger.debug(action);
    const salt = this.getSalt();
    const sign = this.toSHA1(salt + secret + token + action);
    logger.debug(sign);
    const url =
      this.baseUrl +
      "?sign=" +
      sign +
      "&salt=" +
      salt +
      "&token=" +
      token +
      action;
    logger.debug("!url ", JSON.stringify(url));
    const resp = await fetch(url, { method: "get" });
    const response = await resp.json();

    logger.debug(`3Web API response: `, JSON.stringify(response));
    return response;
  }

  async setMode(
    user_id = "",
    device_id = "",
    out_priority = "",
    charge_priority = "",
  ) {
    logger.debug(
      "sendInvertorCommand: user_id: '",
      user_id,
      "', out_priority: '",
      out_priority,
      "'",
    );
    logger.debug(
      "sendInvertorCommand: user_id: '",
      user_id,
      "', charge_priority: '",
      charge_priority,
      "'",
    );

    let resp = await this.setParameter(
      user_id,
      device_id,
      "output_priority",
      out_priority,
    );
    logger.debug(resp);
    if (resp.err != 0) {
      await this.authRequest(user_id);
      resp = await this.setParameter(
        user_id,
        device_id,
        "output_priority",
        out_priority,
      );
    }
    let resp_1;
    if (charge_priority != null)
      resp_1 = await this.setParameter(
        user_id,
        device_id,
        "charge_priority",
        charge_priority,
      );

    if (resp.err == 0 && resp_1.err == 0) {
      logger.debug(
        "Встановлено режим виходу інвертора: output priority: " +
        out_priority +
        " charge priority:" +
        charge_priority,
      );
      const out_pr = await this.InvStatus(
        user_id,
        "output_priority_options",
        out_priority,
      );
      const charge_pr = await this.InvStatus(
        user_id,
        "charge_source_priority_options",
        charge_priority,
      );
      logger.debug("Успішно встановлено");
      await AddSystemLog(
        user_id,
        "Управління інвертором",
        "Зміна",
        "Режим інвертора: output priority",
        "",
        out_pr,
      );
      await AddSystemLog(
        user_id,
        "Управління інвертором",
        "Зміна",
        "Режим інвертора:charge priority",
        "",
        charge_pr,
      );
      return true;
    } else {
      logger.error("Помилка встановлення параметрів інвертора");
      if (resp.err != 0)
        await AddSystemLog(
          user_id,
          "Управління інвертором",
          "⚠️Помилка",
          "Режим інвертора: output priority",
          "",
          resp.err,
        );
      if (resp_1.err != 0)
        await AddSystemLog(
          user_id,
          "Управління інвертором",
          "⚠️Помилка",
          "Режим інвертора: charge priority",
          "",
          resp_1.err,
        );
      return false;
    }
  }

  async InvStatus(user_id = "", parameter_name = "", key = "") {
    const fields = await GetJSONUserProperty(user_id, parameter_name);

    logger.debug(fields);
    const val = fields?.item?.find((o: { key: string }) => o.key == key)?.val;
    logger.debug(val);
    return val;
  }

  getSalt() {
    logger.debug("getSalt");
    const salt = new Date().getTime().toFixed(0);
    logger.debug(salt);
    return salt;
  }

  async authRequest(user_id = "") {
    try {
      logger.debug("authRequest start:", user_id);

      const creds = await GetJSONUserProperty(user_id, "smart_ess_creds");
      if (!creds) {
        logger.error(
          "❌ Не знайдено smart_ess_creds для користувача:",
          user_id,
        );
        return { err: 1, desc: "Credentials not found" };
      }

      const usr = creds.smart_ess_user;
      const pwd = creds.smart_ess_pswd;

      if (!usr || !pwd) {
        logger.error("❌ Невірні облікові дані користувача:", creds);
        return { err: 1, desc: "Invalid credentials" };
      }

      logger.debug("usr:", usr);
      logger.debug("pwd:", pwd);
      logger.debug("companyKey:", this.companyKey);
      logger.debug("baseUrl:", this.baseUrl);

      // 🔹 SHA1 пароля
      const sha1Pwd = this.toSHA1(pwd);
      logger.debug("sha1Pwd:", sha1Pwd);

      // 🔹 Формуємо підпис
      const action = `&action=authSource&usr=${usr}&source=1&company-key=${this.companyKey}`;
      const salt = this.getSalt
        ? this.getSalt()
        : crypto.randomBytes(8).toString("hex");
      const sign = this.toSHA1(salt + sha1Pwd + action);

      logger.debug("salt:", salt);
      logger.debug("sign:", sign);

      // 🔹 Формуємо URL
      const url = `${this.baseUrl}?sign=${sign}&salt=${salt}${action}`;
      logger.debug("url:", url);

      // 🔹 Виконуємо запит
      const data = await fetch(url);
      const response = await data.json();

      logger.debug("response:", response);

      // 🔹 Якщо успішно — зберігаємо токен
      if (response.err === 0 && response.dat) {
        creds.smart_ess_token = response.dat.token;
        creds.smart_ess_secret = response.dat.secret;
        await setUserProperty(user_id, "smart_ess_creds", creds);
        await AddSystemLog(
          user_id,
          "Управління інвертором",
          "Аутентифікація",
          "Отримання токену",
          "",
          "Успішно",
        );
        logger.info(`✅ Аутентифікація успішна для ${user_id}`);
      } else {
        logger.warn("⚠️ Помилка аутентифікації:", response);
      }

      return response;
    } catch (err) {
      logger.error("❌ authRequest error:", err);
      await AddSystemLog(
        user_id,
        "Управління інвертором",
        "Помилка",
        "Аутентифікація",
        "",
        "Помилка виконання",
      );
      return { err: 1, desc: "Exception during authentication", detail: err };
    }
  }

  toSHA1(text = ""): string {
    logger.debug("toSHA1 input:", text);

    // Отримуємо хеш у вигляді Buffer
    const hashBuffer = crypto.createHash("sha1").update(text).digest();

    // Конвертуємо кожен байт у вісімкове представлення
    let txtHash = "";
    for (const byte of hashBuffer) {
      const octal = byte.toString(16).padStart(2, "0");
      txtHash += octal;
    }

    logger.debug("toSHA1 result:", txtHash);
    return txtHash;
  }

  async Discovery(user_id = "") {
    logger.debug("Discovery: ", user_id);
    //const device_pn = await GetDeviceId(user_id, "invertor");
    const device_sn = await GetDeviceId(user_id, "invertor");
    logger.debug("device_pn: ", device_sn);
    const try_count = 3;
    for (let i = 0; i < try_count; i++) {
      const response = await this.GetESSdevices(user_id);
      logger.debug("Get Devices: ", JSON.stringify(response));
      if (response.err == 0) {
        //const filtered_device = response.dat.device.find((o: { pn: any; }) => o.pn == device_pn);
        const filtered_device = response.dat.device.find(
          (o: { sn: any }) => o.sn == device_sn,
        );
        logger.debug("filtered Devices: ", JSON.stringify(filtered_device));
        if (filtered_device == null) {
          logger.error("Not found");
          return 0;
        }
        await this.GetDeviceControlFields(
          user_id,
          filtered_device.pn,
          filtered_device.sn,
          filtered_device.devcode,
          filtered_device.devaddr,
        );
        await AddSystemLog(
          user_id,
          "Управління інвертором",
          "Зміна",
          "Отримання переліку інверторів",
          "",
          "Успішно",
        );

        return true;
      } else {
        await AddSystemLog(
          user_id,
          "Управління інвертором",
          "⚠️Помилка",
          "Отримання переліку інверторів",
          "",
          response.err,
        );
      }
    }
    return false;
  }

  async GetPvChart(user_id = "", date: string) {
    //logger.debug("GetPvchart: user_id: '", user_id);

    const creds = await GetJSONUserProperty(user_id, "smart_ess_creds");
    const pwd = creds.smart_ess_pswd;

    const token = creds.smart_ess_token;
    const secret = creds.smart_ess_secret;

    const device_id = await GetDeviceId(user_id, "invertor");
    const devices = await GetJSONUserProperty(user_id, "smart_ess_devices");
    // const device = Array.isArray(devices) ? devices.find((o: { pn: any; }) => o.pn == device_id) : undefined;
    const device = Array.isArray(devices)
      ? devices.find((o: { sn: any }) => o.sn == device_id)
      : undefined;

    const action =
      "&action=querySPDeviceKeyParameterOneDay&source=1&pn=" +
      device.pn +
      "&sn=" +
      device.sn +
      "&devcode=" +
      device.devcode +
      "&devaddr=" +
      device.devaddr +
      "&i18n=en_US&parameter=PV_OUTPUT_POWER&chartStatus=false&date=" +
      date;
    const salt = this.getSalt();
    const sign = this.toSHA1(salt + secret + token + action);
    logger.debug("sign", sign);
    const url =
      this.baseUrl +
      "?sign=" +
      sign +
      "&salt=" +
      salt +
      "&token=" +
      token +
      action;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const response = await resp.json(); // сразу объект, JSON.parse не нужен
    logger.debug(`2Web API response:`, JSON.stringify(response));
    if (response.err != 0) {
      await this.authRequest(user_id);
    } else {
      if (response.dat.detail == null) {
        logger.error("No PV data for date ", date);
        await AddSystemLog(
          user_id,
          "Управління інвертором",
          "⚠️Помилка",
          "Отримання графіку сонячної активності",
          "",
          response.err,
        );

        return null;
      }
      // Створюємо об'єкт з даними та датою останнього оновлення
      const sunActivityData = {
        data: response.dat.detail,
        last_update: new Date().toISOString().slice(0, 19).replace("T", " "),
      };
      await setUserProperty(
        user_id,
        "sun_activity",
        JSON.stringify(sunActivityData),
      );
      await AddSystemLog(
        user_id,
        "Управління інвертором",
        "Зміна",
        "Отримання графіку сонячної активності",
        "",
        "Успішно",
      );
      const algorithms = await GetJSONUserProperty(user_id, "algorithms");

      if (algorithms) {
        if (algorithms.general_settings?.autodetect_active_solar_timeframe) {
          logger.debug("Auto-detecting solar activity timeframe...");

          const result = this.getSolarActivityPeriod(sunActivityData);
          logger.debug("Solar activity period detected:", result);

          if (result.start && result.end) {
            algorithms.general_settings.active_solar_start = result.start;
            algorithms.general_settings.active_solar_end = result.end;

            await setUserProperty(
              user_id,
              "algorithms",
              JSON.stringify(algorithms),
            );

            logger.debug(
              `Solar activity period for user ${user_id}: start=${result.start}, end=${result.end}`,
            );
          } else {
            logger.warn(
              `No solar activity detected for user ${user_id}. Skipping update.`,
            );
          }
        }
      }

      return response.dat.detail;
    }
  }

  getSolarActivityPeriod(input: { data: any }) {
    const data = input.data;

    // Фільтруємо та перетворюємо значення у числа
    const parsed = data.map((d: { val: string; ts: any }) => ({
      val: parseFloat(d.val),
      ts: d.ts,
    }));

    // Знаходимо перший і останній момент, коли val > 0
    const activePoints = parsed.filter((p: { val: number }) => p.val > 0);

    if (activePoints.length === 0) {
      return { start: null, end: null }; // сонячної активності не було
    }

    // Беремо перший і останній момент активності
    const startDate = new Date(activePoints[0].ts);
    const endDate = new Date(activePoints[activePoints.length - 1].ts);

    const startHour = startDate.getHours(); // ціла година початку
    const endHour = endDate.getHours(); // ціла година кінця

    return { start: startHour, end: endHour };
  }

  async GetESSdevices(user_id = "") {
    logger.debug("GetESSdevices: ", user_id);
    const rsp = await this.authRequest(user_id);
    if (rsp.err != 0) return rsp;

    const creds = await GetJSONUserProperty(user_id, "smart_ess_creds");
    const token = creds.smart_ess_token;
    const secret = creds.smart_ess_secret;
    logger.debug("baseUrl ", this.baseUrl);
    logger.debug("token ", token);
    logger.debug("secret ", secret);

    const action =
      "&action=webQueryDeviceEs&source=1&devtype=2304&page=0&pagesize=500";
    const salt = this.getSalt();
    const sign = this.toSHA1(salt + secret + token + action);
    logger.debug("salt", salt);
    logger.debug("sign", sign);
    const url =
      this.baseUrl +
      "?sign=" +
      sign +
      "&salt=" +
      salt +
      "&token=" +
      token +
      action;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const response = await resp.json();
    logger.debug(`1Web API response: `, JSON.stringify(response));

    if (response.err != 0) {
      // this.authRequest(user_id);
    } else {
      await setUserProperty(user_id, "smart_ess_devices", response.dat.device);
    }

    return response;
  }

  async GetDeviceControlFields(
    user_id = "",
    pn = "",
    sn = "",
    devcode = "",
    devaddr = "",
  ) {
    logger.debug(
      "GetDeviceControlFields: user_id: '",
      user_id,
      "', pn: '",
      pn,
      "' sn: '",
      sn,
      "'devcode: '",
      devcode,
      "'devaddr: '",
      devaddr,
    );

    const creds = await GetJSONUserProperty(user_id, "smart_ess_creds");
    const pwd = creds.smart_ess_pswd;

    const token = creds.smart_ess_token;
    const secret = creds.smart_ess_secret;
    const action =
      "&action=queryDeviceCtrlField&source=1&pn=" +
      pn +
      "&sn=" +
      sn +
      "&devcode=" +
      devcode +
      "&devaddr=" +
      devaddr +
      "&i18n=en_US";
    const salt = this.getSalt();
    const sign = this.toSHA1(salt + secret + token + action);
    logger.debug("sign", sign);
    const url =
      this.baseUrl +
      "?sign=" +
      sign +
      "&salt=" +
      salt +
      "&token=" +
      token +
      action;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    logger.debug("url", url);
    const response = await resp.json(); // сразу объект, JSON.parse не нужен
    logger.debug(`2Web API response:`, JSON.stringify(response));
    if (response.err != 0) {
      await this.authRequest(user_id);
    } else {
      await setUserProperty(user_id, "smart_ess_fields", response.dat.field);
      const out_priority = await this.FindFields(user_id, [
        "Output priority",
        "Output source priority",
      ]);
      const charge_priority = await this.FindFields(user_id, [
        "Charge priority",
      ]);
      logger.debug("Found out_priority", out_priority);
      logger.debug("Found charge_priority", charge_priority);

      await setUserProperty(user_id, "output_priority_options", out_priority);
      await setUserProperty(
        user_id,
        "charge_source_priority_options",
        charge_priority,
      );
    }
    return response;
  }

  async GetField_1(user_id = "", field_name = "", key = "") {
    logger.debug(
      "GetField_1: user_id: '",
      user_id,
      "', field_name: '",
      field_name,
      "key: '",
      key,
      "'",
    );
    const fields = await GetJSONUserProperty(user_id, "smart_ess_fields");
    const field = this.findClosestObject(fields, field_name);
    logger.debug("field", field);
    const id = field.id;
    logger.debug("id", id);
    const retval = { id: id, key: key };
    logger.debug("retval:", retval);
    return retval;
  }

  async FindFields(user_id = "U099MM2K874", field_names = ["Output priority"]) {
    const fields = await GetJSONUserProperty(user_id, "smart_ess_fields");

    // Якщо користувач передав один рядок — перетворимо його на масив
    if (!Array.isArray(field_names)) {
      field_names = [field_names];
    }

    let field = null;

    // Перебираємо всі можливі назви, шукаємо найближчу
    for (const fieldName of field_names) {
      field = this.findClosestObject(fields, fieldName);
      if (field) {
        break; // якщо знайшли — зупиняємось
      }
    }

    if (!field) {
      logger.error(
        "Поле не знайдено для жодної з назв: " + field_names.join(", "),
      );
      return null;
    }

    logger.debug(field);

    return field;
  }

  async setField(user_id = "", field_name = "", value = "") {
    logger.debug(
      "setField: user_id: '",
      user_id,
      "', field_name: '",
      field_name,
      "', value:",
      value,
      "'",
    );

    const creds = await GetJSONUserProperty(user_id, "smart_ess_creds");
    const token = creds.smart_ess_token;
    const secret = creds.smart_ess_secret;
    const device_id = await GetDeviceId(user_id, "invertor");

    const devices = await GetJSONUserProperty(user_id, "smart_ess_devices");
    //const device = Array.isArray(devices) ? devices.find((o: { pn: any; }) => o.pn == device_id) : undefined;
    const device = Array.isArray(devices)
      ? devices.find((o: { sn: any }) => o.sn == device_id)
      : undefined;

    logger.debug("Device to control:", device);
    const command = await this.GetField_1(user_id, field_name, value);
    const command_id = command.id;
    value = command.key;
    logger.debug("Command: ", command);
    const action =
      "&action=ctrlDevice&source=1&pn=" +
      device.pn +
      "&sn=" +
      device.sn +
      "&devcode=" +
      device.devcode +
      "&devaddr=" +
      device.devaddr +
      "&id=" +
      command_id +
      "&val=" +
      value +
      "&i18n=en_US";
    logger.debug(action);
    const salt = this.getSalt();
    const sign = this.toSHA1(salt + secret + token + action);
    logger.debug(sign);
    const url =
      this.baseUrl +
      "?sign=" +
      sign +
      "&salt=" +
      salt +
      "&token=" +
      token +
      action;
    logger.debug("!url ", JSON.stringify(url));
    const resp = await fetch(url, { method: "get" });
    const response = await resp.json();

    logger.debug(`3Web API response: `, JSON.stringify(response));
    return response;
  }

  findClosestObject(dataArray: any, target: string | undefined) {
    logger.debug(
      "findClosestObject: dataArray: ",
      dataArray,
      "target: ",
      target,
    );
    //const target = "Output Priority";
    let bestMatch = null;
    let bestSimilarity = 0;
    const targetStr = (target ?? "").toString().toLowerCase();
    for (const obj of dataArray) {
      if (!obj.name) continue;
      const name = obj.name.toLowerCase();
      const similarity = this.calculateSimilarity(name, targetStr);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = obj;
      }
    }
    // Порог подібності — можеш змінити (0.6 = 60%)
    return bestSimilarity > 0.6 ? bestMatch : null;
  }

  // Levenshtein подібність від 0 до 1
  calculateSimilarity(a: string | any[], b: string | any[]) {
    const distance = this.levenshteinDistance(a, b) || 0;
    return 1 - distance / Math.max(a.length, b.length);
  }

  // Обчислення відстані Левенштейна між рядками або масивами

  levenshteinDistance(a: string | any[] = [], b: string | any[] = []): number {
    const arrA: any[] = typeof a === "string" ? a.split("") : a;
    const arrB: any[] = typeof b === "string" ? b.split("") : b;

    const lenA = arrA.length;
    const lenB = arrB.length;

    // Ініціалізація матриці з заповненими числами 0 (TS гарантовано знає, що елементи існують)
    const matrix: number[][] = Array.from({ length: lenB + 1 }, () =>
      Array(lenA + 1).fill(0),
    );

    // Заповнюємо перший рядок і перший стовпець
    for (let i = 0; i <= lenB; i++) {
      matrix[i]![0] = i; // non-null assertion — каже TS: "я впевнений, що це існує"
    }
    for (let j = 0; j <= lenA; j++) {
      matrix[0]![j] = j;
    }

    // Основний цикл обчислення
    for (let i = 1; i <= lenB; i++) {
      for (let j = 1; j <= lenA; j++) {
        const cost = arrB[i - 1] === arrA[j - 1] ? 0 : 1;

        const deletion = matrix[i - 1]![j]! + 1;
        const insertion = matrix[i]![j - 1]! + 1;
        const substitution = matrix[i - 1]![j - 1]! + cost;

        matrix[i]![j] = Math.min(deletion, insertion, substitution);
      }
    }

    return matrix[lenB]![lenA]!;
  }

  async GetESSdata(user_id = "") {
    //logger.debug("GetPvchart: user_id: '", user_id);

    const creds = await GetJSONUserProperty(user_id, "smart_ess_creds");
    const pwd = creds.smart_ess_pswd;

    const token = creds.smart_ess_token;
    const secret = creds.smart_ess_secret;

    const device_id = await GetDeviceId(user_id, "invertor");
    const devices = await GetJSONUserProperty(user_id, "smart_ess_devices");
    // const device = Array.isArray(devices) ? devices.find((o: { pn: any; }) => o.pn == device_id) : undefined;
    const device = Array.isArray(devices)
      ? devices.find((o: { sn: any }) => o.sn == device_id)
      : undefined;

    const action =
      "&action=querySPDeviceLastData&source=1&pn=" +
      device.pn +
      "&sn=" +
      device.sn +
      "&devcode=" +
      device.devcode +
      "&devaddr=" +
      device.devaddr +
      "&i18n=en_US"
    const salt = this.getSalt();
    const sign = this.toSHA1(salt + secret + token + action);
    logger.debug("sign", sign);
    const url =
      this.baseUrl +
      "?sign=" +
      sign +
      "&salt=" +
      salt +
      "&token=" +
      token +
      action;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const response = await resp.json(); // сразу объект, JSON.parse не нужен
    logger.debug(`2Web API response:`, JSON.stringify(response));
    if (response.err != 0) {
      await this.authRequest(user_id);
    } else {
      if (response.dat.pars== null) {
       
        await AddSystemLog(
          user_id,
          "Управління інвертором",
          "⚠️Помилка",
          "Отримання інформації про мережу",
          "",
          response.err,
        );

        //return null;
      }

      return response;
    }
  }

  GetGridValue(response: any, parameter_name = "Grid Voltage") {

    const data = response?.dat?.pars?.gd_;

    if (!Array.isArray(data)) return 0;

    const parameter = data.find(o => o.par === parameter_name);
    if (!parameter || parameter.val == null) return 0;

    return parameter.val;
  }
}
