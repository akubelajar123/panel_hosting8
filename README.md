# Panduan Instalasi Panel Hosting Otomatis (Docker Compose)

Oleh: Manus AI

## Pendahuluan

Skrip ini dirancang untuk mengotomatisasi proses instalasi panel hosting Anda di Virtual Private Server (VPS) menggunakan Docker dan Docker Compose. Dengan skrip ini, Anda dapat menginstal semua komponen yang diperlukan, termasuk backend (Python/Flask), frontend (React), dan database PostgreSQL, dengan mudah dan minim intervensi manual. Pendekatan berbasis Docker Compose memastikan lingkungan yang konsisten dan terisolasi, mengurangi potensi konflik dependensi dan menyederhanakan manajemen aplikasi.

## Prasyarat Sistem

Sebelum menjalankan skrip instalasi, pastikan VPS Anda memenuhi persyaratan minimum berikut:

*   **Sistem Operasi:** Ubuntu 20.04 LTS atau yang lebih baru (direkomendasikan Ubuntu 22.04 LTS).
*   **RAM:** Minimal 2GB (disarankan 4GB atau lebih untuk performa optimal).
*   **Penyimpanan:** Minimal 5GB ruang kosong (disarankan 50GB+ SSD untuk produksi).
*   **Koneksi Internet:** Stabil dan cepat untuk mengunduh paket dan image Docker.
*   **Akses Root/Sudo:** Anda harus memiliki akses `sudo` ke server untuk menginstal Docker dan Docker Compose.

Skrip ini akan secara otomatis memeriksa dan menginstal Docker serta Docker Compose jika belum terdeteksi di sistem Anda. Namun, pastikan Anda memiliki konektivitas internet yang memadai selama proses ini.

## Cara Penggunaan

Ikuti langkah-langkah di bawah ini untuk menginstal panel hosting Anda:

### Langkah 1: Unduh Skrip Instalasi

Salin skrip `install.sh` ke VPS Anda. Anda bisa menggunakan `wget` atau `curl` jika skrip dihosting di suatu tempat, atau mengunggahnya secara manual menggunakan SFTP.

Misalnya, jika Anda mengunggahnya ke direktori home Anda:

```bash
cd ~
# Pastikan skrip install.sh sudah ada di sini
```

### Langkah 2: Berikan Izin Eksekusi

Berikan izin eksekusi pada skrip agar dapat dijalankan:

```bash
chmod +x install.sh
```

### Langkah 3: Jalankan Skrip Instalasi

Jalankan skrip dengan hak akses `sudo`:

```bash
sudo ./install.sh
```

Skrip akan melakukan hal-hal berikut:

1.  Memeriksa keberadaan Docker dan Docker Compose. Jika tidak ada, skrip akan menginstalnya secara otomatis.
2.  Menyalin file panel hosting ke `/opt/hosting-panel`.
3.  Membuat file `docker-compose.yaml` yang diperlukan untuk menjalankan layanan.
4.  Membangun image Docker untuk backend dan frontend.
5.  Menjalankan semua layanan (backend, frontend, database) dalam mode `detached` (di latar belakang).
6.  Membersihkan file instalasi sementara.

Proses ini mungkin memakan waktu beberapa menit, tergantung pada kecepatan internet dan spesifikasi VPS Anda. Anda akan melihat output di terminal yang menunjukkan progres instalasi.

## Setelah Instalasi Berhasil

Setelah skrip selesai berjalan, panel hosting Anda seharusnya sudah aktif dan dapat diakses. Anda mungkin perlu menunggu beberapa menit agar semua layanan di dalam kontainer Docker berjalan sepenuhnya.

*   **Akses Panel:** Buka browser web Anda dan navigasikan ke alamat IP VPS Anda atau nama domain yang telah Anda arahkan ke VPS tersebut (jika sudah dikonfigurasi).

    Contoh: `http://your_vps_ip_address` atau `http://your_domain.com`

*   **Kredensial Login Default:**
    *   **Username:** `admin`
    *   **Password:** `admin123`

    **PENTING:** Segera ubah kredensial login default setelah login pertama kali untuk alasan keamanan.

## Manajemen Layanan Docker

Anda dapat mengelola layanan panel hosting menggunakan perintah `docker compose` dari direktori instalasi (`/opt/hosting-panel`).

*   **Melihat Status Layanan:**
    ```bash
sudo docker compose ps
    ```

*   **Menghentikan Layanan:**
    ```bash
sudo docker compose down
    ```

*   **Memulai Layanan:**
    ```bash
sudo docker compose up -d
    ```

*   **Melihat Log Layanan:**
    ```bash
sudo docker compose logs -f
    ```

## Pemecahan Masalah (Troubleshooting)

Jika Anda mengalami masalah selama atau setelah instalasi, periksa hal-hal berikut:

*   **Koneksi Internet:** Pastikan VPS Anda memiliki koneksi internet yang stabil.
*   **Ruang Disk:** Pastikan ada cukup ruang disk yang tersedia di VPS Anda.
*   **Log Skrip:** Periksa output skrip `install.sh` untuk pesan error spesifik. Skrip dirancang untuk memberikan pesan error yang jelas jika terjadi masalah.
*   **Log Docker Compose:** Jika layanan tidak berjalan, periksa log Docker Compose:
    ```bash
cd /opt/hosting-panel
sudo docker compose logs
    ```
    Ini akan memberikan informasi lebih lanjut tentang mengapa kontainer mungkin gagal memulai.
*   **Firewall:** Pastikan firewall VPS Anda (misalnya, UFW) mengizinkan lalu lintas masuk pada port 80 (untuk HTTP) dan 5000 (untuk backend, meskipun ini hanya diakses secara internal oleh Nginx dalam konfigurasi Docker Compose).
    ```bash
sudo ufw allow 80/tcp
sudo ufw enable
    ```
    (Hanya jika UFW diaktifkan dan belum dikonfigurasi)
*   **Restart VPS:** Dalam beberapa kasus, me-restart VPS setelah instalasi Docker dapat membantu memastikan semua perubahan sistem diterapkan dengan benar.

Jika masalah berlanjut, catat pesan error yang spesifik dan cari solusinya di dokumentasi Docker atau komunitas online.

## Catatan Penting

*   Skrip ini mengasumsikan instalasi baru di VPS yang bersih. Jika Anda memiliki konfigurasi Nginx atau layanan lain yang berjalan di port 80, mungkin ada konflik.
*   Skrip ini menggunakan kredensial database default (`panel_user`/`secure_password`). Untuk lingkungan produksi, sangat disarankan untuk mengubahnya di file `docker-compose.yaml` sebelum menjalankan skrip.
*   Untuk konfigurasi domain dan SSL (HTTPS), Anda perlu mengkonfigurasi Nginx di dalam kontainer atau menggunakan reverse proxy terpisah di luar Docker Compose. Skrip ini tidak mencakup konfigurasi SSL otomatis.

---

