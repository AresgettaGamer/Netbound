# Netbound! v1.0.0

Addon para Minecraft Bedrock 26.30+ (plataforma de contenido
`1.21.130`). Permite capturar criaturas vanilla y de otros addons dentro de
estructuras persistentes del mundo, conservando mucho más estado que una
recreación con `spawnEntity`.

## Instalación

1. Libera primero cualquier criatura guardada en una red v0.1.x.
2. Reemplaza los paquetes anteriores e importa
   `Netbound_v1.0.0.mcaddon`.
3. Activa **Netbound! BP** y **Netbound! RP** en el mundo.
4. No requiere experimentos ni una versión Preview.
5. El Behavior Pack depende de `@minecraft/server` 2.8.0 y
   `@minecraft/server-ui` 2.1.0.

> El namespace cambió de `ares_net` a `netbound`. Las redes v0.1.x no se
> migran: después de liberar su contenido, descártalas y consigue una nueva.

## Cambios de v0.2.0

- Nueva identidad completa **Netbound!** y namespace `netbound`.
- La interfaz muestra criatura, domesticación, etiqueta, HP y addon de origen.
- Catálogo editable para corregir identifiers poco descriptivos de otros addons.
- Alex's Mobs incluye nombres iniciales para las criaturas reconstruidas.
- Se mantienen los iconos genéricos seguros para vanilla, addons, hostiles y
  criaturas propias.

## Cambios de v0.2.1

- Cada botón usa como máximo dos líneas visibles: nombre y etiqueta en la
  primera; HP y addon de origen en la segunda.
- Se eliminó el prefijo largo `Etiqueta:` para evitar que la vida quede oculta.
- Se añadió `alexs_mobs:flying_fish` al catálogo como **Pez volador**.
- Es totalmente compatible con las redes y capturas creadas en v0.2.0.

## Cambios de v0.3.0

- Se eliminó “Domesticado” del texto; el icono de corazón conserva esa función.
- HP y addon usan el color automático del botón para permanecer visibles tanto
  seleccionado como sin seleccionar.
- Autor actualizado a **AresgettaYT**.
- Catálogo ampliado con Gorila y entidades de Better On Bedrock, Beyond The
  Underground, Crabber's Delight Bedrock y Shark Biology 2.
- Proyectiles, placeholders, bloques-entidad y auxiliares detectados en esos
  addons se bloquean explícitamente.
- Compatible con todas las redes y capturas v0.2.x.

## Cambios de v0.3.1

- El Resource Pack declara la capacidad `pbr` para mantener activo el modo
  Visuales Vibrantes.
- No modifica identifiers, redes ni criaturas almacenadas en v0.3.0.

## Cambios de v0.4.0

- El catálogo local fue sustituido por el cliente opcional de **WATI Core**.
- Nombres de entidad y addon se consultan bajo demanda y quedan en caché.
- Si WATI no está activo, Netbound! conserva la clave de traducción original de
  la criatura o humaniza su identifier; la captura y liberación nunca dependen
  del catálogo.
- Los nombres almacenados en WATI se precargan durante la captura para que la
  interfaz normalmente ya los tenga resueltos al abrir la red.
- Conserva UUIDs, namespace, item, propiedades dinámicas y estructuras de
  v0.2.x/v0.3.x; no hace falta liberar capturas antes de actualizar.

## Cambios de v0.4.1

- Nuevo icono de pack creado por AresgettaYT.
- Sin cambios de captura, almacenamiento, identifiers ni estructuras; es una
  actualización visual compatible con redes y criaturas de v0.4.0.

## Cambios de v0.5.0

- Netbound! ahora prioriza la clave de traducción de la entidad original y usa
  el nombre de WATI únicamente como respaldo. Los nombres ya no quedan en
  inglés cuando el addon aporta `es_MX`.
- Compatible con WATI Core v0.2.0 y su descriptor de excepciones
  `preferWati`.
- Nuevo icono final con el subtítulo **Capture - Store - Release**, creado por
  AresgettaYT.
- Se añadió la licencia MIT del proyecto. No cambian el namespace, item,
  estructuras ni propiedades dinámicas; todas las capturas v0.2+ siguen siendo
  compatibles.

## Cambios de v1.0.0

- Primera versión pública estable, promovida sin cambios funcionales desde la
  compilación v0.5.0 aprobada en un servidor con entidades vanilla y de addons.
- UUIDs, namespace, item, propiedades dinámicas y nombres de estructuras se
  conservan; las redes creadas desde v0.2.0 siguen siendo compatibles.
- Integración opcional con WATI Core 1.0.0 publicado en CurseForge.
- Código y recursos originales publicados bajo licencia MIT, conservando el
  aviso de terceros de Catch 'Em All.

## Uso

- Usa la red sobre una criatura para capturarla.
- Usa la red sobre un bloque para liberar una captura.
- Si contiene varias criaturas, se abre un formulario para elegir.
- Cada entrada indica el addon de procedencia y conserva la etiqueta separada
  del nombre de la especie.
- En el inventario, el lore indica cuántas criaturas contiene.

## Catálogo universal opcional

`BP/scripts/wati_client.js` consulta **WATI Core** sin crear una dependencia
obligatoria en el manifest. Los nombres y namespaces del servidor se editan una
sola vez en `WATI/registry/catalog.json`; WAWLA puede consumir exactamente el
mismo registro.

- CurseForge: https://www.curseforge.com/minecraft-bedrock/addons/wati-core
- Código fuente: https://github.com/AresgettaGamer/WATI-Core

Si WATI no está instalado, los identifiers desconocidos siguen funcionando:
Netbound! usa la clave de traducción propia de la entidad cuando existe y, como
último recurso, convierte el identifier en texto legible.

## Reglas de seguridad iniciales

- Se admiten animales pacíficos, neutrales, hostiles normales y entidades de
  otros addons que tengan `minecraft:health`.
- Las criaturas domesticables todavía salvajes se pueden capturar.
- Una criatura domesticada solo se puede capturar si la API identifica al
  jugador que usa la red como su propietario.
- Si está domesticada pero el propietario no se puede verificar, se bloquea.
- Se bloquean jugadores, jefes definidos, entidades sin vida, criaturas
  montadas, criaturas con pasajeros y criaturas atadas.
- `alexs_mobs:anaconda` queda bloqueada hasta validar el sistema multiparte.
- Una celda de captura debe contener únicamente la criatura objetivo; esto
  evita clonar accidentalmente objetos u otras entidades cercanas.

## Capacidad y durabilidad

- Capacidad predeterminada: 10 criaturas por red.
- Vida máxima permitida: 250 HP efectivos.
- El coste de captura usa la vida máxima efectiva, no la vida actual. Herir una
  criatura no reduce el coste ni permite saltarse el límite.
- Durabilidad predeterminada de la red: 1,000 puntos.

Los valores y listas de bloqueo están en `BP/scripts/config.js`.

## Diagnóstico administrativo

Con permisos para ejecutar comandos:

```mcfunction
/scriptevent netbound:status
/scriptevent netbound:repair_held
```

- `status` muestra cuántas estructuras activas registra el addon.
- `repair_held` elimina de la red sostenida únicamente referencias cuyo archivo
  de estructura ya no existe. No borra estructuras ni entidades.

## Pruebas recomendadas

1. Vaca con nombre y vida parcial.
2. Oveja bebé y oveja teñida.
3. Zombi con equipamiento.
4. Lobo salvaje.
5. Lobo propio y lobo de otro jugador.
6. Entidad atada, montada o con pasajero.
7. Cucaracha, colibrí, mapache, oso hormiguero y los tres bagres.
8. Reiniciar el servidor con criaturas guardadas y liberarlas después.
9. Copiar una red ocupada en creativo y comprobar que la segunda copia falle
   de forma segura después de liberar la primera.

## Limitaciones conocidas

- La documentación de Bedrock confirma que las estructuras incluyen entidades,
  pero no garantiza cada dato interno de todos los addons. Cada criatura con
  scripts propios debe probarse.
- Si una red ocupada es destruida, su estructura permanece en el mundo para
  evitar pérdida irreversible. La primera versión no elimina automáticamente
  estructuras que podrían contener una criatura recuperable.
- Los sistemas de domesticación personalizados que no usen
  `minecraft:tameable`, `minecraft:tamemount` o `minecraft:is_tamed` requieren
  un adaptador específico.

## Créditos y licencia de terceros

La arquitectura de almacenamiento por estructuras y selección múltiple fue
inspirada por **Catch 'Em All**, de ByCesarDev, publicado bajo licencia MIT.
La licencia correspondiente está en
`THIRD_PARTY_LICENSES/Catch_Em_All_MIT.txt`.

El código y los recursos originales de Netbound! se publican bajo la licencia
MIT incluida en `LICENSE`.

No se reutilizó código, nombre, textura ni recurso de Magic Net, publicado como
All Rights Reserved.
