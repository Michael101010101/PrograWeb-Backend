import test from 'node:test';
import assert from 'node:assert/strict';
import { DATOS_SEMILLA } from '../hu6/domain/datosSemilla.js';
import * as hu6 from '../hu6/domain/sustentacionesService.js';
const base = () => structuredClone(DATOS_SEMILLA);
const datosConProgramada = () => hu6.programarSustentacion(base(), {
  id:'s-test',trabajoCodigo:'TFC-2026-2-012',fecha:'2026-12-11',hora:'10:00',salaId:'A-402',modalidad:'Presencial'
});

test('Permite programar trabajo concluido, sin conflictos', () => {
  const d = datosConProgramada();
  assert.equal(d.sustentaciones.at(-1).estado, 'programada');
  assert.equal(d.sustentaciones.at(-1).trabajoCodigo,'TFC-2026-2-012');
});
test('No permite programar el mismo trabajo dos veces', () => {
  const d = datosConProgramada();
  assert.throws(() => hu6.programarSustentacion(d, {id:'dup', trabajoCodigo:'TFC-2026-2-012',fecha:'2026-12-11',hora:'10:00',salaId:'A-402',modalidad:'Presencial'}), /ya tiene/);
});
test('No permite ocupar una sala reservada a la misma hora', () => {
  assert.throws(() => hu6.programarSustentacion(base(), {id:'s-1', trabajoCodigo:'TFC-2026-2-012', fecha:'2026-12-11',hora:'08:00',salaId:'A-402',modalidad:'Presencial'}), /ocupada/);
});
test('No permite domingo ni fecha fuera de ventana', () => {
  const d=base();
  assert.throws(()=>hu6.programarSustentacion(d,{id:'s-1',trabajoCodigo:'TFC-2026-2-012',fecha:'2026-12-13',hora:'10:00',salaId:'A-402',modalidad:'Presencial'}),/domingo/);
  assert.throws(()=>hu6.programarSustentacion(d,{id:'s-1',trabajoCodigo:'TFC-2026-2-012',fecha:'2026-12-22',hora:'10:00',salaId:'A-402',modalidad:'Presencial'}),/ventana/);
});
test('Valida jurado completo, presidente, asesor y conflictos', () => {
  const d=datosConProgramada();
  const jurado=[{docenteId:'d-01',presidente:true},{docenteId:'d-02',presidente:false},{docenteId:'d-05',presidente:false}];
  assert.equal(hu6.guardarJurado(d,'s-test',jurado).sustentaciones.at(-1).jurado.length,3);
  assert.throws(()=>hu6.guardarJurado(d,'s-test', [{docenteId:'d-06',presidente:true},...jurado.slice(0,2)]), /asesor/);
  assert.equal(hu6.guardarJurado(d,'s-test', [{docenteId:'d-01',presidente:true},{docenteId:'d-06',presidente:false},{docenteId:'d-02',presidente:false}]).sustentaciones.at(-1).jurado.length,3);
  assert.throws(()=>hu6.guardarJurado(d,'s-test', [{docenteId:'d-04',presidente:true},...jurado.slice(0,2)]), /conflicto/);
  assert.throws(()=>hu6.guardarJurado(d,'s-test', [{docenteId:'d-01',presidente:true},{docenteId:'d-01',presidente:false},jurado[2]]), /repetir/);
});
test('Reprogramación exige motivo y registra historial', () => {
  const d=datosConProgramada();
  assert.throws(()=>hu6.reprogramarSustentacion(d,'s-test',{fecha:'2026-12-12',hora:'09:00',salaId:'B-201',modalidad:'Presencial',motivo:'breve'}), /10 caracteres/);
  const reprogramada=hu6.reprogramarSustentacion(d,'s-test',{fecha:'2026-12-12',hora:'09:00',salaId:'B-201',modalidad:'Presencial',motivo:'Cambio por disponibilidad de sala'});
  assert.equal(reprogramada.sustentaciones.at(-1).estado,'reprogramada');
  assert.equal(reprogramada.sustentaciones.at(-1).historial.length,1);
});
test('Acta ponderada y definitiva aprobada',()=>{
  const jurado=[{docenteId:'d-01',presidente:true},{docenteId:'d-02',presidente:false},{docenteId:'d-05',presidente:false}];
  const d=hu6.guardarJurado(datosConProgramada(),'s-test',jurado);
  const a={notas:{rigor:16,resultados:15,informe:17,exposicion:16},resultado:'Aprobado',observaciones:''};
  const fin=hu6.registrarActa(d,'s-test',a);
  assert.equal(hu6.notaFinal(a.notas),16);
  assert.equal(fin.sustentaciones.at(-1).estado,'realizada');
  assert.equal(fin.sustentaciones.at(-1).acta.registrada,true);
  assert.throws(()=>hu6.registrarActa(d,'s-test',{...a,notas:{...a.notas,rigor:25}}),/entero de 0 a 20/);
  assert.throws(()=>hu6.registrarActa(d,'s-test',{...a,resultado:'Desaprobado'}),/no puede quedar desaprobado/);
});
test('Borrador admite notas faltantes y acta desaprobada exige observaciones',()=>{
  const d=hu6.guardarJurado(datosConProgramada(),'s-test',[{docenteId:'d-01',presidente:true},{docenteId:'d-02',presidente:false},{docenteId:'d-05',presidente:false}]);
  const borrador=hu6.guardarBorradorActa(d,'s-test',{notas:{rigor:10, resultados:'',informe:'',exposicion:''},resultado:'',observaciones:''});
  assert.equal(borrador.sustentaciones.at(-1).acta.registrada,false);
  assert.throws(()=>hu6.revisarActa({notas:{rigor:8,resultados:9,informe:7,exposicion:10},resultado:'Desaprobado',observaciones:'No'}),/observaciones/);
});
