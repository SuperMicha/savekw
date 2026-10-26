-- CreateTable
CREATE TABLE IF NOT EXISTS "UserProperties" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "property" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProperties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "imageData" TEXT,
    "imageName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "device_statuses" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "device_type" TEXT NOT NULL,
    "device_id" TEXT,
    "status" TEXT,
    "last_control_time" TEXT,

    CONSTRAINT "device_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "syslog" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userid" TEXT,
    "source" TEXT,
    "type" TEXT,
    "valuename" TEXT,
    "previousvalue" TEXT,
    "currentvalue" TEXT,

    CONSTRAINT "syslog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserProperties_userId_idx" ON "UserProperties"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserProperties_property_idx" ON "UserProperties"("property");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserProperties_userId_property_key" ON "UserProperties"("userId", "property");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "system_settings_key_idx" ON "system_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "device_statuses_user_device_unique" ON "device_statuses"("user_id", "device_type", "device_id");
