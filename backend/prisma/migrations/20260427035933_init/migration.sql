-- CreateEnum
CREATE TYPE "Status" AS ENUM ('MOVING', 'STOPPED');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plate" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_points" (
    "id" SERIAL NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "lat" DECIMAL(10,7) NOT NULL,
    "lon" DECIMAL(10,7) NOT NULL,
    "speed" DECIMAL(5,2) NOT NULL,
    "heading" DECIMAL(5,2) NOT NULL,
    "status" "Status" NOT NULL DEFAULT 'MOVING',
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tracking_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tracking_points_vehicle_id_timestamp_idx" ON "tracking_points"("vehicle_id", "timestamp");

-- AddForeignKey
ALTER TABLE "tracking_points" ADD CONSTRAINT "tracking_points_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
