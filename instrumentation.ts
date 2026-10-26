export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("🔧 Server instrumentation starting...");

    // Динамический импорт планировщика
    const { scheduler } = await import("@/server/scheduler");

    try {
      await scheduler.start();
      console.log("✅ Scheduler initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize scheduler:", error);
      // Не останавливаем сервер, если планировщик не запустился
    }
  }
}
