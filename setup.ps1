# PowerShell setup script: copy example settings to settings.json
if (Test-Path -Path settings.json) {
  Write-Host "settings.json already exists — aborting."
  exit 1
}
Copy-Item -Path settings.example.json -Destination settings.json
Write-Host "Created settings.json from settings.example.json — edit it before starting the bot." 
