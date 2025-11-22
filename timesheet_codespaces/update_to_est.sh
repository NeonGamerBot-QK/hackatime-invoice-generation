# 1. Set Timezone
sed -i '1i export TZ="America/New York"' ~/.bashrc
export TZ="America/New York"
# 2. Stop the current background logger (which is using UTC)
pkill -f codespace_usage_logger.sh
# 3. Start the logger again with the new Timezone
nohup ~/codespace_usage_logger.sh > /dev/null 2>&1 &
echo "Timezone updated to EST. Logger restarted."
