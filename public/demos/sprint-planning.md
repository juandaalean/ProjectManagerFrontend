**Transcripción de reunión**

**Fecha:** 2 de junio de 2026

**Participantes:** Juanda, Laura, María, Carlos, Sergio

**María:** Buenos días a todos. Vamos a revisar los objetivos para las próximas semanas y dejar asignadas las tareas pendientes.

**Carlos:** Antes de empezar, quería comentar que el despliegue de la semana pasada fue bastante estable. Apenas tuvimos incidencias.

**Sergio:** Sí, salvo algunos picos de latencia que vimos durante unas horas el viernes.

**María:** Perfecto. Empecemos con los temas pendientes.

---

**Laura:** El primero está relacionado con el portal de clientes. Hemos recibido varias solicitudes para que los usuarios puedan restablecer su contraseña sin necesidad de contactar con soporte.

**María:** Es una funcionalidad importante.

**Carlos:** Además reducirá bastante la carga del equipo de atención al cliente.

**María:** De acuerdo. Creamos una nueva tarea.

**María:** Tarea: **Desarrollar un sistema de recuperación de contraseña para usuarios registrados.**

**María:** La prioridad de esta tarea será **alta**.

**María:** Los requisitos son:

* Añadir una opción "¿Olvidaste tu contraseña?" en la pantalla de acceso.
* Enviar un correo electrónico con enlace de recuperación.
* Generar tokens seguros con expiración de 30 minutos.
* Permitir establecer una nueva contraseña.
* Registrar los intentos de recuperación en el sistema de auditoría.

**María:** Esta tarea queda asignada a **Juanda**.

**Juanda:** Perfecto, me encargo.

**María:** La fecha límite será el **10 de junio de 2026**.

---

**Sergio:** El siguiente tema es más urgente. Hemos detectado que algunos informes financieros tardan demasiado en generarse cuando contienen grandes volúmenes de datos.

**Carlos:** En algunos casos el tiempo supera los dos minutos.

**Laura:** Eso está generando quejas de varios clientes.

**María:** Entonces necesitamos actuar cuanto antes.

**María:** Tarea: **Optimizar el rendimiento del módulo de generación de informes financieros.**

**María:** La prioridad será **crítica**.

**María:** Especificaciones:

* Analizar consultas lentas en la base de datos.
* Revisar índices y optimizar consultas SQL.
* Reducir el tiempo medio de generación por debajo de 20 segundos.
* Realizar pruebas de carga.
* Documentar las mejoras implementadas.

**María:** Responsable: **Carlos**.

**Carlos:** Entendido.

**María:** Fecha límite: **6 de junio de 2026 a las 18:00**.

---

**Laura:** Otro punto pendiente es la aplicación móvil.

**Sergio:** Sí, llevamos tiempo hablando de mejorar las notificaciones push.

**María:** Correcto.

**María:** Tarea: **Implementar un sistema avanzado de notificaciones push en la aplicación móvil.**

**María:** La prioridad será **media**.

**María:** Requisitos:

* Permitir segmentar notificaciones por tipo de usuario.
* Configurar envíos programados.
* Mostrar historial de notificaciones enviadas.
* Añadir métricas básicas de apertura.
* Garantizar compatibilidad con Android e iOS.

**María:** Esta tarea será para **Laura**.

**Laura:** De acuerdo.

**María:** Fecha límite: **24 de junio de 2026**.

---

**Carlos:** También tenemos pendiente la documentación del proyecto de integraciones.

**Juanda:** Es verdad, algunos compañeros nuevos están teniendo dificultades para entender la arquitectura actual.

**María:** Añadimos otra tarea.

**María:** Tarea: **Actualizar la documentación técnica del sistema de integraciones externas.**

**María:** Prioridad **baja**.

**María:** Debe incluir:

* Diagramas actualizados de arquitectura.
* Descripción de servicios y dependencias.
* Guías de despliegue.
* Ejemplos de configuración.
* Procedimientos de recuperación ante fallos.

**María:** Responsable: **Sergio**.

**Sergio:** Sin problema.

**María:** Fecha límite: **30 de junio de 2026**.

---

**Laura:** Queda un último tema relacionado con analítica.

**Carlos:** El departamento comercial quiere disponer de métricas en tiempo real.

**María:** Entonces vamos a crear una nueva tarea.

**María:** Tarea: **Desarrollar un panel de analítica en tiempo real para el área comercial.**

**María:** La prioridad será **alta**.

**María:** Especificaciones:

* Mostrar ventas diarias, semanales y mensuales.
* Incluir filtros por región y producto.
* Actualizar datos cada minuto.
* Permitir exportación a Excel y PDF.
* Implementar gráficos interactivos para tendencias.

**María:** Responsable: **Juanda**.

**Juanda:** Perfecto.

**María:** Fecha límite: **20 de junio de 2026**.

---

**Sergio:** ¿Hay alguna dependencia entre el panel de analítica y el proyecto de notificaciones?

**Juanda:** No directamente, aunque ambos consumirán parte de la misma API.

**Carlos:** Lo tendremos en cuenta durante las pruebas.

**María:** Perfecto. Entonces cerramos la reunión.

**María:** Resumen final:

* Recuperación de contraseña → Prioridad Alta → Juanda.
* Optimización de informes financieros → Prioridad Crítica → Carlos.
* Notificaciones push → Prioridad Media → Laura.
* Documentación de integraciones → Prioridad Baja → Sergio.
* Panel de analítica en tiempo real → Prioridad Alta → Juanda.

**Todos:** De acuerdo.
