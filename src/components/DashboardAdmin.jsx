import React, { useState, useEffect } from 'react';
import { Clock, Users, Download, Filter, Activity, LogOut, Calendar } from 'lucide-react';
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

  useEffect(() => {
    // Cargar usuarios
    const qUsuarios = query(collection(db, 'usuarios'), where('rol', '==', 'operador'));
    const unsubUsuarios = onSnapshot(qUsuarios, (snapshot) => {
      const usuariosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsuarios(usuariosData);
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
      setTodosLosRegistros(registros);
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
                          <p className="text-sm text-gray-500">{registro.usuarioEmail}</p>
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
