# Real-Time Fleet Tracking System: Architecture & Data Flow

Dokumen ini menjelaskan gambaran besar arsitektur dari Real-Time Fleet Tracking System, serta penjelasan teknis detail mengenai bagaimana data *real-time* mengalir dari *device* (Simulator) hingga divisualisasikan di Frontend (Dashboard).

---

## 1. Gambaran Besar Proyek (Big Picture)

Proyek ini adalah sebuah sistem pelacakan armada (*fleet tracking*) secara *real-time* berskala produksi. Sistem ini dirancang untuk menerima data telemetri (lokasi, kecepatan, status) dari banyak kendaraan sekaligus, memprosesnya dengan sangat cepat, dan menampilkannya di *dashboard* peta secara langsung (*live*).

Arsitektur sistem terdiri dari 5 komponen utama:
1. **GPS Simulator (Node.js)**: Bertindak sebagai "Device/IoT GPS" yang dipasang pada kendaraan. Menghasilkan data lokasi buatan yang sangat realistis dan mengirimkannya ke broker.
2. **MQTT Broker (Eclipse Mosquitto)**: Bertugas sebagai *message broker* (kurir pesan) yang menerima data dari *device* dan meneruskannya ke *backend* menggunakan protokol MQTT yang ringan dan efisien untuk IoT.
3. **Backend Server (NestJS)**: Otak dari sistem ini. Bertugas menerima data dari broker MQTT, menjalankan logika bisnis (seperti mendeteksi apakah kendaraan sedang berhenti atau berjalan), menyimpan data ke *database*, dan meneruskan data tersebut ke pengguna (*frontend*).
4. **Database & Cache (PostgreSQL & Redis)**: 
   - **Redis**: Digunakan untuk menyimpan posisi *terakhir* kendaraan di memori (*cache*). Ini sangat cepat karena *frontend* tidak perlu men-query *database* SQL yang lambat hanya untuk melihat posisi saat ini.
   - **PostgreSQL**: Digunakan untuk menyimpan *history* atau riwayat perjalanan kendaraan agar rute masa lalunya bisa dilihat kembali.
5. **Frontend Dashboard (Next.js & Leaflet)**: Antarmuka pengguna (*user interface*) berbasis web yang menampilkan peta interaktif dan pergerakan kendaraan secara langsung tanpa perlu me-*refresh* halaman.

---

## 2. Alur Kerja Data Real-Time (Data Flow)

Bagian ini menjelaskan bagaimana satu titik data lokasi bergerak dari sebuah kendaraan hingga akhirnya titik tersebut bergeser di layar *dashboard* pengguna. Proses ini biasanya terjadi dalam waktu kurang dari 1 detik.

### Fase 1: Pembuatan Data di Device (Simulator)
- **File terkait:** `simulator/src/simulator.ts`
- **Konsep:** Simulator memiliki 4 jenis kendaraan (CITY, HIGHWAY, DELIVERY, PATROL) yang masing-masing memiliki perilaku atau sifat unik (misal: mobil kota lebih sering berhenti karena lampu merah, truk di jalan tol lebih jarang berhenti).
- **Proses Teknis:**
  1. Setiap 3 detik (interval), simulator menghitung koordinat GPS baru (lat/lon) untuk setiap kendaraan berdasarkan rutenya menggunakan interpolasi matematika (pergerakan yang mulus) dan menambahkan *noise* GPS palsu agar realistis.
  2. Simulator membuat paket data JSON (berisi ID Kendaraan, Lat, Lon, Speed, Status).
  3. Menggunakan library `mqtt`, simulator mem-*publish* (mengirim) pesan JSON tersebut ke MQTT Broker pada sebuah **Topic** spesifik, yaitu: `vehicle/{vehicleId}/location` (contoh: `vehicle/VH-001/location`). Protokol MQTT sangat ringan sehingga tidak boros *bandwidth*.

### Fase 2: Pengiriman via MQTT Broker (Mosquitto)
- **Konsep:** Mosquitto berjalan di port `1883`. Ia bertindak seperti kantor pos. Ia menerima paket dari Fase 1 dan mencari tahu siapa yang "berlangganan" (*subscribe*) untuk menerima paket tersebut.
- Karena *Backend* sudah mendaftar untuk berlangganan topik tersebut, broker segera mengirimkannya ke *Backend*.

### Fase 3: Pemrosesan di Backend Server (NestJS)
- **File terkait:** `tracking.mqtt.ts`, `tracking.service.ts`, `tracking.gateway.ts`
- **Proses Teknis:**
  1. **MQTT Consumer (`tracking.mqtt.ts`)**: Backend secara terus-menerus mendengarkan topik *wildcard* `vehicle/+/location` (tanda `+` berarti "kendaraan apapun"). Ketika pesan masuk, backend menangkap, membaca JSON-nya, dan melakukan validasi (memastikan formatnya benar).
  2. **Logika Bisnis (`tracking.service.ts`)**: Data lokasi ini diproses:
     - **Algoritma Stop Detection**: Backend mengecek, "Apakah kecepatan kendaraan < 5 km/jam selama lebih dari 2 menit?". Jika iya, statusnya diubah menjadi `STOPPED`. Jika tidak, statusnya `MOVING`.
     - **Caching ke Redis**: Posisi baru yang sudah diproses ini langsung ditimpa (disimpan) ke Redis. Jadi, jika ada pengguna baru membuka web, server tinggal mengambil dari Redis tanpa perlu membebani PostgreSQL.
     - **Penyimpanan History**: Secara *asynchronous*, posisi ini juga di-*insert* ke dalam PostgreSQL untuk keperluan pelacakan riwayat di kemudian hari.
  3. **WebSocket Gateway (`tracking.gateway.ts`)**: Setelah diproses dan disimpan, layanan memanggil *Gateway*. *Gateway* ini menggunakan teknologi **Socket.IO** (di port `3000`) untuk mengirim pesan siaran (*broadcast*). Server akan meng-emit *event* bernama `vehicle:update` yang berisi paket lokasi terbaru ke **semua* pengguna *frontend* yang sedang terhubung melalui koneksi WebSocket.

### Fase 4: Visualisasi di Frontend (Next.js)
- **File terkait:** `useFleetSocket.ts`, `FleetMapInner.tsx`
- **Konsep:** *Frontend* menggunakan koneksi WebSocket yang sifatnya *persistent* (terbuka terus menerus) dengan *Backend*. Jadi *frontend* tidak perlu menanyakan "apakah ada data baru?" ke server, melainkan server yang langsung mengirim atau "menyuapi" data tersebut saat terjadi.
- **Proses Teknis:**
  1. **Socket Listener (`useFleetSocket.ts`)**: *Hook* React ini secara diam-diam mendengarkan *event* `vehicle:update` dari *Backend*.
  2. **Update State**: Begitu ada paket data masuk dari WebSocket, *hook* ini akan memperbarui `state` (Map of vehicles) di dalam React.
  3. **Re-render Peta (`FleetMapInner.tsx`)**: Karena `state` berubah (ada koordinat baru untuk mobil VH-001), React secara otomatis me-*render* ulang komponen peta. Library **Leaflet.js** akan mengambil koordinat baru tersebut dan menggeser ikon penanda (*marker*) mobil di atas peta secara instan.

---

## Ringkasan Alur (Summary Diagram)

```text
[ Simulator ] --(MQTT: Port 1883, setiap 3s)--> [ Mosquitto Broker ]
                                                        |
                                                        v
[ Redis ] <--(Simpan Cache Tercepat)-- [ Backend Server (NestJS) ] --(Simpan Riwayat)--> [ PostgreSQL ]
                                                        |
                                                        | (Broadcast Event: "vehicle:update")
                                                        v
                                         (WebSocket via Socket.IO: Port 3000)
                                                        |
                                                        v
                                       [ Frontend Dashboard (Next.js) ]
                                          (Ikon di peta langsung bergeser)
```

Arsitektur berbasis *Event-Driven* (MQTT + WebSocket) ini sangat *scalable* (mudah diperbesar) dan memastikan delay (*latency*) dari pergerakan mobil hingga terlihat di layar hanya terjadi dalam hitungan milidetik.

---

## 3. AV Sensor Dashboard — Autonomous Vehicle Data Visualization

Selain fleet tracking, sistem ini juga mendukung visualisasi data sensor kendaraan otonom dari dataset **nuScenes**.

### Konsep

nuScenes adalah dataset real-world dari kendaraan otonom yang merekam perjalanan di Boston dan Singapore. Dataset ini berisi:
- **Ego Pose (GPS)**: Posisi kendaraan dalam koordinat meter lokal
- **6 Kamera**: Front, Front-Left, Front-Right, Back, Back-Left, Back-Right  
- **LiDAR**: Point cloud dari sensor LiDAR di atap kendaraan
- **Radar**: Data radar dari 5 sensor (tidak divisualisasikan saat ini)

### Alur Data AV Sensor

```text
nuScenes files (disk)
        ↓
Python Replayer — baca file, kirim tiap ~500ms
        ↓  
MQTT Broker (Mosquitto) — message queue
        ↓
NestJS Backend (AvSensorModule) — receive, process, forward
        ↓
WebSocket (Socket.IO, namespace: /av) — real-time ke browser
        ↓
Next.js Dashboard (/av) — tampilkan visual
```

### MQTT Topics (AV Sensor)

| Topic | Deskripsi | Payload |
|-------|-----------|---------|
| `vehicle/gps` | Posisi ego vehicle | `{lat, lon, altitude, heading, speed_kph, frame, scene, location}` |
| `vehicle/camera/CAM_*` | Frame kamera (6 channel) | `{camera, image (base64), timestamp, frame}` |
| `vehicle/lidar` | LiDAR point cloud | `{points [[x,y,z,intensity]...], timestamp, frame}` |
| `vehicle/status` | Status replay | `{scene, frame, total, pct, status}` |

### Komponen Backend (AvSensorModule)

- **`av-sensor.mqtt.ts`**: Subscribe ke topic AV sensor, validasi payload
- **`av-sensor.service.ts`**: Transform data, cache ke Redis, emit ke WebSocket
- **`av-sensor.gateway.ts`**: WebSocket gateway di namespace `/av`
- **`av-sensor.controller.ts`**: REST endpoint untuk state awal

### Komponen Frontend

- **`/app/av/page.tsx`**: Dashboard utama AV Sensor
- **`CameraGrid.tsx`**: Grid 6 kamera (2 baris x 3 kolom)
- **`LidarView.tsx`**: Visualisasi LiDAR point cloud (canvas)
- **`StatusPanel.tsx`**: Info GPS dan status replay
- **`AvMiniMap.tsx`**: Peta mini dengan posisi kendaraan

### Cara Menjalankan

```bash
# 1. Install dependencies replayer
cd replayer
pip install -r requirements.txt

# 2. Jalankan MQTT broker
docker-compose up -d mosquitto

# 3. Jalankan backend
cd backend && npm run start:dev

# 4. Jalankan frontend
cd frontend && npm run dev

# 5. Jalankan replayer
cd replayer
python nuscenes_replayer.py --scene 0 --loop
```

Dashboard AV tersedia di: `http://localhost:3001/av`
