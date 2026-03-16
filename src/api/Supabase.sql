-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.actuaciones (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  recepcion_id text NOT NULL,
  fecha_inicio timestamp with time zone NOT NULL DEFAULT now(),
  fecha_fin timestamp with time zone,
  agente_id uuid NOT NULL,
  estado_id smallint NOT NULL,
  tramite_id integer NOT NULL,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  eliminado boolean DEFAULT false,
  eliminado_por uuid,
  eliminado_at timestamp with time zone,
  CONSTRAINT actuaciones_pkey PRIMARY KEY (id),
  CONSTRAINT actuaciones_recepcion_id_fkey FOREIGN KEY (recepcion_id) REFERENCES public.recepciones(id),
  CONSTRAINT actuaciones_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id),
  CONSTRAINT actuaciones_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estados_actuacion(id),
  CONSTRAINT actuaciones_tramite_id_fkey FOREIGN KEY (tramite_id) REFERENCES public.tramites(id),
  CONSTRAINT actuaciones_eliminado_por_fkey FOREIGN KEY (eliminado_por) REFERENCES public.agentes(id)
);
CREATE TABLE public.agentes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  apellido text NOT NULL,
  nombre text NOT NULL,
  dni text NOT NULL UNIQUE CHECK (dni ~ '^\d{7,8}$'::text),
  cuil text NOT NULL UNIQUE,
  fecha_nacimiento date,
  genero_id smallint,
  estado_civil_id smallint,
  hijos_a_cargo integer DEFAULT 0 CHECK (hijos_a_cargo >= 0),
  discapacidad boolean DEFAULT false,
  discapacidad_nombre text,
  telefono text,
  email text UNIQUE,
  domicilio text,
  nivel_estudio_id integer,
  titulo_obtenido text,
  fecha_inicio_sp date,
  modalidad_id smallint,
  delegacion_id smallint,
  area_id integer,
  cargo_id integer,
  fecha_vencimiento_contrato date,
  hora_ingreso text,
  horas_laborales integer,
  dias_laborales ARRAY,
  estado boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  auth_id uuid UNIQUE,
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
  agente_id uuid NOT NULL,
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
  agente_id uuid NOT NULL,
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
  agente_id uuid NOT NULL,
  observacion text NOT NULL,
  es_mensaje_sistema boolean NOT NULL DEFAULT false,
  archivo_nombre text,
  archivo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  eliminado boolean DEFAULT false,
  eliminado_por uuid,
  eliminado_at timestamp with time zone,
  CONSTRAINT archivos_recepciones_pkey PRIMARY KEY (id),
  CONSTRAINT archivos_recepciones_recepcion_id_fkey FOREIGN KEY (recepcion_id) REFERENCES public.recepciones(id),
  CONSTRAINT archivos_recepciones_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id),
  CONSTRAINT archivos_recepciones_eliminado_por_fkey FOREIGN KEY (eliminado_por) REFERENCES public.agentes(id)
);
CREATE TABLE public.areas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT areas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  tabla text NOT NULL,
  operacion text NOT NULL CHECK (operacion = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
  registro_id text,
  agente_id text,
  datos_antes jsonb,
  datos_despues jsonb,
  ip_address text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
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
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  tipo_entidad_id integer,
  apellido text NOT NULL,
  nombre text NOT NULL,
  dni text UNIQUE,
  cuil text UNIQUE,
  fecha_nacimiento date,
  genero_id smallint,
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
  eliminado boolean DEFAULT false,
  eliminado_por uuid,
  eliminado_at timestamp with time zone,
  CONSTRAINT ciudadanos_pkey PRIMARY KEY (id),
  CONSTRAINT ciudadanos_tipo_entidad_id_fkey FOREIGN KEY (tipo_entidad_id) REFERENCES public.tipos_entidad(id),
  CONSTRAINT ciudadanos_genero_id_fkey FOREIGN KEY (genero_id) REFERENCES public.generos(id),
  CONSTRAINT ciudadanos_nivel_estudio_id_fkey FOREIGN KEY (nivel_estudio_id) REFERENCES public.niveles_estudio(id),
  CONSTRAINT ciudadanos_ocupacion_id_fkey FOREIGN KEY (ocupacion_id) REFERENCES public.ocupaciones(id),
  CONSTRAINT ciudadanos_barrio_id_fkey FOREIGN KEY (barrio_id) REFERENCES public.barrios(id),
  CONSTRAINT ciudadanos_tipo_contacto_id_fkey FOREIGN KEY (tipo_contacto_id) REFERENCES public.tipos_contacto(id),
  CONSTRAINT ciudadanos_eliminado_por_fkey FOREIGN KEY (eliminado_por) REFERENCES public.agentes(id)
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
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT estados_actuacion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.estados_civil (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT estados_civil_pkey PRIMARY KEY (id)
);
CREATE TABLE public.estados_expediente (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT estados_expediente_pkey PRIMARY KEY (id)
);
CREATE TABLE public.estados_recepcion (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT estados_recepcion_pkey PRIMARY KEY (id)
);
CREATE TABLE public.expedientes (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  codigo text NOT NULL UNIQUE,
  titulo text,
  observaciones text,
  agente_id uuid NOT NULL,
  estado_id smallint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  eliminado boolean DEFAULT false,
  eliminado_por uuid,
  eliminado_at timestamp with time zone,
  CONSTRAINT expedientes_pkey PRIMARY KEY (id),
  CONSTRAINT expedientes_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id),
  CONSTRAINT expedientes_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estados_expediente(id),
  CONSTRAINT expedientes_eliminado_por_fkey FOREIGN KEY (eliminado_por) REFERENCES public.agentes(id)
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
CREATE TABLE public.inv_activos (
  id text NOT NULL,
  categoria_id smallint NOT NULL,
  marca_id integer,
  modelo text,
  caracteristicas text,
  nro_serie_imei text UNIQUE,
  id_patrimonial text UNIQUE,
  es_consumible boolean NOT NULL DEFAULT false,
  stock_actual integer NOT NULL DEFAULT 1 CHECK (stock_actual >= 0),
  impresora_compatible text,
  estado_id smallint NOT NULL,
  edificio_id smallint,
  area_asignada_id integer,
  agente_asignado_id uuid,
  fecha_adquisicion date,
  observaciones text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  eliminado boolean DEFAULT false,
  eliminado_por uuid,
  eliminado_at timestamp with time zone,
  CONSTRAINT inv_activos_pkey PRIMARY KEY (id),
  CONSTRAINT inv_activos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.inv_categorias(id),
  CONSTRAINT inv_activos_marca_id_fkey FOREIGN KEY (marca_id) REFERENCES public.inv_marcas(id),
  CONSTRAINT inv_activos_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.inv_estados(id),
  CONSTRAINT inv_activos_edificio_id_fkey FOREIGN KEY (edificio_id) REFERENCES public.inv_edificios(id),
  CONSTRAINT inv_activos_area_asignada_id_fkey FOREIGN KEY (area_asignada_id) REFERENCES public.areas(id),
  CONSTRAINT inv_activos_agente_asignado_id_fkey FOREIGN KEY (agente_asignado_id) REFERENCES public.agentes(id),
  CONSTRAINT inv_activos_eliminado_por_fkey FOREIGN KEY (eliminado_por) REFERENCES public.agentes(id)
);
CREATE TABLE public.inv_categorias (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT inv_categorias_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inv_edificios (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL,
  direccion text,
  piso text,
  delegacion_id smallint,
  CONSTRAINT inv_edificios_pkey PRIMARY KEY (id),
  CONSTRAINT inv_edificios_delegacion_id_fkey FOREIGN KEY (delegacion_id) REFERENCES public.delegaciones(id)
);
CREATE TABLE public.inv_estados (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  color_ui text,
  CONSTRAINT inv_estados_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inv_marcas (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  CONSTRAINT inv_marcas_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inv_movimientos (
  id text NOT NULL,
  activo_id text NOT NULL,
  tipo_movimiento_id smallint NOT NULL,
  cantidad integer NOT NULL DEFAULT 1,
  area_origen_id integer,
  agente_origen_id uuid,
  area_destino_id integer,
  agente_destino_id uuid,
  agente_registro_id uuid NOT NULL,
  edificio_destino_id smallint,
  motivo_baja text,
  observaciones text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT inv_movimientos_pkey PRIMARY KEY (id),
  CONSTRAINT inv_movimientos_activo_id_fkey FOREIGN KEY (activo_id) REFERENCES public.inv_activos(id),
  CONSTRAINT inv_movimientos_tipo_movimiento_id_fkey FOREIGN KEY (tipo_movimiento_id) REFERENCES public.inv_tipos_movimiento(id),
  CONSTRAINT inv_movimientos_area_origen_id_fkey FOREIGN KEY (area_origen_id) REFERENCES public.areas(id),
  CONSTRAINT inv_movimientos_agente_origen_id_fkey FOREIGN KEY (agente_origen_id) REFERENCES public.agentes(id),
  CONSTRAINT inv_movimientos_area_destino_id_fkey FOREIGN KEY (area_destino_id) REFERENCES public.areas(id),
  CONSTRAINT inv_movimientos_agente_destino_id_fkey FOREIGN KEY (agente_destino_id) REFERENCES public.agentes(id),
  CONSTRAINT inv_movimientos_agente_registro_id_fkey FOREIGN KEY (agente_registro_id) REFERENCES public.agentes(id),
  CONSTRAINT inv_movimientos_edificio_destino_id_fkey FOREIGN KEY (edificio_destino_id) REFERENCES public.inv_edificios(id)
);
CREATE TABLE public.inv_tipos_movimiento (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  afecta_stock smallint DEFAULT 0,
  CONSTRAINT inv_tipos_movimiento_pkey PRIMARY KEY (id)
);
CREATE TABLE public.licencias (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  agente_id uuid NOT NULL,
  tipo_licencia_id smallint,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  detalles text,
  certificado_presentado boolean DEFAULT false,
  url_adjunto text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
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
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  clave_tecnica text NOT NULL UNIQUE,
  nombre text NOT NULL,
  descripcion text,
  CONSTRAINT permisos_pkey PRIMARY KEY (id)
);
CREATE TABLE public.recepciones (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  reprogramado boolean DEFAULT false,
  fecha_inicio timestamp with time zone NOT NULL DEFAULT now(),
  fecha_final timestamp with time zone,
  ciudadano_id text,
  area_origen_id integer NOT NULL,
  agente_origen_id uuid NOT NULL,
  canal_id integer NOT NULL,
  telefono text,
  email text,
  categoria_id integer,
  prioridad_id smallint,
  estado_id smallint NOT NULL,
  tipo_destinatario_id smallint,
  area_destino_id integer,
  organismo_destino_id integer,
  agente_responsable_id uuid,
  motivo_derivacion text,
  expediente_id text,
  observaciones text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  eliminado boolean DEFAULT false,
  eliminado_por uuid,
  eliminado_at timestamp with time zone,
  CONSTRAINT recepciones_pkey PRIMARY KEY (id),
  CONSTRAINT recepciones_ciudadano_id_fkey FOREIGN KEY (ciudadano_id) REFERENCES public.ciudadanos(id),
  CONSTRAINT recepciones_area_origen_id_fkey FOREIGN KEY (area_origen_id) REFERENCES public.areas(id),
  CONSTRAINT recepciones_agente_origen_id_fkey FOREIGN KEY (agente_origen_id) REFERENCES public.agentes(id),
  CONSTRAINT recepciones_canal_id_fkey FOREIGN KEY (canal_id) REFERENCES public.canales_atencion(id),
  CONSTRAINT recepciones_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id),
  CONSTRAINT recepciones_prioridad_id_fkey FOREIGN KEY (prioridad_id) REFERENCES public.tipos_prioridad(id),
  CONSTRAINT recepciones_estado_id_fkey FOREIGN KEY (estado_id) REFERENCES public.estados_recepcion(id),
  CONSTRAINT recepciones_tipo_destinatario_id_fkey FOREIGN KEY (tipo_destinatario_id) REFERENCES public.tipos_destinatario(id),
  CONSTRAINT recepciones_area_destino_id_fkey FOREIGN KEY (area_destino_id) REFERENCES public.areas(id),
  CONSTRAINT recepciones_organismo_destino_id_fkey FOREIGN KEY (organismo_destino_id) REFERENCES public.organismos_externos(id),
  CONSTRAINT recepciones_agente_responsable_id_fkey FOREIGN KEY (agente_responsable_id) REFERENCES public.agentes(id),
  CONSTRAINT recepciones_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES public.expedientes(id),
  CONSTRAINT recepciones_eliminado_por_fkey FOREIGN KEY (eliminado_por) REFERENCES public.agentes(id)
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
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nombre text NOT NULL UNIQUE,
  descripcion text NOT NULL DEFAULT ''::text,
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
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  agente_id uuid,
  estado boolean DEFAULT true,
  tipo_usuario_id smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT usuarios_pkey PRIMARY KEY (id),
  CONSTRAINT usuarios_agente_id_fkey FOREIGN KEY (agente_id) REFERENCES public.agentes(id),
  CONSTRAINT usuarios_tipo_usuario_id_fkey FOREIGN KEY (tipo_usuario_id) REFERENCES public.tipos_usuario(id)
);
CREATE TABLE public.usuarios_permisos (
  usuario_id uuid NOT NULL,
  permiso_id smallint NOT NULL,
  CONSTRAINT usuarios_permisos_pkey PRIMARY KEY (usuario_id, permiso_id),
  CONSTRAINT usuarios_permisos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id),
  CONSTRAINT usuarios_permisos_permiso_id_fkey FOREIGN KEY (permiso_id) REFERENCES public.permisos(id)
);