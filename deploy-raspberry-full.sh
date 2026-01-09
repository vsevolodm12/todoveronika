#!/bin/bash
set -e

# ============================================
# ПРОВЕРКИ
# ============================================
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Не запускай скрипт от root! Используй обычного пользователя (sudo будет запрашиваться при необходимости)"
   exit 1
fi

# Проверка sudo
if ! sudo -n true 2>/dev/null; then
    echo "📝 Потребуются права sudo для установки пакетов"
fi

# ============================================
# КОНФИГУРАЦИЯ
# ============================================
APP_DIR="$HOME/todoveronika"
REPO_URL="https://github.com/vsevolodm12/todoveronika.git"

# Telegram настройки
BOT_TOKEN="8315988214:AAHvFXNbHyN9lhfZwm4OOlUEMhGjFSkaBYY"
CHAT_ID="7836566387"
USER_IDS="7836566387"
PORT=3001

# ============================================
# ЦВЕТА
# ============================================
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo_info() {
    echo -e "${GREEN}[✓]${NC} $1"
}

echo_step() {
    echo -e "${BLUE}[→]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

# ============================================
# 1. ОБНОВЛЕНИЕ СИСТЕМЫ
# ============================================
echo_step "Обновляю систему..."
sudo apt-get update
sudo apt-get upgrade -y

# ============================================
# 2. УСТАНОВКА БАЗОВЫХ ПАКЕТОВ
# ============================================
echo_step "Устанавливаю базовые пакеты..."
sudo apt-get install -y \
    curl \
    git \
    build-essential \
    python3 \
    sqlite3

echo_info "Базовые пакеты установлены"

# ============================================
# 3. УСТАНОВКА NODE.JS
# ============================================
echo_step "Устанавливаю Node.js..."

if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo_info "Node.js установлен: $(node -v)"
else
    echo_info "Node.js уже установлен: $(node -v)"
fi

# ============================================
# 4. УСТАНОВКА PM2
# ============================================
echo_step "Устанавливаю PM2..."

if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    echo_info "PM2 установлен: $(pm2 -v)"
else
    echo_info "PM2 уже установлен: $(pm2 -v)"
fi

# ============================================
# 5. КЛОНИРОВАНИЕ РЕПОЗИТОРИЯ
# ============================================
echo_step "Клонирую репозиторий..."

if [ -d "$APP_DIR" ]; then
    echo_warn "Папка $APP_DIR уже существует. Обновляю..."
    cd "$APP_DIR"
    git pull origin main || echo_warn "Не удалось обновить через git pull"
else
    git clone "$REPO_URL" "$APP_DIR"
    cd "$APP_DIR"
    echo_info "Репозиторий клонирован"
fi

# ============================================
# 6. УСТАНОВКА ЗАВИСИМОСТЕЙ FRONTEND
# ============================================
echo_step "Устанавливаю зависимости фронтенда..."
npm install

echo_info "Зависимости фронтенда установлены"

# ============================================
# 7. СБОРКА FRONTEND
# ============================================
echo_step "Собираю фронтенд..."
VITE_API_URL="" npm run build

if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
    echo_warn "Ошибка сборки фронтенда!"
    exit 1
fi

echo_info "Фронтенд собран успешно"

# ============================================
# 8. УСТАНОВКА ЗАВИСИМОСТЕЙ BACKEND
# ============================================
echo_step "Устанавливаю зависимости бэкенда..."
cd server
npm install
cd ..

echo_info "Зависимости бэкенда установлены"

# ============================================
# 9. СОЗДАНИЕ .env ФАЙЛА
# ============================================
echo_step "Создаю .env файл..."

cat > .env << EOF
TELEGRAM_BOT_TOKEN=${BOT_TOKEN}
TELEGRAM_CHAT_ID=${CHAT_ID}
ALLOWED_USER_IDS=${USER_IDS}
PORT=${PORT}
SQLITE_PATH=${APP_DIR}/data/todo.db
EOF

mkdir -p data

echo_info ".env файл создан"

# ============================================
# 10. ЗАПУСК ЧЕРЕЗ PM2
# ============================================
echo_step "Запускаю сервер через PM2..."

cd server

# Останавливаем если уже запущен
pm2 delete todo-veronika 2>/dev/null || true

# Запускаем с ограничением памяти (для надежности, хотя 8GB хватит)
pm2 start index.js \
    --name "todo-veronika" \
    --node-args="--max-old-space-size=512" \
    --max-memory-restart 600M \
    --restart-delay 3000 \
    --exp-backoff-restart-delay 100

# Сохраняем конфигурацию
pm2 save

echo_info "Сервер запущен через PM2"

# ============================================
# 11. НАСТРОЙКА АВТОЗАПУСКА PM2
# ============================================
echo_step "Настраиваю автозапуск PM2..."

# Генерируем команду для автозапуска
STARTUP_CMD=$(pm2 startup systemd -u $USER --hp $HOME | tail -1)

if [ ! -z "$STARTUP_CMD" ]; then
    echo_info "Выполняю команду автозапуска..."
    eval $STARTUP_CMD
    pm2 save
    echo_info "Автозапуск PM2 настроен"
else
    echo_warn "Не удалось автоматически настроить автозапуск"
    echo "Выполни вручную: pm2 startup systemd"
fi

# ============================================
# 12. СОЗДАНИЕ SYSTEMD SERVICE (ДЛЯ НАДЕЖНОСТИ)
# ============================================
echo_step "Создаю systemd service для надежности..."

# Копируем .env в systemd service
sudo mkdir -p /etc/todo-veronika
sudo cp ${APP_DIR}/.env /etc/todo-veronika/.env
sudo chmod 600 /etc/todo-veronika/.env

# Создаем systemd service
sudo tee /etc/systemd/system/todo-veronika.service > /dev/null << EOF
[Unit]
Description=Todo Veronika Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=${APP_DIR}/server
EnvironmentFile=/etc/todo-veronika/.env
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStart=/usr/bin/node --max-old-space-size=512 index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=todo-veronika

[Install]
WantedBy=multi-user.target
EOF

# Перезагружаем systemd
sudo systemctl daemon-reload

# НЕ включаем systemd service (используем PM2), но оставляем как резерв
# sudo systemctl enable todo-veronika
# sudo systemctl start todo-veronika

echo_info "Systemd service создан (резервный, не активен)"

# ============================================
# 13. НАСТРОЙКА АВТОЗАПУСКА ПРИ ПЕРЕЗАГРУЗКЕ
# ============================================
echo_step "Настраиваю автозапуск при перезагрузке..."

# Создаем скрипт для проверки и запуска PM2
cat > $HOME/.pm2-startup.sh << 'EOFSCRIPT'
#!/bin/bash
# Ждем немного после загрузки
sleep 10

# Проверяем что PM2 запущен
if ! pgrep -x "pm2" > /dev/null; then
    pm2 resurrect
fi

# Проверяем что приложение запущено
if ! pm2 list | grep -q "todo-veronika.*online"; then
    cd ~/todoveronika/server
    pm2 start index.js --name "todo-veronika" --node-args="--max-old-space-size=512" --max-memory-restart 600M
    pm2 save
fi
EOFSCRIPT

chmod +x $HOME/.pm2-startup.sh

# Добавляем в crontab для проверки каждые 5 минут
(crontab -l 2>/dev/null | grep -v ".pm2-startup.sh"; echo "*/5 * * * * $HOME/.pm2-startup.sh > /dev/null 2>&1") | crontab -

# Добавляем в rc.local для запуска при загрузке
if [ -f /etc/rc.local ]; then
    if ! grep -q ".pm2-startup.sh" /etc/rc.local; then
        # Проверяем есть ли exit 0
        if grep -q "^exit 0" /etc/rc.local; then
            sudo sed -i '/^exit 0/i '"$HOME/.pm2-startup.sh &" /etc/rc.local
        else
            echo "$HOME/.pm2-startup.sh &" | sudo tee -a /etc/rc.local > /dev/null
            echo "exit 0" | sudo tee -a /etc/rc.local > /dev/null
        fi
    fi
else
    # Создаем rc.local если его нет
    echo "#!/bin/bash" | sudo tee /etc/rc.local > /dev/null
    echo "$HOME/.pm2-startup.sh &" | sudo tee -a /etc/rc.local > /dev/null
    echo "exit 0" | sudo tee -a /etc/rc.local > /dev/null
    sudo chmod +x /etc/rc.local
fi

echo_info "Автозапуск при перезагрузке настроен"

# ============================================
# 14. ПРОВЕРКА РАБОТЫ
# ============================================
echo_step "Проверяю работу сервера..."

sleep 3

if pm2 list | grep -q "todo-veronika.*online"; then
    echo_info "✅ Сервер запущен и работает!"
    
    echo ""
    echo "=== Статус PM2 ==="
    pm2 status
    echo ""
    
    echo "=== Последние логи ==="
    pm2 logs todo-veronika --nostream --lines 5
    echo ""
    
    # Проверяем health endpoint
    SERVER_IP=$(hostname -I | awk '{print $1}')
    if curl -s http://localhost:${PORT}/health > /dev/null 2>&1; then
        echo_info "✅ Health endpoint отвечает!"
        echo ""
        echo "🌐 Сервер доступен по адресу: http://${SERVER_IP}:${PORT}"
    else
        echo_warn "⚠️  Health endpoint не отвечает. Проверь логи: pm2 logs todo-veronika"
    fi
else
    echo_warn "⚠️  Сервер не запустился! Проверь логи:"
    pm2 logs todo-veronika --nostream --lines 20
    exit 1
fi

# ============================================
# ИТОГОВАЯ ИНФОРМАЦИЯ
# ============================================
echo ""
echo "=========================================="
echo_info "🎉 УСТАНОВКА ЗАВЕРШЕНА!"
echo "=========================================="
echo ""
echo "📋 Полезные команды:"
echo ""
echo "  # Статус сервера"
echo "  pm2 status"
echo ""
echo "  # Логи в реальном времени"
echo "  pm2 logs todo-veronika"
echo ""
echo "  # Перезапуск"
echo "  pm2 restart todo-veronika"
echo ""
echo "  # Остановка"
echo "  pm2 stop todo-veronika"
echo ""
echo "  # Обновление (после изменений в git)"
echo "  cd ~/todoveronika"
echo "  git pull"
echo "  npm run build"
echo "  pm2 restart todo-veronika"
echo ""
echo "  # Проверка автозапуска"
echo "  pm2 startup"
echo ""
echo "  # Systemd service (резервный)"
echo "  sudo systemctl status todo-veronika"
echo "  sudo systemctl start todo-veronika  # если PM2 не работает"
echo ""
echo "=========================================="
echo ""
echo_info "✅ Сервис автоматически запустится при перезагрузке!"
echo_info "✅ Проверка каждые 5 минут - если упал, перезапустится!"
echo ""

