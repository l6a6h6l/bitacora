import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus, Activity, LogOut, Calendar, Moon, Sun, Sunset, Check, FileText, AlertCircle } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';

function DashboardOperador({ usuario }) {
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [actividadActual, setActividadActual] = useState(null);
  const [registrosHoy, setRegistrosHoy] = useState([]);
  const [nuevaActividad, setNuevaActividad] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [actividadesCompletadas, setActividadesCompletadas] = useState([]);
  const [pendientesParaSiguienteTurno, setPendientesParaSiguienteTurno] = useState([]);
  const [mostrarReporte, setMostrarReporte] = useState(false);

  // Definir actividades por turno
  const actividadesPorTurno = {
    velada: {
      nombre: 'Velada',
      horario: '00:00 - 08:00',
      icono: Moon,
      actividades: [
        'Sacar archivos de caidas',
        'Informe diario monitoreo',
        'Ejecución botón PTP',
        'Solicitud standines negados',
        'Recepción notificación SRVRCS2',
        'Validación fecha COB analitica',
        'Carga cobranzas 2AE',
        'Carga cobranzas 3AE',
        'Carga cobranzas AE',
        'Disparador diario DCDI',
        'Disparador diario DCDN',
        'Disparador diario IDMC',
        'Disparador diario IDVI',
        'Mail estado monitoreo servicios',
        'Monitoreo Municipio Guayaquil'
      ]
    },
    dia: {
      nombre: 'Día',
      horario: '08:00 - 16:00',
      icono: Sun,
      actividades: [
        'Mail estado monitoreo servicios',
        'Mensajes pendientes respuesta cao',
        'Mensajes pendientes respuesta ges',
        'Registro de incidentes'
      ]
    },
    tarde: {
      nombre: 'Tarde',
      horario: '16:00 - 00:00',
      icono: Sunset,
      actividades: [
        'Mail estado monitoreo servicios',
        'Mensajes pendientes respuesta cao',
        'Mensajes pendientes respuesta ges',
        'Registro de incidentes'
      ]
    }
  };

  // Actividades recurrentes adicionales (siempre disponibles)
  const actividadesRecurrentes = [
    'Solicitud Daniel',
    'Solicitud Miguel',
    'Solicitud Antonio',
    'Mensajes pendientes respuesta cao',
    'Mensajes pendientes respuesta ges'
  ];

  // Función para obtener nombre formal
  const obtenerNombreFormal = () => {
    const nombresFormales = {
      'sergio.hernandez@fractalia.es': 'Sergio Hernández',
      'antonioj.macias@fractalia.es': 'Antonio Macías',
      'luis.herrera@fractaliasystems.es': 'Luis Herrera'
    };
    
    return nombresFormales[usuario.email.toLowerCase()] || usuario.nombre;
  };

  useEffect(() => {
    // Determinar turno actual basado en la hora
    const horaActual = new Date().getHours();
    if (horaActual >= 0 && horaActual < 8) {
      setTurnoSeleccionado('velada');
    } else if (horaActual >= 8 && horaActual < 16) {
      setTurnoSeleccionado('dia');
    } else {
      setTurnoSeleccionado('tarde');
    }

    // Cargar registros del día
    const hoy = new Date().toISOString().split('T')[0];
    const qRegistros = query(
      collection(db, 'registros_actividades'),
      where('usuarioId', '==', usuario.uid),
      where('fecha', '==', hoy),
      orderBy('createdAt', 'desc')
    );
    
    const unsubRegistros = onSnapshot(qRegistros, (snapshot) => {
      const registros = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        horaInicio: doc.data().horaInicio.toDate(),
        horaFin: doc.data().horaFin ? doc.data().horaFin.toDate() : null
      }));
      setRegistrosHoy(registros);
      
      // Actualizar actividades completadas
      const completadas = registros
        .filter(r => r.estado === 'completada')
        .map(r => r.actividadNombre);
      setActividadesCompletadas(completadas);
      
      // Verificar si hay actividad en progreso
      const enProgreso = registros.find(r => r.estado === 'en_progreso');
      if (enProgreso) {
        setActividadActual(enProgreso);
      }
    });

    return () => {
      unsubRegistros();
    };
  }, [usuario.uid]);

  const iniciarActividad = async (nombreActividad, esPendiente = false) => {
    try {
      const nuevaActividad = {
        usuarioId: usuario.uid,
        usuarioNombre: obtenerNombreFormal(),
        usuarioEmail: usuario.email,
        actividadNombre: nombreActividad,
        turno: turnoSeleccionado,
        horaInicio: new Date(),
        horaFin: null,
        duracionMinutos: null,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'en_progreso',
        esPendiente: esPendiente,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'registros_actividades'), nuevaActividad);
      setActividadActual({ id: docRef.id, ...nuevaActividad });
      setMostrarNueva(false);
      setNuevaActividad('');
    } catch (error) {
      console.error('Error al iniciar actividad:', error);
    }
  };

  const finalizarActividad = async () => {
    if (actividadActual) {
      try {
        const horaFin = new Date();
        const duracion = Math.round((horaFin - actividadActual.horaInicio) / 60000);
        
        await updateDoc(doc(db, 'registros_actividades', actividadActual.id), {
          horaFin: horaFin,
          duracionMinutos: duracion,
          estado: 'completada'
        });
        
        setActividadActual(null);
      } catch (error) {
        console.error('Error al finalizar actividad:', error);
      }
    }
  };

  const marcarComoPendiente = (actividad) => {
    if (!pendientesParaSiguienteTurno.includes(actividad)) {
      setPendientesParaSiguienteTurno([...pendientesParaSiguienteTurno, actividad]);
    }
  };

  const generarReporte = () => {
    setMostrarReporte(true);
  };

  const formatearHora = (fecha) => {
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const esActividadRecurrente = (actividad) => {
    return actividadesRecurrentes.includes(actividad);
  };

  const actividadYaCompletada = (actividad) => {
    return actividadesCompletadas.includes(actividad) && !esActividadRecurrente(actividad);
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const TurnoIcon = turnoSeleccionado ? actividadesPorTurno[turnoSeleccionado].icono : Activity;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Bitácora de Actividades</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Hola, {obtenerNombreFormal()}</span>
            {turnoSeleccionado && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                <TurnoIcon size={16} />
                Turno {actividadesPorTurno[turnoSeleccionado].nombre}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Selector de Turno */}
        {!turnoSeleccionado && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Selecciona tu turno</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(actividadesPorTurno).map(([key, turno]) => {
                const IconoTurno = turno.icono;
                return (
                  <button
                    key={key}
                    onClick={() => setTurnoSeleccionado(key)}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition duration-200"
                  >
                    <IconoTurno size={48} className="mx-auto mb-2 text-blue-500" />
                    <h3 className="text-lg font-semibold">{turno.nombre}</h3>
                    <p className="text-gray-600">{turno.horario}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {turnoSeleccionado && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Panel de Control de Actividad */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="text-blue-500" />
                  Control de Actividad - Turno {actividadesPorTurno[turnoSeleccionado].nombre}
                </h2>
                
                {/* Estado Actual */}
                {actividadActual ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Actividad en progreso:</p>
                        <p className="text-lg font-semibold">{actividadActual.actividadNombre}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <Clock size={16} />
                          Iniciada: {formatearHora(actividadActual.horaInicio)}
                        </p>
                      </div>
                      <button
                        onClick={finalizarActividad}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition duration-200"
                      >
                        <Square size={16} />
                        Finalizar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <p className="text-gray-600 text-center">No hay actividad en progreso</p>
                  </div>
                )}

                {/* Selector de Actividades */}
                {!actividadActual && (
                  <div>
                    <h3 className="font-semibold mb-3">Actividades del turno:</h3>
                    
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {actividadesPorTurno[turnoSeleccionado].actividades.map((actividad, index) => {
                        const completada = actividadYaCompletada(actividad);
                        const recurrente = esActividadRecurrente(actividad);
                        
                        return (
                          <div key={index} className="flex gap-2">
                            <button
                              onClick={() => iniciarActividad(actividad)}
                              disabled={completada}
                              className={`flex-1 text-left px-4 py-2 rounded-lg transition duration-200 flex items-center justify-between ${
                                completada 
                                  ? 'bg-green-100 text-green-700 cursor-not-allowed' 
                                  : recurrente
                                  ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {completada ? <Check size={16} /> : <Play size={16} />}
                                {actividad}
                              </span>
                              {recurrente && <span className="text-xs">Recurrente</span>}
                            </button>
                            {!completada && (
                              <button
                                onClick={() => marcarComoPendiente(actividad)}
                                className="px-3 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg"
                                title="Marcar como pendiente para siguiente turno"
                              >
                                <AlertCircle size={16} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Actividades Recurrentes Adicionales */}
                    <h3 className="font-semibold mb-3 mt-6">Actividades adicionales:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                      {['Solicitud Daniel', 'Solicitud Miguel', 'Solicitud Antonio'].map((actividad) => (
                        <button
                          key={actividad}
                          onClick={() => iniciarActividad(actividad)}
                          className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg text-left transition duration-200"
                        >
                          <Play size={16} className="inline mr-2" />
                          {actividad}
                        </button>
                      ))}
                    </div>

                    {/* Actividad Personalizada */}
                    {mostrarNueva ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={nuevaActividad}
                          onChange={(e) => setNuevaActividad(e.target.value)}
                          placeholder="Nombre de la actividad..."
                          className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => {
                            if (nuevaActividad.trim()) {
                              iniciarActividad(nuevaActividad.trim());
                            }
                          }}
                          className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition duration-200"
                        >
                          Iniciar
                        </button>
                        <button
                          onClick={() => {
                            setMostrarNueva(false);
                            setNuevaActividad('');
                          }}
                          className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setMostrarNueva(true)}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition duration-200"
                      >
                        <Plus size={16} />
                        Otra actividad
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Resumen del Día y Botón de Reporte */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="text-green-500" />
                  Hoy
                </h2>
                
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-600">Total actividades</p>
                    <p className="text-2xl font-bold">{registrosHoy.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-600">Tiempo total trabajado</p>
                    <p className="text-2xl font-bold">
                      {registrosHoy.reduce((acc, act) => acc + (act.duracionMinutos || 0), 0)} min
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded p-3">
                    <p className="text-sm text-gray-600">Pendientes marcados</p>
                    <p className="text-2xl font-bold">{pendientesParaSiguienteTurno.length}</p>
                  </div>
                </div>

                <button
                  onClick={generarReporte}
                  className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition duration-200"
                >
                  <FileText size={20} />
                  Generar Reporte de Turno
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Historial del Día */}
        <div className="mt-6 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Actividades Realizadas Hoy</h2>
          
          {registrosHoy.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No hay actividades registradas hoy</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-4">Actividad</th>
                    <th className="text-left py-2 px-4">Turno</th>
                    <th className="text-left py-2 px-4">Inicio</th>
                    <th className="text-left py-2 px-4">Fin</th>
                    <th className="text-left py-2 px-4">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosHoy.map(registro => (
                    <tr key={registro.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{registro.actividadNombre}</td>
                      <td className="py-2 px-4">
                        <span className="text-sm text-gray-600">
                          {registro.turno ? actividadesPorTurno[registro.turno]?.nombre : '-'}
                        </span>
                      </td>
                      <td className="py-2 px-4">{formatearHora(registro.horaInicio)}</td>
                      <td className="py-2 px-4">{registro.horaFin ? formatearHora(registro.horaFin) : '-'}</td>
                      <td className="py-2 px-4">{registro.duracionMinutos || '-'} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Reporte */}
        {mostrarReporte && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-2xl font-bold mb-4">Reporte de Turno</h2>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Información del Turno</h3>
                <div className="bg-gray-50 p-4 rounded">
                  <p><strong>Operador:</strong> {obtenerNombreFormal()}</p>
                  <p><strong>Turno:</strong> {actividadesPorTurno[turnoSeleccionado]?.nombre} ({actividadesPorTurno[turnoSeleccionado]?.horario})</p>
                  <p><strong>Fecha:</strong> {new Date().toLocaleDateString('es-ES')}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Actividades Completadas</h3>
                <div className="border rounded">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2 border-b">Actividad</th>
                        <th className="text-left p-2 border-b">Duración</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrosHoy.filter(r => r.estado === 'completada').map((registro, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{registro.actividadNombre}</td>
                          <td className="p-2">{registro.duracionMinutos} min</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {pendientesParaSiguienteTurno.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Pendientes para Siguiente Turno</h3>
                  <div className="bg-orange-50 p-4 rounded">
                    <ul className="list-disc list-inside">
                      {pendientesParaSiguienteTurno.map((pendiente, idx) => (
                        <li key={idx}>{pendiente}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setMostrarReporte(false)}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition duration-200"
                >
                  Cerrar
                </button>
                <button
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition duration-200"
                  onClick={() => {
                    // Aquí puedes agregar lógica para copiar al portapapeles o enviar
                    alert('Reporte copiado al portapapeles');
                  }}
                >
                  Copiar Reporte
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardOperador;
