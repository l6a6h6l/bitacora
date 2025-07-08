import React, { useState, useEffect } from 'react';
import { Clock, Users, Download, Filter, Activity, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import * as XLSX from 'xlsx';

function DashboardAdmin({ usuario }) {
  const [todosLosRegistros, setTodosLosRegistros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [filtroOperador, setFiltroOperador] = useState('todos');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [cargando, setCargando] = useState(true);

  // Datos de ejemplo para visualizar el heatmap
  const generarDatosEjemplo = () => {
    const hoy = new Date();
    const ejemplos = [];
    
    // Generar actividades para toda la semana
    for (let dia = 1; dia <= 5; dia++) { // Lunes a Viernes
      // Turno mañana - Alta carga (9-11 AM)
      for (let i = 0; i < 4; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - (hoy.getDay() - dia));
        fecha.setHours(9 + Math.floor(i/2), (i % 2) * 30, 0, 0);
        
        ejemplos.push({
          id: `ejemplo-${dia}-mañana-${i}`,
          usuarioNombre: `Operador ${(i % 3) + 1}`,
          usuarioEmail: `operador${(i % 3) + 1}@empresa.com`,
          actividadNombre: ['Correo de carga cobranzas', 'Atención tickets soporte', 'Generación de reportes', 'Revisión de logs'][i],
          horaInicio: new Date(fecha),
          horaFin: new Date(fecha.getTime() + (30 + Math.random() * 30) * 60 * 1000),
          duracionMinutos: 30 + Math.floor(Math.random() * 30),
          fecha: fecha.toISOString().split('T')[0],
          estado: 'completada'
        });
      }
      
      // Turno medio día - Carga media (12-2 PM)
      for (let i = 0; i < 2; i++) {
        const fecha = new Date(hoy);
        fecha.setDate(fecha.getDate() - (hoy.getDay() - dia));
        fecha.setHours(12 + i, 15, 0, 0);
        
        ejemplos.push({
          id: `ejemplo-${dia}-medio-${i}`,
          usuarioNombre: `Operador ${i + 2}`,
          usuarioEmail: `operador${i + 2}@empresa.com`,
          actividadNombre: ['Informe monitoreo', 'Respuesta correos CAO'][i],
          horaInicio: new Date(fecha),
          horaFin: new Date(fecha.getTime() + 45 * 60 * 1000),
          duracionMinutos: 45,
          fecha: fecha.toISOString().split('T')[0],
          estado: 'completada'
        });
      }
      
      // Turno tarde - Carga normal (3-5 PM)
      const fechaTarde = new Date(hoy);
      fechaTarde.setDate(fechaTarde.getDate() - (hoy.getDay() - dia));
      fechaTarde.setHours(15, 30, 0, 0);
      
      ejemplos.push({
        id: `ejemplo-${dia}-tarde`,
        usuarioNombre: 'Operador 3',
        usuarioEmail: 'operador3@empresa.com',
        actividadNombre: 'Cierre de tickets del día',
        horaInicio: new Date(fechaTarde),
        horaFin: new Date(fechaTarde.getTime() + 60 * 60 * 1000),
        duracionMinutos: 60,
        fecha: fechaTarde.toISOString().split('T')[0],
        estado: 'completada'
      });
    }
    
    // Actividades nocturnas (solo algunos días)
    [2, 4].forEach(dia => { // Martes y Jueves
      const fechaNoche = new Date(hoy);
      fechaNoche.setDate(fechaNoche.getDate() - (hoy.getDay() - dia));
      fechaNoche.setHours(22, 0, 0, 0);
      
      ejemplos.push({
        id: `ejemplo-${dia}-noche`,
        usuarioNombre: 'Operador Nocturno',
        usuarioEmail: 'nocturno@empresa.com',
        actividadNombre: 'Monitoreo servicios nocturnos',
        horaInicio: new Date(fechaNoche),
        horaFin: new Date(fechaNoche.getTime() + 90 * 60 * 1000),
        duracionMinutos: 90,
        fecha: fechaNoche.toISOString().split('T')[0],
        estado: 'completada'
      });
    });
    
    return ejemplos;
  };

  useEffect(() => {
    // Cargar usuarios
    const qUsuarios = query(collection(db, 'usuarios'), where('rol', '==', 'operador'));
    const unsubUsuarios = onSnapshot(qUsuarios, (snapshot) => {
      const usuariosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Agregar usuarios de ejemplo para los filtros
      const usuariosEjemplo = [
        { id: 'ej1', email: 'operador1@empresa.com', nombre: 'Operador 1' },
        { id: 'ej2', email: 'operador2@empresa.com', nombre: 'Operador 2' },
        { id: 'ej3', email: 'operador3@empresa.com', nombre: 'Operador 3' },
        { id: 'ej4', email: 'operador4@empresa.com', nombre: 'Operador 4' },
        { id: 'ej5', email: 'operador5@empresa.com', nombre: 'Operador 5' },
        { id: 'ejn', email: 'nocturno@empresa.com', nombre: 'Operador Nocturno' }
      ];
      
      setUsuarios([...usuariosData, ...usuariosEjemplo]);
    });

    // Cargar todos los registros
    const qRegistros = query(
      collection(db, 'registros_actividades'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubRegistros = onSnapshot(qRegistros, (snapshot) => {
      const registros = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        horaInicio: doc.data().horaInicio.toDate(),
        horaFin: doc.data().horaFin ? doc.data().horaFin.toDate() : null
      }));
      
      // Combinar registros reales con ejemplos para visualización
      const datosEjemplo = generarDatosEjemplo();
      setTodosLosRegistros([...registros, ...datosEjemplo]);
      setCargando(false);
    });

    return () => {
      unsubUsuarios();
      unsubRegistros();
    };
  }, []);

  const registrosFiltrados = todosLosRegistros.filter(registro => {
    let cumpleFiltro = true;
    
    if (filtroOperador !== 'todos') {
      cumpleFiltro = cumpleFiltro && registro.usuarioEmail === filtroOperador;
    }
    
    if (filtroFechaInicio) {
      cumpleFiltro = cumpleFiltro && registro.fecha >= filtroFechaInicio;
    }
    
    if (filtroFechaFin) {
      cumpleFiltro = cumpleFiltro && registro.fecha <= filtroFechaFin;
    }
    
    return cumpleFiltro;
  });

  const formatearHora = (fecha) => {
    if (!fecha) return '-';
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const exportarExcel = () => {
    const datosExportar = registrosFiltrados.map(registro => ({
      'Operador': registro.usuarioNombre,
      'Email': registro.usuarioEmail,
      'Actividad': registro.actividadNombre,
      'Fecha': registro.fecha,
      'Hora Inicio': formatearHora(registro.horaInicio),
      'Hora Fin': formatearHora(registro.horaFin),
      'Duración (min)': registro.duracionMinutos || 0,
      'Estado': registro.estado
    }));

    const ws = XLSX.utils.json_to_sheet(datosExportar);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Actividades");
    
    const colWidths = [
      { wch: 20 }, { wch: 25 }, { wch: 30 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 12 }
    ];
    ws['!cols'] = colWidths;
    
    XLSX.writeFile(wb, `Reporte_Actividades_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const totalMinutos = registrosFiltrados.reduce((acc, r) => acc + (r.duracionMinutos || 0), 0);
  const operadoresUnicos = [...new Set(registrosFiltrados.map(r => r.usuarioEmail))].length;

  // Calcular datos para el heatmap
  const calcularCargaHoraria = () => {
    const cargaPorHora = {};
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    
    // Inicializar estructura
    for (let dia = 0; dia < 7; dia++) {
      cargaPorHora[dia] = {};
      for (let hora = 0; hora < 24; hora++) {
        cargaPorHora[dia][hora] = 0;
      }
    }

    // Procesar registros
    registrosFiltrados.forEach(registro => {
      if (registro.horaInicio && registro.horaFin) {
        const fechaInicio = new Date(registro.horaInicio);
        const fechaFin = new Date(registro.horaFin);
        const diaSemana = fechaInicio.getDay();
        
        // Para actividades que no cruzan días
        if (fechaInicio.getDate() === fechaFin.getDate()) {
          const horaInicio = fechaInicio.getHours();
          const horaFin = fechaFin.getHours();
          
          for (let hora = horaInicio; hora <= horaFin; hora++) {
            if (cargaPorHora[diaSemana] && cargaPorHora[diaSemana][hora] !== undefined) {
              cargaPorHora[diaSemana][hora]++;
            }
          }
        }
      }
    });

    return { cargaPorHora, diasSemana };
  };

  const { cargaPorHora, diasSemana } = calcularCargaHoraria();

  // Función para obtener color según carga
  const obtenerColorCarga = (cantidad) => {
    if (cantidad === 0) return 'bg-gray-100';
    if (cantidad === 1) return 'bg-green-200';
    if (cantidad === 2) return 'bg-yellow-200';
    if (cantidad === 3) return 'bg-orange-300';
    if (cantidad === 4) return 'bg-red-400';
    return 'bg-red-600'; // 5 o más
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Panel de Administrador</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Hola, {usuario.nombre}</span>
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">Admin</span>
            <button onClick={handleLogout} className="text-gray-500 hover:text-gray-700">
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Actividades</p>
                <p className="text-3xl font-bold">{registrosFiltrados.length}</p>
              </div>
              <Activity className="text-blue-500" size={40} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Tiempo Total</p>
                <p className="text-3xl font-bold">{totalMinutos} min</p>
              </div>
              <Clock className="text-green-500" size={40} />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Operadores Activos</p>
                <p className="text-3xl font-bold">{operadoresUnicos}</p>
              </div>
              <Users className="text-purple-500" size={40} />
            </div>
          </div>
        </div>

        {/* Heatmap de Carga Horaria */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">Mapa de Carga Horaria</h2>
              <p className="text-sm text-gray-600 mt-1">
                Visualización de la carga de trabajo por día y hora
              </p>
            </div>
            <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full">
              Incluye datos de ejemplo
            </span>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-max">
              {/* Debug - Verificar datos */}
              <div className="mb-4 p-2 bg-gray-100 rounded text-xs">
                <p>Total registros: {registrosFiltrados.length}</p>
                <p>Registros con datos de ejemplo: {registrosFiltrados.filter(r => r.id.includes('ejemplo')).length}</p>
              </div>
              
              {/* Header de horas */}
              <div className="flex gap-1 mb-2">
                <div className="w-12"></div>
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="w-8 text-xs text-center text-gray-600">
                    {i.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
              
              {/* Filas por día */}
              {diasSemana.map((dia, diaIndex) => (
                <div key={diaIndex} className="flex gap-1 mb-1">
                  <div className="w-12 text-sm font-medium text-gray-700 flex items-center">
                    {dia}
                  </div>
                  {Array.from({ length: 24 }, (_, hora) => (
                    <div
                      key={hora}
                      className={`w-8 h-8 rounded ${obtenerColorCarga(cargaPorHora[diaIndex][hora])} border border-gray-300 relative group cursor-pointer`}
                      title={`${dia} ${hora}:00 - ${cargaPorHora[diaIndex][hora]} actividades`}
                    >
                      {cargaPorHora[diaIndex][hora] > 0 && (
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                          {cargaPorHora[diaIndex][hora]}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Leyenda */}
              <div className="mt-4 flex items-center gap-4 text-sm">
                <span className="font-medium">Leyenda:</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
                  <span>Sin actividad</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-200 border border-gray-300 rounded"></div>
                  <span>1 actividad</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-yellow-200 border border-gray-300 rounded"></div>
                  <span>2 actividades</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-orange-300 border border-gray-300 rounded"></div>
                  <span>3 actividades</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-400 border border-gray-300 rounded"></div>
                  <span>4+ actividades</span>
                </div>
              </div>
              
              {/* Insights */}
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Análisis:</strong> El mapa muestra alta concentración de trabajo (zonas rojas) 
                  en horarios específicos, indicando sobrecarga laboral. Las zonas grises muestran 
                  períodos sin actividad registrada.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y Exportación */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-500" />
              <span className="font-semibold">Filtros:</span>
            </div>
            
            <select
              value={filtroOperador}
              onChange={(e) => setFiltroOperador(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los operadores</option>
              {usuarios.map(user => (
                <option key={user.id} value={user.email}>{user.email}</option>
              ))}
            </select>

            <input
              type="date"
              value={filtroFechaInicio}
              onChange={(e) => setFiltroFechaInicio(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <input
              type="date"
              value={filtroFechaFin}
              onChange={(e) => setFiltroFechaFin(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={() => {
                setFiltroOperador('todos');
                setFiltroFechaInicio('');
                setFiltroFechaFin('');
              }}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition duration-200"
            >
              Limpiar Filtros
            </button>

            <button
              onClick={exportarExcel}
              className="ml-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 transition duration-200"
            >
              <Download size={20} />
              Exportar Excel
            </button>
          </div>
        </div>

        {/* Tabla de Actividades */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Registro de Actividades</h2>
          
          {registrosFiltrados.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay actividades que coincidan con los filtros</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4">Operador</th>
                    <th className="text-left py-3 px-4">Actividad</th>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Inicio</th>
                    <th className="text-left py-3 px-4">Fin</th>
                    <th className="text-left py-3 px-4">Duración</th>
                    <th className="text-left py-3 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosFiltrados.map(registro => (
                    <tr key={registro.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{registro.usuarioNombre}</p>
                          <p className="text-sm text-gray-500">
                            {registro.usuarioEmail}
                            {registro.id.startsWith('ejemplo-') && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Ejemplo</span>
                            )}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">{registro.actividadNombre}</td>
                      <td className="py-3 px-4">{registro.fecha}</td>
                      <td className="py-3 px-4">{formatearHora(registro.horaInicio)}</td>
                      <td className="py-3 px-4">{formatearHora(registro.horaFin)}</td>
                      <td className="py-3 px-4">
                        {registro.duracionMinutos ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {registro.duracionMinutos} min
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          registro.estado === 'completada' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {registro.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardAdmin;
