#!/bin/bash
set -e

# ============================================
# КОНФИГУРАЦИЯ
# ============================================
SERVER_USER="pi"  # или "root" в зависимости от твоей настройки
SERVER_HOST="raspberrypi.local"  # или IP адрес
SERVER_PATH="/home/pi/todoveronika"  # путь на сервере
SSH_KEY=""  # путь к SSH ключу, если нужен (например: "-i ~/.ssh/id_rsa")

# Telegram настройки (заполни свои)
BOT_TOKEN="8315988214:AAHvFXNbHyN9lhfZwm4OOlUEMhGjFSkaBYY"
CHAT_ID="7836566387"
USER_IDS="7836566387"

# ============================================
# ЦВЕТА ДЛЯ ВЫВОДА
# ============================================
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ============================================
# ПРОВЕРКА ЛОКАЛЬНОЙ СБОРКИ
# ============================================
echo_info "Проверяю локальную сборку фронтенда..."

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo_warn "Папка dist пуста или не существует. Собираю фронтенд локально..."
    npm run build
    if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
        echo_error "Не удалось собрать фронтенд! Проверь ошибки выше."
        exit 1
    fi
    echo_info "Фронтенд собран успешно!"
else
    echo_info "Найден существующий билд. Используется он."
fi

# ============================================
# ПОДКЛЮЧЕНИЕ К СЕРВЕРУ
# ============================================
echo_info "Подключаюсь к серверу ${SERVER_USER}@${SERVER_HOST}..."

# Проверка подключения
if ! ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "echo 'Connection OK'" > /dev/null 2>&1; then
    echo_error "Не удалось подключиться к серверу!"
    echo "Проверь:"
    echo "  1. SSH ключ настроен (или используй пароль)"
    echo "  2. Сервер доступен: ${SERVER_HOST}"
    echo "  3. Пользователь: ${SERVER_USER}"
    exit 1
fi

echo_info "Подключение установлено!"

# ============================================
# УСТАНОВКА ЗАВИСИМОСТЕЙ НА СЕРВЕРЕ
# ============================================
echo_info "Проверяю Node.js на сервере..."

ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    # Проверка Node.js
    if ! command -v node &> /dev/null; then
        echo "[INFO] Устанавливаю Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs build-essential python3
    fi
    
    # Проверка PM2
    if ! command -v pm2 &> /dev/null; then
        echo "[INFO] Устанавливаю PM2..."
        sudo npm install -g pm2
    fi
    
    # Проверка Git
    if ! command -v git &> /dev/null; then
        echo "[INFO] Устанавливаю Git..."
        sudo apt-get update
        sudo apt-get install -y git
    fi
    
    echo "[INFO] Все зависимости установлены!"
ENDSSH

# ============================================
# КЛОНИРОВАНИЕ/ОБНОВЛЕНИЕ РЕПОЗИТОРИЯ
# ============================================
echo_info "Клонирую/обновляю репозиторий на сервере..."

ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << ENDSSH
    if [ -d "${SERVER_PATH}" ]; then
        echo "[INFO] Репозиторий существует. Обновляю..."
        cd ${SERVER_PATH}
        git pull origin main || echo "[WARN] Не удалось обновить через git pull"
    else
        echo "[INFO] Клонирую репозиторий..."
        mkdir -p $(dirname ${SERVER_PATH})
        git clone https://github.com/vsevolodm12/todoveronika.git ${SERVER_PATH}
    fi
ENDSSH

# ============================================
# УСТАНОВКА ЗАВИСИМОСТЕЙ БЭКЕНДА
# ============================================
echo_info "Устанавливаю зависимости бэкенда..."

ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << ENDSSH
    cd ${SERVER_PATH}/server
    
    echo "[INFO] Устанавливаю npm пакеты..."
    npm ci --omit=dev 2>/dev/null || npm install --production
    
    echo "[INFO] Зависимости установлены!"
ENDSSH

# ============================================
# КОПИРОВАНИЕ СОБРАННОГО ФРОНТЕНДА
# ============================================
echo_info "Копирую собранный фронтенд на сервер..."

# Создаем папку dist на сервере
ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${SERVER_PATH}/dist"

# Копируем dist
scp ${SSH_KEY} -r dist/* ${SERVER_USER}@${SERVER_HOST}:${SERVER_PATH}/dist/

echo_info "Фронтенд скопирован!"

# ============================================
# СОЗДАНИЕ .env ФАЙЛА
# ============================================
echo_info "Создаю .env файл..."

ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << ENDSSH
    cat > ${SERVER_PATH}/.env << EOF
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
TELEGRAM_CHAT_ID=${CHAT_ID}
ALLOWED_USER_IDS=${USER_IDS}
PORT=3001
SQLITE_PATH=${SERVER_PATH}/data/todo.db
EOF

    # Создаем папку для базы данных
    mkdir -p ${SERVER_PATH}/data
    
    echo "[INFO] .env файл создан!"
ENDSSH

# ============================================
# ЗАПУСК ЧЕРЕЗ PM2
# ============================================
echo_info "Запускаю сервер через PM2..."

ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << ENDSSH
    cd ${SERVER_PATH}/server
    
    # Останавливаем если уже запущен
    pm2 delete todo-veronika 2>/dev/null || true
    
    # Запускаем с ограничением памяти (128MB для RPi)
    pm2 start index.js \
        --name "todo-veronika" \
        --node-args="--max-old-space-size=128" \
        --max-memory-restart 150M
    
    # Сохраняем конфигурацию
    pm2 save
    
    echo "[INFO] Сервер запущен!"
ENDSSH

# ============================================
# НАСТРОЙКА АВТОЗАПУСКА
# ============================================
echo_info "Настраиваю автозапуск..."

ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
    # Настраиваем автозапуск PM2
    pm2 startup | tail -1 | bash 2>/dev/null || {
        echo "[WARN] Не удалось настроить автозапуск автоматически."
        echo "[INFO] Выполни вручную: pm2 startup"
    }
    
    pm2 save
    
    echo "[INFO] Автозапуск настроен!"
ENDSSH

# ============================================
# ПРОВЕРКА РАБОТЫ
# ============================================
echo_info "Проверяю работу сервера..."

sleep 3

STATUS=$(ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "pm2 status todo-veronika --no-color" 2>/dev/null | grep -c "online" || echo "0")

if [ "$STATUS" -gt 0 ]; then
    echo_info "✅ Сервер запущен и работает!"
    
    # Показываем статус
    echo ""
    echo "=== Статус PM2 ==="
    ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "pm2 status"
    echo ""
    
    # Показываем логи
    echo "=== Последние логи ==="
    ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "pm2 logs todo-veronika --nostream --lines 5"
    echo ""
    
    # Проверяем health endpoint
    SERVER_IP=$(ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "hostname -I | awk '{print \$1}'")
    echo_info "Проверяю health endpoint..."
    
    if curl -s http://${SERVER_IP}:3001/health > /dev/null 2>&1; then
        echo_info "✅ Health endpoint отвечает!"
        echo ""
        echo "🌐 Сервер доступен по адресу: http://${SERVER_IP}:3001"
    else
        echo_warn "⚠️  Health endpoint не отвечает. Проверь логи: pm2 logs todo-veronika"
    fi
else
    echo_error "❌ Сервер не запустился! Проверь логи:"
    echo ""
    ssh ${SSH_KEY} ${SERVER_USER}@${SERVER_HOST} "pm2 logs todo-veronika --nostream --lines 20"
    exit 1
fi

# ============================================
# ИТОГОВАЯ ИНФОРМАЦИЯ
# ============================================
echo ""
echo "=========================================="
echo_info "🎉 ДЕПЛОЙ ЗАВЕРШЁН!"
echo "=========================================="
echo ""
echo "📋 Полезные команды:"
echo ""
echo "  # Статус сервера"
echo "  ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 status'"
echo ""
echo "  # Логи"
echo "  ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 logs todo-veronika'"
echo ""
echo "  # Перезапуск"
echo "  ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 restart todo-veronika'"
echo ""
echo "  # Обновление (после изменений в git)"
echo "  ssh ${SERVER_USER}@${SERVER_HOST} 'cd ${SERVER_PATH} && git pull && pm2 restart todo-veronika'"
echo ""
echo "  # Остановка"
echo "  ssh ${SERVER_USER}@${SERVER_HOST} 'pm2 stop todo-veronika'"
echo ""
echo "=========================================="

