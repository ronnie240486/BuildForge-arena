import { db } from "@/db";
import { buildWorkers } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getAppUrl } from "@/lib/app-url";
import { eq, and, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Generates a one-click installer script (Windows .bat or Unix .sh) with the
// user's token + server URL already embedded. Double-click to run — no CMD needed.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const os = (url.searchParams.get("os") || "windows").toLowerCase();
  const tokenParam = url.searchParams.get("token") || "";

  // Resolve the token: use the provided one if it belongs to this user,
  // otherwise fall back to the user's most recent worker.
  let token = "";
  if (tokenParam) {
    const [w] = await db
      .select()
      .from(buildWorkers)
      .where(and(eq(buildWorkers.token, tokenParam), eq(buildWorkers.ownerId, user.id)))
      .limit(1);
    if (w) token = w.token;
  }
  if (!token) {
    const [w] = await db
      .select()
      .from(buildWorkers)
      .where(eq(buildWorkers.ownerId, user.id))
      .orderBy(desc(buildWorkers.createdAt))
      .limit(1);
    token = w?.token || "COLE_SEU_TOKEN_AQUI";
  }

  const server = await getAppUrl();

  if (os === "windows") {
    const bat = `@echo off
REM ============================================================
REM  BuildForge Worker - Instalador (Windows)
REM  De DUPLO-CLIQUE neste arquivo.
REM ============================================================
setlocal enabledelayedexpansion
title BuildForge Worker
color 0B
echo.
echo   ====================================================
echo    BuildForge Worker - Instalador automatico
echo   ====================================================
echo.

set "SERVER=${server}"
set "TOKEN=${token}"

REM --- Node.js ---
where node >nul 2>nul
if errorlevel 1 goto NONODE
for /f "delims=" %%v in ('node -v') do echo   [OK] Node.js %%v
goto CHECKSDK

:NONODE
echo   [X] Node.js NAO encontrado.
echo   Instale a versao LTS em https://nodejs.org e rode de novo.
start "" https://nodejs.org/en/download
echo.
pause
exit /b 1

:CHECKSDK
if defined ANDROID_HOME goto SDKOK
if exist "%LOCALAPPDATA%\\Android\\Sdk\\platform-tools" goto SETSDK
echo   [!] Android SDK nao encontrado. Abra o Android Studio e o SDK Manager.
goto CHECKJDK
:SETSDK
set "ANDROID_HOME=%LOCALAPPDATA%\\Android\\Sdk"
setx ANDROID_HOME "%LOCALAPPDATA%\\Android\\Sdk" >nul 2>nul
echo   [OK] Android SDK: !ANDROID_HOME!
goto CHECKJDK
:SDKOK
echo   [OK] ANDROID_HOME = %ANDROID_HOME%

:CHECKJDK
if defined JAVA_HOME goto JDKOK
set "JBR="
if exist "%ProgramFiles%\\Android\\Android Studio\\jbr\\bin\\java.exe" set "JBR=%ProgramFiles%\\Android\\Android Studio\\jbr"
if not defined JBR if exist "%LOCALAPPDATA%\\Programs\\Android Studio\\jbr\\bin\\java.exe" set "JBR=%LOCALAPPDATA%\\Programs\\Android Studio\\jbr"
if not defined JBR if exist "C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe" set "JBR=C:\\Program Files\\Android\\Android Studio\\jbr"
if defined JBR goto SETJDK
echo   [!] JDK nao encontrado. No Android Studio: Settings ^> Build ^> Build Tools ^> Gradle ^> Gradle JDK.
goto CHECKGIT
:SETJDK
set "JAVA_HOME=!JBR!"
setx JAVA_HOME "!JBR!" >nul 2>nul
set "PATH=!JBR!\\bin;%PATH%"
echo   [OK] JDK detectado: !JBR!
goto CHECKGIT
:JDKOK
echo   [OK] JAVA_HOME = %JAVA_HOME%
set "PATH=%JAVA_HOME%\\bin;%PATH%"

:CHECKGIT
set "PROJECTARG="
where git >nul 2>nul
if errorlevel 1 goto NOGIT
for /f "delims=" %%v in ('git --version') do echo   [OK] %%v
goto DOWNLOAD
:NOGIT
echo.
echo   [!] Git nao encontrado. Voce pode compilar a PASTA LOCAL do projeto.
echo       (ou instale o Git em https://git-scm.com)
set /p "PROJDIR=   Cole o caminho da pasta do projeto (ou ENTER p/ GitHub): "
if defined PROJDIR set "PROJECTARG=--project "!PROJDIR!""

:DOWNLOAD
echo.
echo   Baixando o agente de !SERVER! ...
set "AGENT=%TEMP%\\bfworker.js"
set "DL=%TEMP%\\bfdl.js"
REM Gravamos o downloader num arquivo .js (evita problemas de escape com ! e aspas no cmd).
call :WRITEDL
node "%DL%" "!SERVER!" "!AGENT!"
if errorlevel 1 goto ASKURL
echo   [OK] Agente baixado.
echo.
echo   ====================================================
echo    Worker CONECTADO. Deixe esta janela aberta.
echo    Dispare um build REAL no site que ele compila aqui.
echo   ====================================================
echo.
node "!AGENT!" --server "!SERVER!" --token "!TOKEN!" !PROJECTARG!
echo.
echo   Worker encerrado.
pause
exit /b 0

:WRITEDL
REM Escreve o downloader em %DL%. Delayed expansion fica DESLIGADO aqui,
REM entao os "!" do codigo JS sao preservados corretamente.
setlocal disabledelayedexpansion
> "%DL%" echo var lib=require('https'),http=require('http'),fs=require('fs');
>>"%DL%" echo var url=process.argv[2]+'/api/worker/script';
>>"%DL%" echo var out=process.argv[3];
>>"%DL%" echo var mod=url.lastIndexOf('https',0)===0?lib:http;
>>"%DL%" echo mod.get(url,function(r){
>>"%DL%" echo   if(r.statusCode!==200){process.exit(2);}
>>"%DL%" echo   var w=fs.createWriteStream(out);
>>"%DL%" echo   r.pipe(w);
>>"%DL%" echo   w.on('finish',function(){process.exit(0);});
>>"%DL%" echo   w.on('error',function(){process.exit(4);});
>>"%DL%" echo }).on('error',function(){process.exit(3);});
endlocal
goto :eof

:ASKURL
echo   [X] Nao consegui baixar de !SERVER!
echo   O link do preview pode ter mudado. Copie a URL atual do site.
set "NEWURL="
set /p "NEWURL=   Cole a URL atual (https://...) e ENTER: "
if defined NEWURL set "SERVER=!NEWURL!"
goto DOWNLOAD
`;
    return new Response(bat, {
      headers: {
        "Content-Type": "application/bat; charset=utf-8",
        "Content-Disposition": 'attachment; filename="BuildForge-Worker.bat"',
        "Cache-Control": "no-store",
      },
    });
  }

  // macOS / Linux
  const sh = `#!/usr/bin/env bash
# ============================================================
#  BuildForge Worker - Instalador de 1 clique (macOS/Linux)
#  Rode:  bash BuildForge-Worker.command
#  (ou torne executavel: chmod +x e clique duas vezes)
# ============================================================
set -e
echo ""
echo "  ===================================================="
echo "   BuildForge Worker - Instalador automatico"
echo "  ===================================================="
echo ""

if ! command -v node >/dev/null 2>&1; then
  echo "  [X] Node.js nao encontrado. Instale em https://nodejs.org e rode de novo."
  command -v open >/dev/null && open https://nodejs.org/en/download || true
  read -p "  Pressione ENTER para sair..." _; exit 1
fi
echo "  [OK] Node.js $(node -v)"

# Detecta Android SDK
if [ -n "$ANDROID_HOME" ]; then
  echo "  [OK] ANDROID_HOME=$ANDROID_HOME"
elif [ -d "$HOME/Library/Android/sdk" ]; then
  export ANDROID_HOME="$HOME/Library/Android/sdk"; echo "  [OK] Android SDK: $ANDROID_HOME"
elif [ -d "$HOME/Android/Sdk" ]; then
  export ANDROID_HOME="$HOME/Android/Sdk"; echo "  [OK] Android SDK: $ANDROID_HOME"
else
  echo "  [!] Android SDK nao encontrado. Abra o Android Studio > SDK Manager."
fi

# git é necessário para clonar do GitHub. Se faltar, usa a pasta local.
PROJECTARG=""
if ! command -v git >/dev/null 2>&1; then
  echo "  [!] Git nao encontrado."
  read -p "  Caminho da pasta do projeto (ENTER p/ usar GitHub): " PROJDIR
  [ -n "$PROJDIR" ] && PROJECTARG="--project $PROJDIR"
else
  echo "  [OK] $(git --version)"
fi

SERVER="${server}"
TOKEN="${token}"
while true; do
  echo "  Baixando o agente de $SERVER ..."
  if node -e "const https=require('https');const http=require('http');const fs=require('fs');const u=process.argv[1]+'/api/worker/script';const m=u.startsWith('https')?https:http;m.get(u,r=>{if(r.statusCode!==200){process.exit(2);}const f=fs.createWriteStream('/tmp/bfworker.js');r.pipe(f);f.on('finish',()=>process.exit(0));}).on('error',()=>process.exit(3));" "$SERVER"; then
    echo "  [OK] Agente baixado."; break
  fi
  echo "  [X] Nao consegui baixar. O link do preview pode ter mudado."
  read -p "  Cole a URL atual (ou ENTER p/ tentar de novo): " NEWURL
  [ -n "$NEWURL" ] && SERVER="$NEWURL"
done
echo ""
echo "  ===================================================="
echo "   Worker CONECTADO. Deixe esta janela aberta."
echo "   Dispare um build REAL no site que ele compila aqui."
echo "  ===================================================="
echo ""
node /tmp/bfworker.js --server "$SERVER" --token "$TOKEN" $PROJECTARG
`;
  return new Response(sh, {
    headers: {
      "Content-Type": "application/x-sh; charset=utf-8",
      "Content-Disposition": 'attachment; filename="BuildForge-Worker.command"',
      "Cache-Control": "no-store",
    },
  });
}
