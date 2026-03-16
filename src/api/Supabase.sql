-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.actuaciones (
  id text NOT NULL,
  recepcion_id text NOT NULL,
  fecha_inicio timestamp with time zone NOT NULL DEFAULT now(),
  fecha_fin timestamp with time zone,
  agente_id text NOT NULL,
  estado_id integer NOT NULL,
  tramite_id integer NOT NULL,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT actuaciones_pkey PRIMARY KEY (id),
  CONSTRAINT actuaciones_recepcion_id_fkey FOREIGN KEY (recepcion_id) REFERENCES public.recepciones(id),
  CONSTRAINT actuaciones_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id),
  CONSTRAINT actuaciones_tramite_id_fkey FOREIGN KEY (tramite_id) REFERENCES public.tramites(id),
  CONSTRAINT fk_actuacion_estado FOREIGN KEY (estado_id) REFERENCES public.estados_actuacion(id)
);
CREATE TABLE public.agentes (
  id text NOT NULL,
  apellido text NOT NULL,
  nombre text NOT NULL,
  dni text NOT NULL UNIQUE,
  cuil text NOT NULL UNIQUE,
  fecha_nacimiento date,
  genero_id integer,
  estado_civil_id integer,
  hijos_a_cargo integer DEFAULT 0,
  discapacidad boolean DEFAULT false,
  discapacidad_nombre text,
  telefono text,
  email text UNIQUE,
  domicilio text,
  nivel_estudio_id integer,
  titulo_obtenido text,
  fecha_inicio_sp date,
  modalidad_id integer,
  delegacion_id integer,
  area_id integer,
  cargo_id integer,
  fecha_vencimiento_contrato date,
  hora_ingreso text,
  horas_laborales integer,
  dias_laborales ARRAY,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT agentes_pkey PRIMARY KEY (id),
  CONSTRAINT agentes_genero_id_fkey FOREIGN KEY (genero_id) REFERENCES public.generos(id),
  CONSTRAINT agentes_estado_civil_id_fkey FOREIGN KEY (estado_civil_id) REFERENCES public.estados_civil(id),
  CONSTRAINT agentes_nivel_estudio_id_fkey FOREIGN KEY (nivel_estudio_id) REFERENCES public.niveles_estudio(id),
  CONSTRAINT agentes_modalidad_id_fkey FOREIGN KEY (modalidad_id) REFERENCES public.modalidades_contratacion(id),
  CONSTRAINT agentes_delegacion_id_fkey FOREIGN KEY (delegacion_id) REFERENCES public.delegaciones(id),
  CONSTRAINT agentes_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id),
  CONSTRAINT agentes_cargo_id_fkey FOREIGN KEY (cargo_id) REFERENCES public.cargos(id)
);
CREATE TABLE public.archivos_actuaciones (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  actuacion_id text NOT NULL,
  agente_id text NOT NULL,
  observacion text NOT NULL,
  es_mensaje_sistema boolean NOT NULL DEFAULT false,
  archivo_nombre text,
  archivo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT archivos_actuaciones_pkey PRIMARY KEY (id),
  CONSTRAINT archivos_actuaciones_actuacion_id_fkey FOREIGN KEY (actuacion_id) REFERENCES public.actuaciones(id),
  CONSTRAINT archivos_actuaciones_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id)
);
CREATE TABLE public.archivos_expedientes (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  expediente_id text NOT NULL,
  agente_id text NOT NULL,
  observacion text NOT NULL,
  es_mensaje_sistema boolean NOT NULL DEFAULT false,
  archivo_nombre text,
  archivo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT archivos_expedientes_pkey PRIMARY KEY (id),
  CONSTRAINT archivos_expedientes_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES public.expedientes(id),
  CONSTRAINT archivos_expedientes_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id)
);
CREATE TABLE public.archivos_recepciones (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  recepcion_id text NOT NULL,
  agente_id text NOT NULL,
  observacion text NOT NULL,
  es_mensaje_sistema boolean NOT NULL DEFAULT false,
  archivo_nombre text,
  archivo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT archivos_recepciones_pkey PRIMARY KEY (id),
  CONSTRAINT archivos_recepciones_recepcion_id_fkey FOREIGN KEY (recepcion_id) REFERENCES public.recepciones(id),
  CONSTRAINT archivos_recepciones_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id)
);
CREATE TABLE public.areas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT areas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.barrios (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  localidad_id integer NOT NULL,
  nombre text NOT NULL,
  CONSTRAINT barrios_pkey PRIMARY KEY (id),
  CONSTRAINT barrios_localidad_id_fkey FOREIGN KEY (localidad_id) REFERENCES public.localidades(id)
);
CREATE TABLE public.canales_atencion (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT canales_atencion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.cargos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT cargos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.categorias (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT categorias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ciudadanos (
  id text NOT NULL,
  tipo_entidad_id integer,
  apellido text NOT NULL,
  nombre text NOT NULL,
  dni text UNIQUE,
  cuil text UNIQUE,
  fecha_nacimiento date,
  genero_id integer,
  nivel_estudio_id integer,
  ocupacion_id integer,
  telefono text,
  email text,
  calle text,
  altura text,
  piso text,
  dpto text,
  barrio_id integer,
  tipo_contacto_id integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ciudadanos_pkey PRIMARY KEY (id),
  CONSTRAINT ciudadanos_tipo_entidad_id_fkey FOREIGN KEY (tipo_entidad_id) REFERENCES public.tipos_entidad(id),
  CONSTRAINT ciudadanos_genero_id_fkey FOREIGN KEY (genero_id) REFERENCES public.generos(id),
  CONSTRAINT ciudadanos_nivel_estudio_id_fkey FOREIGN KEY (nivel_estudio_id) REFERENCES public.niveles_estudio(id),
  CONSTRAINT ciudadanos_ocupacion_id_fkey FOREIGN KEY (ocupacion_id) REFERENCES public.ocupaciones(id),
  CONSTRAINT ciudadanos_barrio_id_fkey FOREIGN KEY (barrio_id) REFERENCES public.barrios(id),
  CONSTRAINT ciudadanos_tipo_contacto_id_fkey FOREIGN KEY (tipo_contacto_id) REFERENCES public.tipos_contacto(id)
);
CREATE TABLE public.delegaciones (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT delegaciones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.departamentos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT departamentos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.estados_actuacion (
  id smallint NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT estados_actuacion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.estados_civil (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT estados_civil_pkey PRIMARY KEY (id)
);
CREATE TABLE public.estados_expediente (
  id smallint NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT estados_expediente_pkey PRIMARY KEY (id)
);
CREATE TABLE public.estados_recepcion (
  id smallint NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT estados_recepcion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.expedientes (
  id text NOT NULL,
  codigo text NOT NULL UNIQUE,
  titulo text,
  observaciones text,
  agente_id text NOT NULL,
  estado_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT expedientes_pkey PRIMARY KEY (id),
  CONSTRAINT expedientes_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id),
  CONSTRAINT fk_expediente_estado FOREIGN KEY (estado_id) REFERENCES public.estados_expediente(id)
);
CREATE TABLE public.expedientes_ciudadanos (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  expediente_id text NOT NULL,
  ciudadano_id text NOT NULL,
  CONSTRAINT expedientes_ciudadanos_pkey PRIMARY KEY (id),
  CONSTRAINT expedientes_ciudadanos_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES public.expedientes(id),
  CONSTRAINT expedientes_ciudadanos_ciudadano_id_fkey FOREIGN KEY (ciudadano_id) REFERENCES public.ciudadanos(id)
);
CREATE TABLE public.generos (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT generos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.licencias (
  id text NOT NULL,
  agente_id text NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  certificado_presentado boolean DEFAULT false,
  url_adjunto text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  detalles text,
  tipo_licencia_id smallint,
  CONSTRAINT licencias_pkey PRIMARY KEY (id),
  CONSTRAINT licencias_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id),
  CONSTRAINT licencias_tipo_licencia_id_fkey FOREIGN KEY (tipo_licencia_id) REFERENCES public.tipos_licencia(id)
);
CREATE TABLE public.localidades (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  departamento_id integer NOT NULL,
  nombre text NOT NULL,
  CONSTRAINT localidades_pkey PRIMARY KEY (id),
  CONSTRAINT localidades_departamento_id_fkey FOREIGN KEY (departamento_id) REFERENCES public.departamentos(id)
);
CREATE TABLE public.modalidades_contratacion (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT modalidades_contratacion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.niveles_estudio (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT niveles_estudio_pkey PRIMARY KEY (id)
);
CREATE TABLE public.ocupaciones (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT ocupaciones_pkey PRIMARY KEY (id)
);
CREATE TABLE public.organismos_externos (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT organismos_externos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.permisos (
  id smallint NOT NULL,
  clave_tecnica text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  CONSTRAINT permisos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recepciones (
  id text NOT NULL,
  reprogramado boolean DEFAULT false,
  fecha_inicio timestamp with time zone NOT NULL DEFAULT now(),
  fecha_final timestamp with time zone,
  ciudadano_id text,
  area_origen_id integer,
  agente_origen_id text NOT NULL,
  canal_id integer NOT NULL,
  telefono text,
  email text,
  categoria_id integer,
  prioridad_id integer,
  estado_id integer NOT NULL,
  tipo_destinatario_id smallint,
  area_destino_id integer,
  organismo_destino_id integer,
  agente_responsable_id text,
  motivo_derivacion text,
  expediente_id text,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT recepciones_pkey PRIMARY KEY (id),
  CONSTRAINT recepciones_ciudadano_id_fkey FOREIGN KEY (ciudadano_id) REFERENCES public.ciudadanos(id),
  CONSTRAINT recepciones_area_origen_id_fkey FOREIGN KEY (area_origen_id) REFERENCES public.areas(id),
  CONSTRAINT recepciones_agente_origen_id_fkey FOREIGN KEY (agente_origen_id) REFERENCES public.agentes(id),
  CONSTRAINT recepciones_canal_id_fkey FOREIGN KEY (canal_id) REFERENCES public.canales_atencion(id),
  CONSTRAINT recepciones_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id),
  CONSTRAINT recepciones_prioridad_id_fkey FOREIGN KEY (prioridad_id) REFERENCES public.tipos_prioridad(id),
  CONSTRAINT recepciones_tipo_destinatario_id_fkey FOREIGN KEY (tipo_destinatario_id) REFERENCES public.tipos_destinatario(id),
  CONSTRAINT recepciones_area_destino_id_fkey FOREIGN KEY (area_destino_id) REFERENCES public.areas(id),
  CONSTRAINT recepciones_organismo_destino_id_fkey FOREIGN KEY (organismo_destino_id) REFERENCES public.organismos_externos(id),
  CONSTRAINT recepciones_agente_responsable_id_fkey FOREIGN KEY (agente_responsable_id) REFERENCES public.agentes(id),
  CONSTRAINT recepciones_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES public.expedientes(id),
  CONSTRAINT fk_recepcion_estado FOREIGN KEY (estado_id) REFERENCES public.estados_recepcion(id)
);
CREATE TABLE public.tipos_contacto (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT tipos_contacto_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_destinatario (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT tipos_destinatario_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_entidad (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT tipos_entidad_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_estado (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT tipos_estado_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_licencia (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT tipos_licencia_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_prioridad (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  descripcion text NOT NULL,
  CONSTRAINT tipos_prioridad_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tipos_usuario (
  id smallint NOT NULL,
  nombre text NOT NULL UNIQUE,
  descripcion text NOT NULL,
  CONSTRAINT tipos_usuario_pkey PRIMARY KEY (id)
);
CREATE TABLE public.tramites (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  categoria_id integer NOT NULL,
  nombre text NOT NULL,
  CONSTRAINT tramites_pkey PRIMARY KEY (id),
  CONSTRAINT tramites_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id)
);
CREATE TABLE public.usuarios (
  id text NOT NULL,
  username text NOT NULL UNIQUE,
  password_raw text NOT NULL,
  agente_id text,
  estado boolean DEFAULT true,
  tipo_usuario_id smallint,
  accesos ARRAY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id),
  CONSTRAINT usuarios_tipo_usuario_id_fkey FOREIGN KEY (tipo_usuario_id) REFERENCES public.tipos_usuario(id)
);
CREATE TABLE public.v_user (
  id text,
  username text,
  password_raw text,
  agente_id text,
  estado boolean,
  tipo_usuario_id smallint,
  accesos ARRAY,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  nombre text,
  apellido text,
  area_id integer
);