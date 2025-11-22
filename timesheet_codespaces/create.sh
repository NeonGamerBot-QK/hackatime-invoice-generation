# 1. Create the logger script in your home directory (safe from Git)
cat << 'EOF' > ~/codespace_usage_logger.sh
#!/bin/bash
LOG_FILE="$HOME/codespace_activity.log"
LAST_SEEN_FILE="$HOME/.codespace_last_seen"
# Check if the logger is already running to prevent duplicates
if pgrep -f "codespace_usage_logger.sh" > /dev/null 2>&1 && [ "$$" != "$(pgrep -f "codespace_usage_logger.sh" | head -n 1)" ]; then
    exit 0
fi
# --- LOGGING PREVIOUS SESSION END ---
# If a "last seen" file exists, that was the end time of the previous session
if [ -f "$LAST_SEEN_FILE" ]; then
    LAST_SEEN=$(cat "$LAST_SEEN_FILE")
    echo "CLOSED: $LAST_SEEN" >> "$LOG_FILE"
    echo "-------------------------------------" >> "$LOG_FILE"
fi
# --- LOGGING CURRENT SESSION START ---
echo "OPENED: $(date '+%Y-%m-%d %H:%M:%S')" >> "$LOG_FILE"
# --- HEARTBEAT LOOP ---
# Update the last_seen file every 60 seconds
while true; do
    date '+%Y-%m-%d %H:%M:%S' > "$LAST_SEEN_FILE"
    sleep 60
done
EOF
# 2. Make the script executable
chmod +x ~/codespace_usage_logger.sh
# 3. Add to .bashrc so it starts automatically (idempotent check)
if ! grep -q "codespace_usage_logger.sh" ~/.bashrc; then
    echo "" >> ~/.bashrc
    echo "# Start Codespace Usage Logger in background" >> ~/.bashrc
    echo "nohup ~/codespace_usage_logger.sh > /dev/null 2>&1 &" >> ~/.bashrc
    echo "Logger installed successfully."
else
    echo "Logger is already installed."
fi
# 4. Start it immediately for this session
nohup ~/codespace_usage_logger.sh > /dev/null 2>&1 &