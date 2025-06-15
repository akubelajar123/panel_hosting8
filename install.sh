#!/bin/bash

LOG_FILE="/var/log/hosting-panel-install.log"

# Fungsi untuk mencatat pesan ke konsol dan file log
function log_message {
    local MESSAGE="$1"
    echo "$(date "+%Y-%m-%d %H:%M:%S") - ${MESSAGE}" | tee -a "${LOG_FILE}"
}

# Fungsi untuk menampilkan pesan error dan keluar
function error_exit {
    local MESSAGE="${1:-"Unknown Error"}"
    log_message "ERROR: ${MESSAGE}"
    exit 1
}

# Fungsi untuk memeriksa konektivitas internet
function check_internet_connectivity {
    log_message "Memeriksa konektivitas internet..."
    ping -c 1 google.com &> /dev/null
    if [ $? -ne 0 ]; then
        error_exit "Tidak ada koneksi internet. Pastikan VPS Anda terhubung ke internet."
    fi
    log_message "Koneksi internet terdeteksi."
}

# Fungsi untuk memeriksa hak akses sudo
function check_sudo_privileges {
    log_message "Memeriksa hak akses sudo..."
    sudo -v &> /dev/null
    if [ $? -ne 0 ]; then
        error_exit "Skrip ini memerlukan hak akses sudo. Jalankan dengan 'sudo ./install.sh'."
    fi
    log_message "Hak akses sudo terdeteksi."
}

# Fungsi untuk menjalankan perintah dengan retry
function run_command_with_retry {
    local CMD="$@"
    local RETRIES=5
    local DELAY=5
    for i in $(seq 1 $RETRIES);
    do
        log_message "Mencoba menjalankan: ${CMD} (Percobaan ${i}/${RETRIES})"
        if eval "${CMD}"; then
            return 0
        else
            log_message "Perintah gagal. Menunggu ${DELAY} detik sebelum mencoba lagi..."
            sleep ${DELAY}
        fi
    done
    return 1
}

# Fungsi untuk memeriksa apakah Docker sudah terinstal
function check_docker_installed {
    log_message "Memeriksa instalasi Docker..."
    if ! command -v docker &> /dev/null
    then
        log_message "Docker tidak ditemukan. Menginstal Docker..."
        install_docker
    else
        log_message "Docker sudah terinstal."
    fi
}

# Fungsi untuk menginstal Docker
function install_docker {
    log_message "Memulai instalasi Docker..."
    run_command_with_retry "sudo apt-get update" || error_exit "Gagal memperbarui daftar paket."
    run_command_with_retry "sudo apt-get install -y ca-certificates curl gnupg" || error_exit "Gagal menginstal dependensi Docker."
    run_command_with_retry "sudo install -m 0755 -d /etc/apt/keyrings" || error_exit "Gagal membuat direktori keyrings."
    run_command_with_retry "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg" || error_exit "Gagal mengunduh kunci GPG Docker."
    run_command_with_retry "sudo chmod a+r /etc/apt/keyrings/docker.gpg" || error_exit "Gagal mengatur izin kunci GPG Docker."
    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null || error_exit "Gagal menambahkan repositori Docker."
    run_command_with_retry "sudo apt-get update" || error_exit "Gagal memperbarui daftar paket setelah menambahkan repositori Docker."
    run_command_with_retry "sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin" || error_exit "Gagal menginstal Docker."
    
    log_message "Menambahkan user saat ini ke grup docker..."
    sudo usermod -aG docker $USER || error_exit "Gagal menambahkan user ke grup docker."
    log_message "Docker berhasil diinstal. Anda mungkin perlu logout/login kembali agar perubahan grup berlaku dan Docker dapat dijalankan tanpa sudo."
    
    log_message "Memulai layanan Docker..."
    sudo systemctl start docker || log_message "Peringatan: Gagal memulai layanan Docker secara otomatis. Coba 'sudo systemctl start docker' secara manual."
    sudo systemctl enable docker || log_message "Peringatan: Gagal mengaktifkan layanan Docker saat boot. Coba 'sudo systemctl enable docker' secara manual."
}

# Fungsi untuk memeriksa apakah Docker Compose sudah terinstal
function check_docker_compose_installed {
    log_message "Memeriksa instalasi Docker Compose..."
    if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null
    then
        log_message "Docker Compose tidak ditemukan. Menginstal Docker Compose..."
        install_docker_compose
    else
        log_message "Docker Compose sudah terinstal."
    fi
}

# Fungsi untuk menginstal Docker Compose (jika belum terinstal sebagai plugin)
function install_docker_compose {
    log_message "Memulai instalasi Docker Compose..."
    # Docker Compose V2 sudah terinstal dengan docker-ce-cli, jadi ini hanya fallback untuk versi lama
    if ! command -v docker compose &> /dev/null; then
        DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d \" -f 4)
        run_command_with_retry "sudo curl -L \"https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose" || error_exit "Gagal mengunduh Docker Compose."
        run_command_with_retry "sudo chmod +x /usr/local/bin/docker-compose" || error_exit "Gagal mengatur izin Docker Compose."
        log_message "Docker Compose berhasil diinstal."
    else
        log_message "Docker Compose V2 sudah terinstal sebagai plugin Docker."
    fi
}

# Main script
PROGNAME=$(basename "$0")

# Buat direktori log jika belum ada
sudo mkdir -p $(dirname "${LOG_FILE}") || error_exit "Gagal membuat direktori log."
sudo touch "${LOG_FILE}" || error_exit "Gagal membuat file log."

log_message "Memulai instalasi Panel Hosting..."

# Get the directory where the script is located
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

# Change current working directory to the script's directory
cd "${SCRIPT_DIR}" || error_exit "Gagal masuk ke direktori skrip: ${SCRIPT_DIR}"

# Pre-flight checks
check_internet_connectivity
check_sudo_privileges

# Periksa dan instal Docker
check_docker_installed

# Periksa dan instal Docker Compose (jika belum terinstal sebagai plugin)
check_docker_compose_installed

# Salin file panel hosting
INSTALL_DIR="/opt/hosting-panel"
log_message "Menyalin file panel hosting dari ${SCRIPT_DIR} ke ${INSTALL_DIR}..."
run_command_with_retry "sudo mkdir -p ${INSTALL_DIR}" || error_exit "Gagal membuat direktori instalasi."
run_command_with_retry "sudo cp -r ./* ${INSTALL_DIR}/" || error_exit "Gagal menyalin file panel hosting."

cd ${INSTALL_DIR} || error_exit "Gagal masuk ke direktori instalasi: ${INSTALL_DIR}"

# Buat file docker-compose.yaml
log_message "Membuat file docker-compose.yaml..."
cat <<EOF > docker-compose.yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://panel_user:secure_password@db:5432/hosting_panel
    depends_on:
      - db
    restart: always

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: always

  db:
    image: postgres:13
    environment:
      POSTGRES_DB: hosting_panel
      POSTGRES_USER: panel_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: always

volumes:
  db_data:
EOF
log_message "File docker-compose.yaml berhasil dibuat."

# Jalankan Docker Compose
log_message "Membangun dan menjalankan kontainer Docker..."
run_command_with_retry "sudo docker compose up --build -d" || error_exit "Gagal membangun dan menjalankan kontainer Docker."

log_message "Instalasi selesai! Panel hosting seharusnya berjalan di port 80 VPS Anda."
log_message "Anda mungkin perlu menunggu beberapa menit agar semua layanan berjalan sepenuhnya."
log_message "Login dengan: admin / admin123"
log_message "Log instalasi dapat ditemukan di: ${LOG_FILE}"

# Hapus file instalasi sementara (jika ada, dari unduhan ZIP)
# Ini tidak berlaku jika skrip dijalankan dari git clone
if [ -d "/home/ubuntu/panel_hosting_files" ]; then
    log_message "Membersihkan file instalasi sementara dari unduhan ZIP..."
    sudo rm -rf /home/ubuntu/panel_hosting_files || log_message "Peringatan: Gagal membersihkan file instalasi sementara."
fi

log_message "Skrip instalasi selesai."


