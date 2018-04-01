echo "[*] Upgrading the system"
sudo apt-get update
sudo apt-get dist-upgrade

echo "[*] Installing Bluetooth stack"
sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev

echo "[*] Installing Nodejs & npm"
curl -sL https://deb.nodesource.com/setup_9.x | sudo -E bash -
sudo apt-get install -y nodejs nginx sqlite3 git

echo "[*] Cloning ble_gateway software"
cd /usr/share
sudo git clone https://github.com/bogdanoniga/ble_gateway.git
sudo chmod 777 ./ble_gateway && cd ./ble_gateway
npm install

echo "[*] Setting nginx config"
sudo mv ./configs/nginx.conf /etc/nginx/sites-enabled/default
sudo service nginx restart

echo "[*] Setting systemctl service"
sudo mv ./configs/ble_gateway.service /etc/systemd/system/ && sudo chmod 664 /etc/systemd/system/ble_gateway.service
sudo mv ./configs/ble_gateway.sh /usr/local/bin && sudo chmod 744 /usr/local/bin/ble_gateway.sh

echo "[*] Reloading systemctl"
sudo systemctl daemon-reload
