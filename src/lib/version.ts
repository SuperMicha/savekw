/**
 * Get the current Git commit SHA and date
 * Used for displaying application version on UI
 */

export async function getVersionInfo(): Promise<{
  sha: string;
  date: string;
} | null> {
  try {
    // Получить из environment переменных установленных во время build
    const sha = process.env.NEXT_PUBLIC_GIT_SHA || "unknown";
    const date = process.env.NEXT_PUBLIC_GIT_DATE || "unknown";

    return {
      sha: sha.substring(0, 7), // Первые 7 символов SHA
      date: date,
    };
  } catch (error) {
    console.error("Error getting version info:", error);
    return null;
  }
}

/**
 * Format version string for display
 */
export function formatVersion(
  versionInfo: { sha: string; date: string } | null,
): string {
  if (!versionInfo) return "v?.?.? (unknown)";
  return `${versionInfo.sha} (${versionInfo.date})`;
}
