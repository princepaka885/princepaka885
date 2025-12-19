#!/bin/bash
# Copy example settings into place and remind user to edit values
if [ -f settings.json ]; then
  echo "settings.json already exists — aborting."
  exit 1
fi
cp settings.example.json settings.json
echo "Created settings.json from settings.example.json — edit it before starting the bot."
