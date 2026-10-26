import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { logger } from "@/logger";

/**
 * Алгоритм шифрования: AES-256-GCM (быстрый и безопасный)
 * - AES-256: симметричное шифрование с ключом 256 бит
 * - GCM: режим с аутентификацией (Galois/Counter Mode)
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Рекомендуемая длина IV для GCM
const AUTH_TAG_LENGTH = 16; // Длина тега аутентификации
const KEY_LENGTH = 32; // 256 бит = 32 байта

/**
 * Получает ключ шифрования из переменных окружения
 * Ключ должен быть base64-строкой длиной 32 байта (256 бит)
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. Please generate a key using: openssl rand -base64 32",
    );
  }

  try {
    const keyBuffer = Buffer.from(key, "base64");

    if (keyBuffer.length !== KEY_LENGTH) {
      throw new Error(
        `ENCRYPTION_KEY must be ${KEY_LENGTH} bytes (256 bits). Current length: ${keyBuffer.length} bytes`,
      );
    }

    return keyBuffer;
  } catch (err) {
    logger.error("Failed to decode ENCRYPTION_KEY:", err);
    throw new Error("Invalid ENCRYPTION_KEY format. Must be base64-encoded.");
  }
}

/**
 * Шифрует текст с использованием AES-256-GCM
 * @param plainText - Текст для шифрования
 * @returns Зашифрованная строка в формате: iv:authTag:cipherText (все в base64)
 */
export function encrypt(plainText: string): string {
  try {
    const key = getEncryptionKey();

    // Генерируем случайный IV (initialization vector)
    const iv = randomBytes(IV_LENGTH);

    // Создаем шифр
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Шифруем данные
    let encrypted = cipher.update(plainText, "utf8", "base64");
    encrypted += cipher.final("base64");

    // Получаем тег аутентификации (важно для GCM)
    const authTag = cipher.getAuthTag();

    // Формат: iv:authTag:cipherText (все в base64)
    return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;
  } catch (err) {
    logger.error("Encryption failed:", err);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Дешифрует текст, зашифрованный функцией encrypt()
 * @param encryptedData - Зашифрованная строка в формате: iv:authTag:cipherText
 * @returns Расшифрованный текст
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();

    // Парсим зашифрованные данные
    const parts = encryptedData.split(":");
    if (parts.length !== 3) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(parts[0]!, "base64");
    const authTag = Buffer.from(parts[1]!, "base64");
    const cipherText = parts[2]!;

    // Создаем дешифр
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Дешифруем данные
    let decrypted = decipher.update(cipherText, "base64", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    logger.error("Decryption failed:", err);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Проверяет, является ли строка зашифрованной данными
 * (по формату iv:authTag:cipherText)
 */
export function isEncrypted(data: string): boolean {
  if (!data || typeof data !== "string") return false;

  const parts = data.split(":");
  if (parts.length !== 3) return false;

  // Проверяем что каждая часть - валидный base64
  try {
    Buffer.from(parts[0]!, "base64");
    Buffer.from(parts[1]!, "base64");
    Buffer.from(parts[2]!, "base64");
    return true;
  } catch {
    return false;
  }
}

/**
 * Генерирует новый ключ шифрования (для использования в ENCRYPTION_KEY)
 * Используйте эту функцию только для генерации нового ключа!
 */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_LENGTH).toString("base64");
}
