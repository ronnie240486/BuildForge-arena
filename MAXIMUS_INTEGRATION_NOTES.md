# Integração Maximus — execução recuperada

## Fonte analisada

| Item | Resultado |
|---|---|
| Repositório | `https://github.com/ronnie240486/Maximus` |
| Commit clonado | `e771384` |
| Raiz detectada | `frontend` |
| Framework | Expo `54.0.35` com React Native `0.81.5` |
| Confiança | `0.959` |
| Gerenciador | Yarn com `yarn.lock` |

## Estratégia selecionada

O detector classificou corretamente o repositório como **Expo sem pasta Android pré-gerada**, escolhendo a estratégia `expo-prebuild-gradle`. Os passos previstos são instalar dependências com scripts desativados, executar `expo prebuild --platform android --no-install` e então usar o wrapper Gradle em `frontend/android` para `assembleRelease`.

## Evidências

- `frontend/package.json` declara `expo`, `react-native` e Yarn.
- `frontend/app.json` contém a configuração Expo.
- `frontend/eas.json` confirma a configuração de build Expo.
- A raiz do repositório possui uma pasta `frontend`, por isso o detector não tenta compilar o monorepo pela raiz.

## Segurança e limites do teste

O teste executa em clone isolado. A instalação de dependências usa `--ignore-scripts`, portanto o `preinstall` do repositório não é executado. O Expo prebuild e o Gradle são executados apenas porque a pessoa proprietária solicitou explicitamente o build real. O Android SDK usado no teste será instalado apenas no sandbox isolado e não modifica qualquer SDK da máquina Windows do usuário.

## Resultado real da tentativa de build

A detecção, a instalação controlada de dependências e o Expo prebuild concluíram corretamente. O Gradle iniciou, instalou o NDK Android `27.1.12297006` exigido pelo projeto e configurou os módulos Expo e React Native.

A build não produziu APK nesta máquina porque o Gradle encontrou apenas a instalação Java `21` sem a capacidade `JAVA_COMPILER` — isto é, há runtime Java, mas não há `javac`/JDK completo. A mensagem precisa foi:

> `Toolchain installation '/usr/lib/jvm/java-21-openjdk-amd64' does not provide the required capabilities: [JAVA_COMPILER]`

O próximo passo técnico é instalar um JDK completo compatível no ambiente isolado e reiniciar a mesma estratégia `expo-prebuild-gradle`. Esta limitação é do sandbox de teste, não da detecção do Maximus nem do código-fonte do projeto.

## Nova tentativa com JDK completo

O JDK `21.0.11` foi instalado e o compilador `javac` ficou disponível. A nova tentativa avançou além da falha anterior e instalou automaticamente o CMake `3.22.1` exigido pelo ambiente Android. Em seguida, o daemon Gradle voltou a desaparecer antes de finalizar o APK.

As evidências mostram que a detecção, o Yarn, o Expo prebuild, o Android SDK, o NDK, o JDK e o CMake foram aceitos. A interrupção restante é compatível com o limite de memória/processamento do sandbox para uma build Expo/React Native nativa; ela não fornece um erro de compilação do código Maximus. A estratégia correta para produção é executar o mesmo worker em uma máquina FMD dedicada ou runner com capacidade de memória maior, mantendo o mesmo comando e a mesma raiz detectada.
