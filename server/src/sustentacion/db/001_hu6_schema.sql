-- =====================================================================================
-- HU-6 · Sustentación — esquema PostgreSQL alineado con el documento "acuerdoss.txt"
--
--   public.sustentaciones  -> TABLA DEL CONTRATO (HU-7 la LEE):
--       id, trabajoId, fecha, hora, modalidad, calificacion, estado
--       · ids de texto con prefijo (s-001, igual que t-001 / e-001)
--       · columnas en camelCase (entre comillas dobles en SQL)
--       · estados en minúscula con guion bajo: programada, realizada, reprogramada, desaprobada
--       · columnas EXTRA de HU-6 que HU-7 puede ignorar: "salaId", "programadaEl"
--
--   Esquema hu6.*  -> tablas internas de HU-6 y copias de lectura TEMPORALES (*_ref) de las
--   tablas de HU-1/HU-2/HU-3/HU-4. Cuando esas historias existan en la base, hu6.trabajos_ref
--   se reemplaza por public.trabajos (id t-012, ...), sin tocar sus tablas.
-- Inicializar con npm run hu6:setup desde server/.
-- =====================================================================================
CREATE SCHEMA IF NOT EXISTS hu6;

CREATE TABLE IF NOT EXISTS hu6.docentes (
  id VARCHAR(24) PRIMARY KEY,
  usuario_id VARCHAR(32),
  titulo VARCHAR(12) NOT NULL,
  nombres VARCHAR(120) NOT NULL,
  apellidos VARCHAR(120) NOT NULL,
  grado VARCHAR(20) NOT NULL CHECK (grado IN ('doctor','magíster','ingeniero')),
  departamento VARCHAR(120) NOT NULL,
  jurados_previos INTEGER NOT NULL DEFAULT 0 CHECK (jurados_previos >= 0)
);

CREATE TABLE IF NOT EXISTS hu6.salas (
  id VARCHAR(24) PRIMARY KEY,
  pabellon VARCHAR(80) NOT NULL,
  ubicacion VARCHAR(180) NOT NULL,
  asientos INTEGER NOT NULL CHECK (asientos > 0)
);

-- Copia de lectura de HU-2 (trabajos) y HU-4 (entregables aprobados / total).
-- "id" es el mismo id que usa HU-2 (t-012); "codigo" es el código visible (TFC-2026-2-012).
CREATE TABLE IF NOT EXISTS hu6.trabajos_ref (
  id VARCHAR(24) PRIMARY KEY CHECK (id ~ '^t-[0-9]+$'),
  codigo VARCHAR(40) NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  linea VARCHAR(140) NOT NULL,
  departamento VARCHAR(140) NOT NULL,
  estado VARCHAR(30) NOT NULL DEFAULT 'concluido' CHECK (estado IN ('propuesta', 'en_desarrollo', 'concluido', 'desistido')),
  asesor_id VARCHAR(24) REFERENCES hu6.docentes(id),
  asesor VARCHAR(240) NOT NULL,
  aprobados INTEGER NOT NULL CHECK (aprobados >= 0),
  total INTEGER NOT NULL CHECK (total > 0 AND aprobados <= total),
  informe_aprobado_el DATE
);

-- Copia de lectura de HU-2 (integrantes_trabajo: trabajoId, estudianteId, esResponsable).
CREATE TABLE IF NOT EXISTS hu6.integrantes_ref (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  trabajo_codigo VARCHAR(40) NOT NULL REFERENCES hu6.trabajos_ref(codigo) ON DELETE CASCADE,
  usuario_id VARCHAR(32),
  nombre VARCHAR(240) NOT NULL,
  corto VARCHAR(240) NOT NULL,
  responsable BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (trabajo_codigo, usuario_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS hu6_integrante_responsable_unico ON hu6.integrantes_ref(trabajo_codigo) WHERE responsable;

CREATE TABLE IF NOT EXISTS hu6.conflictos_ref (
  trabajo_codigo VARCHAR(40) NOT NULL REFERENCES hu6.trabajos_ref(codigo) ON DELETE CASCADE,
  docente_id VARCHAR(24) NOT NULL REFERENCES hu6.docentes(id),
  motivo TEXT NOT NULL,
  PRIMARY KEY (trabajo_codigo, docente_id)
);

CREATE TABLE IF NOT EXISTS hu6.reservas_sala (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sala_id VARCHAR(24) NOT NULL REFERENCES hu6.salas(id),
  fecha DATE NOT NULL,
  hora TIME(0) NOT NULL,
  motivo TEXT NOT NULL,
  UNIQUE (sala_id, fecha, hora)
);

-- ===== TABLA DEL CONTRATO (acuerdos, HU-6): id, trabajoId, fecha, hora, modalidad, calificacion, estado =====
CREATE TABLE IF NOT EXISTS public.sustentaciones (
  "id" VARCHAR(24) PRIMARY KEY CHECK ("id" ~ '^s-[0-9]+$'),
  "trabajoId" VARCHAR(24) NOT NULL UNIQUE REFERENCES hu6.trabajos_ref(id),
  "fecha" DATE NOT NULL,
  "hora" TIME(0) NOT NULL,
  "modalidad" VARCHAR(12) NOT NULL CHECK ("modalidad" IN ('Presencial','Virtual','Híbrida')),
  "calificacion" SMALLINT CHECK ("calificacion" BETWEEN 0 AND 20),
  "estado" VARCHAR(20) NOT NULL DEFAULT 'programada' CHECK ("estado" IN ('programada','realizada','reprogramada','desaprobada')),
  -- Columnas extra de HU-6 (no forman parte del contrato; HU-7 no las necesita):
  "salaId" VARCHAR(24) REFERENCES hu6.salas(id),
  "programadaEl" DATE NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT hu6_sala_modalidad CHECK (("modalidad" = 'Virtual' AND "salaId" IS NULL) OR ("modalidad" <> 'Virtual' AND "salaId" IS NOT NULL)),
  -- Una sustentación cerrada (realizada o desaprobada) siempre tiene calificación final.
  CONSTRAINT hu6_calificacion_si_cerrada CHECK ("estado" NOT IN ('realizada','desaprobada') OR "calificacion" IS NOT NULL)
);
-- Impide reservas duplicadas de la misma sala en el mismo bloque.
CREATE UNIQUE INDEX IF NOT EXISTS hu6_sala_bloque_unico ON public.sustentaciones ("salaId", "fecha", "hora") WHERE "salaId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS hu6_sustentaciones_fecha_idx ON public.sustentaciones ("fecha", "hora");

CREATE TABLE IF NOT EXISTS hu6.jurados (
  sustentacion_id VARCHAR(24) NOT NULL REFERENCES public.sustentaciones("id") ON DELETE CASCADE,
  docente_id VARCHAR(24) NOT NULL REFERENCES hu6.docentes(id),
  presidente BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (sustentacion_id, docente_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS hu6_un_presidente ON hu6.jurados(sustentacion_id) WHERE presidente;
CREATE INDEX IF NOT EXISTS hu6_docente_jurado_idx ON hu6.jurados(docente_id);

-- La nota final NO se repite aquí: vive en public.sustentaciones."calificacion".
CREATE TABLE IF NOT EXISTS hu6.actas (
  sustentacion_id VARCHAR(24) PRIMARY KEY REFERENCES public.sustentaciones("id") ON DELETE CASCADE,
  resultado VARCHAR(30) CHECK (resultado IN ('Aprobado','Aprobado con observaciones','Desaprobado')),
  observaciones TEXT NOT NULL DEFAULT '',
  registrada BOOLEAN NOT NULL DEFAULT FALSE,
  registrada_el DATE,
  registrada_hora TIME(0),
  CONSTRAINT hu6_acta_definitiva CHECK (NOT registrada OR (resultado IS NOT NULL AND registrada_el IS NOT NULL AND registrada_hora IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS hu6.calificaciones (
  sustentacion_id VARCHAR(24) NOT NULL REFERENCES hu6.actas(sustentacion_id) ON DELETE CASCADE,
  criterio_id VARCHAR(24) NOT NULL CHECK (criterio_id IN ('rigor','resultados','informe','exposicion')),
  nota SMALLINT NOT NULL CHECK (nota BETWEEN 0 AND 20),
  PRIMARY KEY(sustentacion_id, criterio_id)
);

CREATE TABLE IF NOT EXISTS hu6.historial_reprogramaciones (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sustentacion_id VARCHAR(24) NOT NULL REFERENCES public.sustentaciones("id") ON DELETE CASCADE,
  fecha_anterior DATE NOT NULL,
  hora_anterior TIME(0) NOT NULL,
  sala_anterior VARCHAR(24) REFERENCES hu6.salas(id),
  motivo TEXT NOT NULL CHECK (char_length(trim(motivo)) >= 10),
  registrado_el DATE NOT NULL DEFAULT CURRENT_DATE
);
