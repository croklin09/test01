# Auditoría semanal de Claude Code

Skill + programación para correr la auditoría todos los viernes 18:00 (ART) **en la PC de Lucas**
(los transcripts y el vault están en `C:\Users\lucho\...`; una sesión en la nube no los ve).

## 1. Instalar la skill (una vez)

Copiar `skills/auditoria-semanal/` a `C:\Users\lucho\.claude\skills\auditoria-semanal\`.

```powershell
git clone -b ccr-cc4b68bc-f9ebv3 https://github.com/croklin09/test01 $env:TEMP\test01
Copy-Item -Recurse -Force "$env:TEMP\test01\claude-setup\skills\auditoria-semanal" "$env:USERPROFILE\.claude\skills\"
```

Probar a mano: en Claude Code (local) → `/auditoria-semanal`.

## 2. Programarla — elegir UNA opción

**A. App Claude Desktop (recomendada)** — pestaña Code → Scheduled tasks → New:
- Prompt: `/auditoria-semanal`
- Frecuencia: semanal, viernes, 18:00
- Carpeta: `C:\Users\lucho`
- Requiere la app abierta y la PC prendida a esa hora.

**B. Programador de tareas de Windows** (no depende de la app abierta):
```powershell
powershell -ExecutionPolicy Bypass -File "$env:TEMP\test01\claude-setup\scheduler\registrar-auditoria-semanal.ps1"
```
Log en `%USERPROFILE%\.claude\logs\auditoria-semanal-AAAA-MM-DD.log`.

No usar las dos a la vez: generarían dos informes el mismo día.
