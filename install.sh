#!/bin/bash

# Fungsi untuk menampilkan pesan error dan keluar
function error_exit {
    echo "${PROGNAME}: ${1:-'Unknown Error'}" 1>&2
    exit 1
}

# Fungsi untuk memeriksa apakah Docker sudah terinstal
function check_docker_installed {
    if ! command -v docker &> /dev/null
    then
        echo "Docker tidak ditemukan. Menginstal Docker..."
        install_docker
    fi
}

# Fungsi untuk menginstal Docker
function install_docker {
    sudo apt-get update || error_exit "Gagal memperbarui daftar paket."
    sudo apt-get install -y ca-certificates curl gnupg || error_exit "Gagal menginstal dependensi Docker."
    sudo install -m 0755 -d /etc/apt/keyrings || error_exit "Gagal membuat direktori keyrings."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg || error_exit "Gagal mengunduh kunci GPG Docker."
    sudo chmod a+r /etc/apt/keyrings/docker.gpg || error_exit "Gagal mengatur izin kunci GPG Docker."
    echo \
      "deb [arch=\"$(dpkg --print-architecture)\" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null || error_exit "Gagal menambahkan repositori Docker."
    sudo apt-get update || error_exit "Gagal memperbarui daftar paket setelah menambahkan repositori Docker."
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin || error_exit "Gagal menginstal Docker."
    sudo usermod -aG docker $USER || error_exit "Gagal menambahkan user ke grup docker."
    echo "Docker berhasil diinstal. Anda mungkin perlu logout/login kembali agar perubahan grup berlaku."
}

# Fungsi untuk memeriksa apakah Docker Compose sudah terinstal
function check_docker_compose_installed {
    if ! command -v docker-compose &> /dev/null && ! command -v docker compose &> /dev/null
    then
        echo "Docker Compose tidak ditemukan. Menginstal Docker Compose..."
        install_docker_compose
    fi
}

# Fungsi untuk menginstal Docker Compose (jika belum terinstal sebagai plugin)
function install_docker_compose {
    # Docker Compose V2 sudah terinstal dengan docker-ce-cli, jadi ini hanya fallback untuk versi lama
    if ! command -v docker compose &> /dev/null; then
        DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d \" -f 4)
        sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || error_exit "Gagal mengunduh Docker Compose."
        sudo chmod +x /usr/local/bin/docker-compose || error_exit "Gagal mengatur izin Docker Compose."
        echo "Docker Compose berhasil diinstal."
    fi
}

# Main script
PROGNAME=$(basename $0)

echo "Memulai instalasi Panel Hosting..."

# Periksa dan instal Docker
check_docker_installed

# Periksa dan instal Docker Compose (jika belum terinstal sebagai plugin)
check_docker_compose_installed

# Salin file panel hosting
INSTALL_DIR="/opt/hosting-panel"
echo "Menyalin file panel hosting ke ${INSTALL_DIR}..."
sudo mkdir -p ${INSTALL_DIR} || error_exit "Gagal membuat direktori instalasi."
sudo cp -r /home/ubuntu/panel_hosting_files/* ${INSTALL_DIR}/ || error_exit "Gagal menyalin file panel hosting."

cd ${INSTALL_DIR} || error_exit "Gagal masuk ke direktori instalasi."

# Buat file docker-compose.yaml
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

echo "File docker-compose.yaml berhasil dibuat."

# Jalankan Docker Compose
echo "Membangun dan menjalankan kontainer Docker..."
sudo docker compose up --build -d || error_exit "Gagal membangun dan menjalankan kontainer Docker."

echo "Instalasi selesai! Panel hosting seharusnya berjalan di port 80 VPS Anda."
echo "Anda mungkin perlu menunggu beberapa menit agar semua layanan berjalan sepenuhnya."
echo "Login dengan: admin / admin123"

# Hapus file instalasi sementara
echo "Membersihkan file instalasi sementara..."
sudo rm -rf /home/ubuntu/panel_hosting_files || error_exit "Gagal membersihkan file instalasi sementara."

# Perbarui todo.md
# This part will be handled by the agent after script execution


