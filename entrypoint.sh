#!/bin/sh
set -e

cd /home/vane
echo "Starting Vane..."

exec node server.js
