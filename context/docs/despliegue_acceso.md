# Despliegue y acceso seguro

## Opcion A — Docker (recomendado en oficina)
```bash
cp backend/.env.example backend/.env   # completar valores reales (local, no se sube)
docker compose up -d --build
```
- Frontend: `http://localhost` · API: `http://localhost:8000/docs` · Health: `http://localhost:8000/api/health`.

## Opcion B — Modo en vivo sin ventanas (Windows, oficina)
Usar `scripts/` para arrancar oculto (sin pestanas de PowerShell):
- Doble clic en `scripts\en_vivo_oculto.vbs` → levanta backend (pythonw) + front (preview) ocultos.
- `scripts\detener.bat` → detiene ambos por puerto.
- Opcional: Programador de tareas → ejecutar `en_vivo_oculto.vbs` al iniciar sesion.

## Acceso para la jefa (remoto)
1. **Tailscale** (simple/seguro): instalar en oficina y en casa con la misma cuenta, `tailscale up`, y compartir la IP Tailscale del servidor (ej. `http://100.x.x.x`).
2. **Cloudflare Tunnel**: expone `https://reporte.tudominio.com` sin abrir puertos (ver `DEPLOYMENT.md`).
3. **VPN corporativa**: si ya existe, la jefa se conecta y abre la URL interna.

## Seguridad
- Jamas subir `backend/.env` ni credenciales al repo (estan en `.gitignore`).
- Solo exponer por tunel/VPN, nunca el puerto 8000 directo a internet sin autenticacion.
