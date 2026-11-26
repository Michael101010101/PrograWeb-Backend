INSERT INTO hu6.docentes (id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos) VALUES ('d-01', NULL, 'Dr.', 'Ricardo', 'Cárdenas Loayza', 'doctor', 'Ingeniería Civil', 1) ON CONFLICT DO NOTHING;
INSERT INTO hu6.docentes (id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos) VALUES ('d-02', NULL, 'Mg.', 'Sandra', 'Bustamante Ríos', 'magíster', 'Ingeniería Industrial', 2) ON CONFLICT DO NOTHING;
INSERT INTO hu6.docentes (id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos) VALUES ('d-03', NULL, 'Ing.', 'Luis Fernando', 'Ocampo Salas', 'ingeniero', 'Ingeniería Civil', 3) ON CONFLICT DO NOTHING;
INSERT INTO hu6.docentes (id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos) VALUES ('d-04', NULL, 'Dra.', 'Gabriela', 'Torres Anchante', 'doctor', 'Estudios Generales', 0) ON CONFLICT DO NOTHING;
INSERT INTO hu6.docentes (id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos) VALUES ('d-05', NULL, 'Dr.', 'Pedro', 'Salazar Huamán', 'doctor', 'Ingeniería de Sistemas', 0) ON CONFLICT DO NOTHING;
INSERT INTO hu6.docentes (id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos) VALUES ('d-06', 'u-102', 'Mg.', 'Julio', 'Vargas Aliaga', 'magíster', 'Ingeniería Industrial', 2) ON CONFLICT DO NOTHING;
INSERT INTO hu6.docentes (id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos) VALUES ('d-07', 'u-101', 'Dra.', 'Mariela', 'Quispe Ramos', 'doctor', 'Ingeniería de Sistemas', 2) ON CONFLICT DO NOTHING;
INSERT INTO hu6.docentes (id,usuario_id,titulo,nombres,apellidos,grado,departamento,jurados_previos) VALUES ('d-08', NULL, 'Mg.', 'Carla', 'Benavides Rojas', 'magíster', 'Ingeniería Industrial', 0) ON CONFLICT DO NOTHING;
INSERT INTO hu6.salas (id,pabellon,ubicacion,asientos) VALUES ('A-402', 'pabellón A', 'Pabellón A, cuarto piso', 30) ON CONFLICT DO NOTHING;
INSERT INTO hu6.salas (id,pabellon,ubicacion,asientos) VALUES ('B-201', 'pabellón B', 'Pabellón B, segundo piso', 24) ON CONFLICT DO NOTHING;
INSERT INTO hu6.salas (id,pabellon,ubicacion,asientos) VALUES ('C-105', 'pabellón C', 'Pabellón C, primer piso', 40) ON CONFLICT DO NOTHING;
INSERT INTO hu6.reservas_sala(sala_id,fecha,hora,motivo) VALUES ('A-402', '2026-12-11', '08:00', 'Examen de suficiencia de la facultad') ON CONFLICT DO NOTHING;
-- HU-2 ya define fecha, hora, jurado y sala para el trabajo concluido t-012.
-- Las altas y los cambios posteriores realizados por coordinación se respetan.
DO $$
DECLARE
  trabajo public.trabajos%ROWTYPE;
  nueva varchar;
BEGIN
  SELECT * INTO STRICT trabajo FROM public.trabajos
    WHERE id = 't-012' AND codigo = 'TFC-2026-2-012';
  IF trabajo.estado <> 'concluido' OR trabajo.sustentacion IS NULL THEN RETURN; END IF;

  INSERT INTO hu6.conflictos_trabajo VALUES (trabajo.id, 'd-04', 'dictó clases al equipo en 2026-1')
    ON CONFLICT DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.sustentaciones WHERE "trabajoId" = trabajo.id) THEN RETURN; END IF;
  INSERT INTO public.sustentaciones ("id","trabajoId","fecha","hora","modalidad","estado","salaId","programadaEl")
    VALUES ('s-012', trabajo.id, (trabajo.sustentacion->>'fecha')::timestamp::date,
      (trabajo.sustentacion->>'fecha')::timestamp::time, initcap(trabajo.sustentacion->>'modalidad'),
      'programada', 'A-402', trabajo."cerradoEn"::date)
    RETURNING id INTO nueva;
  INSERT INTO hu6.jurados (sustentacion_id, docente_id, presidente)
    VALUES (nueva, 'd-01', true), (nueva, 'd-02', false), (nueva, 'd-03', false);
END $$;
