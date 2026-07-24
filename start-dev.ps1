# start-dev.ps1
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Iniciando Entorno de Desarrollo Redeco" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Obtener la IP de la red local (ignora maquinas virtuales y WSL)
Write-Host "1. Buscando IP de red local..."
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -match "^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\." -and $_.InterfaceAlias -notmatch "vEthernet|WSL|Loopback" } | Select-Object -First 1).IPAddress

if (-not $ip) {
    Write-Host "   No se encontró IP de red local. Usando 127.0.0.1 (Solo local)" -ForegroundColor Yellow
    $ip = "127.0.0.1"
} else {
    Write-Host "   IP detectada: $ip" -ForegroundColor Green
}

# 2. Matar procesos conflictivos
Write-Host "2. Matando servidores anteriores (Puertos 3000 y 8100)..."
Get-NetTCPConnection -LocalPort 3000, 8100, 4200 -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}

# 3. Actualizar el environment del Frontend
Write-Host "3. Inyectando IP ($ip) en el frontend..."
$envFile = ".\frontend\src\environments\environment.ts"
(Get-Content $envFile) -replace "https?://[0-9\.]+:3000", "https://${ip}:3000" | Set-Content $envFile

# 4. Levantar Backend en nueva ventana
Write-Host "4. Levantando Backend (NestJS)..."
Start-Process powershell -ArgumentList "-NoExit -Command `"`$host.ui.RawUI.WindowTitle='Redeco-Backend'; cd backend; npm run start:dev`""

# 5. Levantar Frontend en nueva ventana
Write-Host "5. Levantando Frontend (Angular/Ionic)..."
Start-Process powershell -ArgumentList "-NoExit -Command `"`$host.ui.RawUI.WindowTitle='Redeco-Frontend'; cd frontend; npm run start:ssl -- --host 0.0.0.0`""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "¡Todo levantado exitosamente!" -ForegroundColor Green
Write-Host "Backend API : https://${ip}:3000"
Write-Host "Frontend App: https://${ip}:8100"
Write-Host "Para probar desde el celular ingresa a:" -ForegroundColor Yellow
Write-Host "=> https://${ip}:8100" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
