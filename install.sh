#!/bin/bash

# Warna ANSI
GREEN=\033[0;32m
RED=\033[0;31m
YELLOW=\033[0;33m
BLUE=\033[0;34m
NC=\033[0m # No Color

LOG_FILE="/var/log/hosting-panel-install.log"

# Fungsi untuk mencatat pesan ke konsol dan file log
function log_message {
    local MESSAGE="$1"
    echo -e "$(date "+%Y-%m-%d %H:%M:%S") - ${BLUE}${MESSAGE}${NC}" | tee -a "${LOG_FILE}"
}

# Fungsi untuk menampilkan pesan sukses
function success_message {
    local MESSAGE="$1"
    echo -e "${GREEN}✔ ${MESSAGE}${NC}"
    log_message "SUCCESS: ${MESSAGE}"
}

# Fungsi untuk menampilkan pesan error dan keluar
function error_exit {
    local MESSAGE="${1:-"Unknown Error"}"
    echo -e "${RED}✖ ERROR: ${MESSAGE}${NC}"
    log_message "ERROR: ${MESSAGE}"
    exit 1
}

# Fungsi untuk menampilkan pesan peringatan
function warning_message {
    local MESSAGE="$1"
    echo -e "${YELLOW}⚠ WARNING: ${MESSAGE}${NC}"
    log_message "WARNING: ${MESSAGE}"
}

# Fungsi untuk menampilkan banner
function display_banner {
    echo -e "${BLUE}"
    echo "  ____                            _        _   _             _ _           "
    echo " |  _ \                          | |      | | (_)           | | |          "
    echo " | |_) | ___  ___ ___  _ __   ___| |_ __ _| |_ _ _ __   __| | | ___ _ __ "
    echo " |  _ < / _ \/ __/ _ \| \'_ \ / _ \ __/ _\` | __| | \'_ \ / _\` | |/ _ \ \'__|"
    echo " | |_) |  __/ (_| (_) | | | |  __/ || (_| | |_| | | | | (_| | |  __/ |  "
    echo " |____/ \___|\___\___/|_| |_|\___|\__\__,_|\__|_|_| |_|\__,_|_|\___|_|  "
    echo "                                                                         "
    echo "  _   _             _ _           _           _                          "
    echo " | | (_)           | | |         | |         | |                         "
    echo " | |_ _ _ __   __| | | ___ _ __ | |__   __ _| | ___                     "
    echo " | __| | \'_ \ / _\` | |/ _ \ \'__| | 
 \ / _\` | |/ _ \                    "
    echo " | |_| | | | | (_| | |  __/ |    | |_) | (_| | |  __/                    "
    echo "  \__|_|_| |_|\__,_|_|\___|_|    |_.__/ \__,_|_|\___|                    "
    echo -e "${NC}"
    echo -e "${GREEN}Selamat datang di Instalasi Panel Hosting!${NC}"
    echo -e "${YELLOW}Skrip ini akan menginstal dan mengkonfigurasi panel hosting berbasis Docker.${NC}"
    echo ""
}

# Fungsi untuk menampilkan spinner loading
function start_spinner {
    PID=$!
    spin='-\\ / | /'
    i=0
    while kill -0 $PID 2>/dev/null; do
        i=$(( (i+1) % 4 ))
        printf "\r${BLUE}%c${NC} %s" "${spin:$i:1}" "$1"
        sleep .1
    done
    printf "\r%s\n" " "
}

function stop_spinner {
    kill $1 2>/dev/null
    wait $1 2>/dev/null
}

# Fungsi untuk menjalankan perintah dengan spinner
function run_with_spinner {
    local CMD="$@"
    local MESSAGE="$1"
    shift
    log_message "Memulai: ${MESSAGE}"
    (eval "${CMD}" &> /dev/null) & start_spinner "${MESSAGE}"
    stop_spinner $!
    if [ $? -ne 0 ]; then
        error_exit "${MESSAGE} gagal."
    else
        success_message "${MESSAGE} berhasil."
    fi
}

# Fungsi untuk menjalankan perintah dengan retry dan spinner
function run_command_with_retry_and_spinner {
    local CMD="$@"
    local MESSAGE="$1"
    shift
    local RETRIES=5
    local DELAY=5
    for i in $(seq 1 $RETRIES);
    do
        log_message "Mencoba menjalankan: ${MESSAGE} (Percobaan ${i}/${RETRIES})"
        (eval "${CMD}" &> /dev/null) & start_spinner "${MESSAGE} (Percobaan ${i}/${RETRIES})"
        stop_spinner $!
        if [ $? -eq 0 ]; then
            success_message "${MESSAGE} berhasil."
            return 0
        else
            warning_message "${MESSAGE} gagal. Menunggu ${DELAY} detik sebelum mencoba lagi..."
            sleep ${DELAY}
        fi
    done
    error_exit "${MESSAGE} gagal setelah ${RETRIES} percobaan."
}

# Fungsi untuk memeriksa konektivitas internet
function check_internet_connectivity {
    log_message "Memeriksa konektivitas internet..."
    local RETRIES=10
    local DELAY=6
    for i in $(seq 1 $RETRIES);
    do
        log_message "Mencoba ping google.com (Percobaan ${i}/${RETRIES})"
        ping -c 1 google.com &> /dev/null
        if [ $? -eq 0 ]; then
            success_message "Koneksi internet terdeteksi."
            return 0
        else
            warning_message "Tidak ada koneksi internet. Menunggu ${DELAY} detik sebelum mencoba lagi..."
            sleep ${DELAY}
        fi
    done
    error_exit "Tidak ada koneksi internet setelah beberapa percobaan. Pastikan VPS Anda terhubung ke internet."
}

# Fungsi untuk memeriksa hak akses sudo
function check_sudo_privileges {
    log_message "Memeriksa hak akses sudo..."
    sudo -v &> /dev/null
    if [ $? -ne 0 ]; then
        error_exit "Skrip ini memerlukan hak akses sudo. Jalankan dengan \'sudo ./install.sh\'."
    fi
    success_message "Hak akses sudo terdeteksi."
}

# Fungsi untuk menginstal Docker
function install_docker {
    log_message "Memulai instalasi Docker..."
    run_command_with_retry_and_spinner "sudo apt-get update" "Memperbarui daftar paket"
    run_command_with_retry_and_spinner "sudo apt-get install -y ca-certificates curl gnupg" "Menginstal dependensi Docker"
    run_command_with_retry_and_spinner "sudo install -m 0755 -d /etc/apt/keyrings" "Membuat direktori keyrings"
    run_command_with_retry_and_spinner "curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg" "Mengunduh kunci GPG Docker"
    run_command_with_retry_and_spinner "sudo chmod a+r /etc/apt/keyrings/docker.gpg" "Mengatur izin kunci GPG Docker"
    run_command_with_retry_and_spinner "echo \"deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \"$(. /etc/os-release && echo \"$VERSION_CODENAME\") stable\" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null" "Menambahkan repositori Docker"
    run_command_with_retry_and_spinner "sudo apt-get update" "Memperbarui daftar paket setelah menambahkan repositori Docker"
    run_command_with_retry_and_spinner "sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin" "Menginstal Docker"
    
    log_message "Menambahkan user saat ini ke grup docker..."
    sudo usermod -aG docker $USER || warning_message "Gagal menambahkan user ke grup docker. Anda mungkin perlu melakukannya secara manual."
    success_message "Docker berhasil diinstal. Anda mungkin perlu logout/login kembali agar perubahan grup berlaku dan Docker dapat dijalankan tanpa sudo."
    
    log_message "Memulai layanan Docker..."
    sudo systemctl start docker || warning_message "Gagal memulai layanan Docker secara otomatis. Coba \'sudo systemctl start docker\' secara manual."
    sudo systemctl enable docker || warning_message "Gagal mengaktifkan layanan Docker saat boot. Coba \'sudo systemctl enable docker\' secara manual."
}

# Fungsi untuk memeriksa apakah Docker sudah terinstal
function check_docker_installed {
    log_message "Memeriksa instalasi Docker..."
    if ! command -v docker &> /dev/null
    then
        log_message "Docker tidak ditemukan. Menginstal Docker..."
        install_docker
    else
        success_message "Docker sudah terinstal."
    fi
}

# Fungsi untuk menginstal Docker Compose (jika belum terinstal sebagai plugin)
function install_docker_compose {
    log_message "Memulai instalasi Docker Compose..."
    # Docker Compose V2 sudah terinstal dengan docker-ce-cli, jadi ini hanya fallback untuk versi lama
    if ! command -v docker compose &> /dev/null; then
        DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep \'tag_name\' | cut -d \" -f 4)
        run_command_with_retry_and_spinner "sudo curl -L \"https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)\" -o /usr/local/bin/docker-compose" "Mengunduh Docker Compose"
        run_command_with_retry_and_spinner "sudo chmod +x /usr/local/bin/docker-compose" "Mengatur izin Docker Compose"
        success_message "Docker Compose berhasil diinstal."
    else
        success_message "Docker Compose V2 sudah terinstal sebagai plugin Docker."
    fi
}

# Fungsi untuk mengkonfigurasi firewall (UFW)
function configure_firewall {
    log_message "Mengkonfigurasi firewall (UFW)..."
    run_command_with_retry_and_spinner "sudo apt-get install -y ufw" "Menginstal UFW"
    if command -v ufw &> /dev/null; then
        run_command_with_retry_and_spinner "sudo ufw allow 22/tcp" "Mengizinkan port SSH (22/tcp) di UFW"
        run_command_with_retry_and_spinner "sudo ufw allow 80/tcp" "Mengizinkan port HTTP (80/tcp) di UFW"
        run_command_with_retry_and_spinner "sudo ufw allow 5000/tcp" "Mengizinkan port Backend API (5000/tcp) di UFW"
        run_command_with_retry_and_spinner "sudo ufw --force enable" "Mengaktifkan UFW"
        success_message "Firewall (UFW) berhasil dikonfigurasi dan diaktifkan."
    else
        warning_message "UFW tidak terinstal atau tidak ditemukan. Lewati konfigurasi firewall."
    fi
}

# Main script
PROGNAME=$(basename "$0")

# Direktori instalasi default
INSTALL_DIR="/opt/hosting-panel"

# Periksa argumen untuk direktori instalasi kustom
if [ -n "$1" ]; then
    INSTALL_DIR="$1"
    log_message "Direktori instalasi kustom diatur ke: ${INSTALL_DIR}"
fi

# Buat direktori log jika belum ada
sudo mkdir -p $(dirname "${LOG_FILE}") || error_exit "Gagal membuat direktori log."
sudo touch "${LOG_FILE}" || error_exit "Gagal membuat file log."

display_banner

log_message "Memulai instalasi Panel Hosting..."

# Get the directory where the script is located
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")

# Change current working directory to the script\\\'s directory
cd "${SCRIPT_DIR}" || error_exit "Gagal masuk ke direktori skrip: ${SCRIPT_DIR}"

# Pre-flight checks
check_internet_connectivity
check_sudo_privileges

# Hentikan dan hapus kontainer Docker yang ada untuk proyek ini
log_message "Menghentikan dan menghapus kontainer Docker yang ada untuk proyek hosting-panel..."
# Periksa apakah docker-compose.yaml ada di INSTALL_DIR sebelum mencoba menghentikan kontainer
if [ -f "${INSTALL_DIR}/docker-compose.yaml" ]; then
    if sudo docker compose -f "${INSTALL_DIR}/docker-compose.yaml" ps &> /dev/null; then
        run_command_with_retry_and_spinner "sudo docker compose -f \"${INSTALL_DIR}/docker-compose.yaml\" down -v" "Menghentikan dan menghapus kontainer Docker yang ada"
    else
        log_message "Tidak ada kontainer Docker hosting-panel yang berjalan dari ${INSTALL_DIR}."
    fi
else
    log_message "File docker-compose.yaml tidak ditemukan di ${INSTALL_DIR}. Lewati penghentian kontainer lama."
fi

# Hapus direktori instalasi lama jika ada
if [ -d "${INSTALL_DIR}" ]; then
    log_message "Menghapus direktori instalasi lama: ${INSTALL_DIR}"
    run_command_with_retry_and_spinner "sudo rm -rf ${INSTALL_DIR}" "Menghapus direktori instalasi lama"
fi

# Periksa dan instal Docker
check_docker_installed

# Periksa dan instal Docker Compose (jika belum terinstal sebagai plugin)
check_docker_compose_installed

# Salin file panel hosting
log_message "Menyalin file panel hosting dari ${SCRIPT_DIR} ke ${INSTALL_DIR}..."
run_command_with_retry_and_spinner "sudo mkdir -p ${INSTALL_DIR}" "Membuat direktori instalasi"
run_command_with_retry_and_spinner "sudo cp -r ./* ${INSTALL_DIR}/" "Menyalin file panel hosting"

cd ${INSTALL_DIR} || error_exit "Gagal masuk ke direktori instalasi: ${INSTALL_DIR}"

# Dapatkan alamat IP VPS
log_message "Mendapatkan alamat IP VPS..."
VPS_IP=$(curl -s ifconfig.me)
if [ -z "$VPS_IP" ]; then
    error_exit "Gagal mendapatkan alamat IP VPS. Pastikan koneksi internet berfungsi."
fi
success_message "Alamat IP VPS terdeteksi: ${VPS_IP}"

# Perbarui API_BASE_URL di frontend/src/lib/api.js
log_message "Memperbarui API_BASE_URL di frontend/src/lib/api.js..."
run_command_with_retry_and_spinner "sudo sed -i \"s|http://localhost:5000/api|http://${VPS_IP}:5000/api|g\" \"${INSTALL_DIR}/frontend/src/lib/api.js\"" "Memperbarui API_BASE_URL di frontend"
success_message "API_BASE_URL berhasil diperbarui ke http://${VPS_IP}:5000/api"

# Buat file docker-compose.yaml
log_message "Membuat file docker-compose.yaml..."
cat <<EOF > docker-compose.yaml
version: \'3.8\'
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
success_message "File docker-compose.yaml berhasil dibuat."

# Jalankan Docker Compose
log_message "Membangun dan menjalankan kontainer Docker..."
run_command_with_retry_and_spinner "sudo docker compose up --build -d" "Membangun dan menjalankan kontainer Docker"

# Konfigurasi firewall
configure_firewall

log_message "Instalasi selesai! Panel hosting seharusnya berjalan di port 80 VPS Anda."
log_message "Anda mungkin perlu menunggu beberapa menit agar semua layanan berjalan sepenuhnya."
log_message "Login dengan: admin / admin123"
log_message "Log instalasi dapat ditemukan di: ${LOG_FILE}"

# Hapus file instalasi sementara (jika ada, dari unduhan ZIP)
# Ini tidak berlaku jika skrip dijalankan dari git clone
if [ -d "/home/ubuntu/panel_hosting_files" ]; then
    log_message "Membersihkan file instalasi sementara dari unduhan ZIP..."
    sudo rm -rf /home/ubuntu/panel_hosting_files || warning_message "Gagal membersihkan file instalasi sementara."
fi

success_message "Skrip instalasi selesai."


