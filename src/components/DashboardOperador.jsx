import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus, Activity, LogOut, Calendar, Moon, Sun, Sunset, Check, FileText, AlertCircle, Pause, PlayCircle, Send } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';

function DashboardOperador({ usuario }) {
  const [turnoSeleccionado, setTurnoSeleccionado] = useState(null);
  const [actividadesActivas, setActividadesActivas] = useState([]);
  const [registrosHoy, setRegistrosHoy] = useState([]);
  const [nuevaActividad, setNuevaActividad] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [actividadesCompletadas, setActividadesCompletadas] = useState([]);
  const [pendientesParaSiguienteTurno, setPendientesParaSiguienteTurno] = useState([]);
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [mostrarFormularioSolicitud, setMostrarFormularioSolicitud] = useState(null);
  const [descripcionSolicitud, setDescripcionSolicitud] = useState('');
  const [actividadPersonalizadaPendiente, setActividadPersonalizadaPendiente] = useState(false);
  const [tituloActividad, setTituloActividad] = useState('');
  const [descripcionActividad, setDescripcionActividad] = useState('');
  const [mostrarFormularioValidacion, setMostrarFormularioValidacion] = useState(null);
  const [descripcionValidacion, setDescripcionValidacion] = useState('');
  const [mostrarFormularioActividad, setMostrarFormularioActividad] = useState(null);
  const [descripcionActividadEjecutada, setDescripcionActividadEjecutada] = useState('');
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

  // Actividades recurrentes (siempre disponibles)
  const actividadesRecurrentes = [
    'Mensajes pendientes respuesta cao',
    'Mensajes pendientes respuesta ges'
  ];

  // Validaciones comunes predefinidas
  const validacionesComunes = [
    'Reportar agente offline',
    'Alerta dynatrace',
    'Ping fail',
    'Registro incidente',
    'Registro evento',
    'Registro actividad programada',
    'Registro standines diario'
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
      
      // Actualizar actividades completadas - extraer solo el nombre base de la actividad
      const completadas = registros
        .filter(r => r.estado === 'completada')
        .map(r => {
          // Si la actividad tiene formato "nombre: descripción", extraer solo el nombre
          const nombreCompleto = r.actividadNombre;
          const colonIndex = nombreCompleto.indexOf(':');
          return colonIndex > 0 ? nombreCompleto.substring(0, colonIndex).trim() : nombreCompleto;
        });
      setActividadesCompletadas(completadas);
      
      // Cargar actividades activas (en progreso o pausadas)
      const activas = registros.filter(r => ['en_progreso', 'pausada'].includes(r.estado));
      setActividadesActivas(activas);
    });

    return () => {
      unsubRegistros();
    };
  }, [usuario.uid]);

  const seleccionarTurno = (turno) => {
    setTurnoSeleccionado(turno);
  };

  const iniciarActividad = async (nombreActividad, descripcion = '', dejarPendiente = false) => {
    try {
      const actividadCompleta = descripcion.trim() 
        ? `${nombreActividad}: ${descripcion.trim()}`
        : nombreActividad;

      const nuevaActividad = {
        usuarioId: usuario.uid,
        usuarioNombre: obtenerNombreFormal(),
        usuarioEmail: usuario.email,
        actividadNombre: actividadCompleta,
        turno: turnoSeleccionado,
        horaInicio: new Date(),
        horaFin: null,
        duracionMinutos: null,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'en_progreso',
        createdAt: new Date()
      };

      await addDoc(collection(db, 'registros_actividades'), nuevaActividad);
      
      // Si está marcado como pendiente, agregarlo a la lista
      if (dejarPendiente && descripcion.trim()) {
        setPendientesParaSiguienteTurno([...pendientesParaSiguienteTurno, {
          titulo: nombreActividad,
          descripcion: descripcion.trim(),
          completo: `#${nombreActividad}#\n${descripcion.trim()}`
        }]);
      }
      
      setMostrarNueva(false);
      setNuevaActividad('');
      setTituloActividad('');
      setDescripcionActividad('');
      setActividadPersonalizadaPendiente(false);
      setMostrarFormularioActividad(null);
      setDescripcionActividadEjecutada('');
    } catch (error) {
      console.error('Error al iniciar actividad:', error);
    }
  };

  const pausarActividad = async (actividadId) => {
    try {
      await updateDoc(doc(db, 'registros_actividades', actividadId), {
        estado: 'pausada',
        ultimaPausa: new Date()
      });
    } catch (error) {
      console.error('Error al pausar actividad:', error);
    }
  };

  const reanudarActividad = async (actividadId) => {
    try {
      await updateDoc(doc(db, 'registros_actividades', actividadId), {
        estado: 'en_progreso',
        ultimaReanudacion: new Date()
      });
    } catch (error) {
      console.error('Error al reanudar actividad:', error);
    }
  };

  const finalizarActividad = async (actividadId, horaInicio) => {
    try {
      const horaFin = new Date();
      const duracion = Math.round((horaFin - horaInicio) / 60000);
      
      await updateDoc(doc(db, 'registros_actividades', actividadId), {
        horaFin: horaFin,
        duracionMinutos: duracion,
        estado: 'completada'
      });
    } catch (error) {
      console.error('Error al finalizar actividad:', error);
    }
  };

  const iniciarActividadConDescripcion = (actividad) => {
    setMostrarFormularioActividad(actividad);
  };

  const confirmarActividadConDescripcion = () => {
    if (descripcionActividadEjecutada.trim()) {
      iniciarActividad(mostrarFormularioActividad, descripcionActividadEjecutada);
    } else {
      iniciarActividad(mostrarFormularioActividad);
    }
  };

  const marcarComoPendiente = (actividad, descripcion) => {
    if (!pendientesParaSiguienteTurno.some(p => p.titulo === actividad)) {
      setPendientesParaSiguienteTurno([...pendientesParaSiguienteTurno, {
        titulo: actividad,
        descripcion: descripcion || '',
        completo: descripcion ? `#${actividad}#\n${descripcion}` : `#${actividad}#`
      }]);
    }
  };

  const quitarDePendientes = (titulo) => {
    setPendientesParaSiguienteTurno(pendientesParaSiguienteTurno.filter(p => p.titulo !== titulo));
  };

  const iniciarSolicitud = (tipo) => {
    setMostrarFormularioSolicitud(tipo);
  };

  const confirmarSolicitud = () => {
    if (descripcionSolicitud.trim()) {
      iniciarActividad(`Solicitud ${mostrarFormularioSolicitud}`, descripcionSolicitud);
      setDescripcionSolicitud('');
      setMostrarFormularioSolicitud(null);
    }
  };

  const iniciarValidacion = (tipo) => {
    setMostrarFormularioValidacion(tipo);
  };

  const confirmarValidacion = () => {
    if (descripcionValidacion.trim()) {
      iniciarActividad(`#${mostrarFormularioValidacion}#`, descripcionValidacion);
      setDescripcionValidacion('');
      setMostrarFormularioValidacion(null);
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

  const cambiarTurno = () => {
    setTurnoSeleccionado(null);
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
              <div className="flex items-center gap-2">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                  <TurnoIcon size={16} />
                  Turno {actividadesPorTurno[turnoSeleccionado].nombre}
                </span>
                <button
                  onClick={cambiarTurno}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Cambiar
                </button>
              </div>
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
                    onClick={() => seleccionarTurno(key)}
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
              {/* Actividades Activas */}
              {actividadesActivas.length > 0 && (
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Actividades en Curso</h2>
                  <div className="space-y-3">
                    {actividadesActivas.map((actividad) => (
                      <div key={actividad.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{actividad.actividadNombre}</p>
                            <p className="text-sm text-gray-600">
                              Iniciada: {formatearHora(actividad.horaInicio)}
                              {actividad.estado === 'pausada' && ' (PAUSADA)'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {actividad.estado === 'en_progreso' ? (
                              <button
                                onClick={() => pausarActividad(actividad.id)}
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded flex items-center gap-1"
                              >
                                <Pause size={16} />
                                Pausar
                              </button>
                            ) : (
                              <button
                                onClick={() => reanudarActividad(actividad.id)}
                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded flex items-center gap-1"
                              >
                                <PlayCircle size={16} />
                                Reanudar
                              </button>
                            )}
                            <button
                              onClick={() => finalizarActividad(actividad.id, actividad.horaInicio)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded flex items-center gap-1"
                            >
                              <Square size={16} />
                              Finalizar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Selector de Actividades */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Activity className="text-blue-500" />
                  Actividades del Turno {actividadesPorTurno[turnoSeleccionado].nombre}
                </h2>

                {/* Actividades del turno */}
                <h3 className="font-semibold mb-3">Actividades predefinidas:</h3>
                <div className="grid grid-cols-1 gap-2 mb-6">
                  {actividadesPorTurno[turnoSeleccionado].actividades.map((actividad, index) => {
                    const completada = actividadYaCompletada(actividad);
                    const recurrente = esActividadRecurrente(actividad);
                    
                    return (
                      <div key={index} className="flex gap-2">
                        <button
                          onClick={() => iniciarActividadConDescripcion(actividad)}
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
                      </div>
                    );
                  })}
                </div>

                {/* Solicitudes con descripción */}
                <h3 className="font-semibold mb-3">Solicitudes:</h3>
                <div className="grid grid-cols-1 gap-2 mb-6">
                  {['Daniel', 'Miguel', 'Antonio'].map((nombre) => (
                    <button
                      key={nombre}
                      onClick={() => iniciarSolicitud(nombre)}
                      className="bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg text-left transition duration-200"
                    >
                      <Play size={16} className="inline mr-2" />
                      Solicitud {nombre}
                    </button>
                  ))}
                </div>

                {/* Validaciones Comunes */}
                <h3 className="font-semibold mb-3 mt-6">Validaciones comunes:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                  {validacionesComunes.map((validacion) => (
                    <button
                      key={validacion}
                      onClick={() => iniciarValidacion(validacion)}
                      className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg text-left transition duration-200"
                    >
                      <Play size={16} className="inline mr-2" />
                      {validacion}
                    </button>
                  ))}
                </div>

                {/* Actividad Personalizada */}
                <h3 className="font-semibold mb-3">Actividad personalizada:</h3>
                {mostrarNueva ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={tituloActividad}
                      onChange={(e) => setTituloActividad(e.target.value)}
                      placeholder="Título de la actividad..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <textarea
                      value={descripcionActividad}
                      onChange={(e) => setDescripcionActividad(e.target.value)}
                      placeholder="Descripción o detalles..."
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-20 resize-none"
                    />
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        id="pendiente-checkbox"
                        checked={actividadPersonalizadaPendiente}
                        onChange={(e) => setActividadPersonalizadaPendiente(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="pendiente-checkbox" className="text-sm text-gray-700">
                        Marcar como pendiente para siguiente turno
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (tituloActividad.trim()) {
                            iniciarActividad(tituloActividad.trim(), descripcionActividad.trim(), actividadPersonalizadaPendiente);
                          }
                        }}
                        disabled={!tituloActividad.trim()}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition duration-200 disabled:opacity-50"
                      >
                        <Play size={16} className="inline mr-2" />
                        Iniciar Actividad
                      </button>
                      <button
                        onClick={() => {
                          setMostrarNueva(false);
                          setTituloActividad('');
                          setDescripcionActividad('');
                          setActividadPersonalizadaPendiente(false);
                        }}
                        className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setMostrarNueva(true)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition duration-200 w-full"
                  >
                    <Plus size={16} />
                    Otra actividad
                  </button>
                )}
              </div>
            </div>

            {/* Resumen del Día y Botón de Reporte */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="text-green-500" />
                  Resumen del Día
                </h2>
                
                <div className="space-y-2">
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-600">Total actividades</p>
                    <p className="text-2xl font-bold">{registrosHoy.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-600">Actividades activas</p>
                    <p className="text-2xl font-bold">{actividadesActivas.length}</p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-600">Tiempo total trabajado</p>
                    <p className="text-2xl font-bold">
                      {registrosHoy.reduce((acc, act) => acc + (act.duracionMinutos || 0), 0)} min
                    </p>
                  </div>
                  <div className="bg-orange-50 rounded p-3">
                    <p className="text-sm text-gray-600">Pendientes para siguiente turno</p>
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

              {/* Lista de Pendientes */}
              {pendientesParaSiguienteTurno.length > 0 && (
                <div className="bg-orange-50 rounded-lg shadow-md p-4">
                  <h3 className="font-semibold mb-2 text-orange-800">Pendientes marcados:</h3>
                  <ul className="text-sm space-y-2">
                    {pendientesParaSiguienteTurno.map((pendiente, idx) => (
                      <li key={idx} className="border-b border-orange-200 pb-2">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{pendiente.titulo}</p>
                            {pendiente.descripcion && (
                              <p className="text-xs text-gray-600 mt-1">{pendiente.descripcion}</p>
                            )}
                          </div>
                          <button
                            onClick={() => quitarDePendientes(pendiente.titulo)}
                            className="text-red-500 hover:text-red-700 text-xs ml-2"
                          >
                            Quitar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Historial del Día */}
        {turnoSeleccionado && (
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
                      <th className="text-left py-2 px-4">Estado</th>
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
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            registro.estado === 'completada' 
                              ? 'bg-green-100 text-green-800' 
                              : registro.estado === 'pausada'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
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
        )}

        {/* Modal de Actividad con Descripción */}
        {mostrarFormularioActividad && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">{mostrarFormularioActividad}</h3>
              <p className="text-sm text-gray-600 mb-3">
                Agrega un mensaje si hubo algún inconveniente o detalle especial:
              </p>
              <textarea
                value={descripcionActividadEjecutada}
                onChange={(e) => setDescripcionActividadEjecutada(e.target.value)}
                placeholder="Ej: El correo no llegó, la validación falló, etc. (Opcional)"
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32 resize-none"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setMostrarFormularioActividad(null);
                    setDescripcionActividadEjecutada('');
                  }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarActividadConDescripcion}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition duration-200"
                >
                  Iniciar Actividad
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Solicitud */}
        {mostrarFormularioSolicitud && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Solicitud {mostrarFormularioSolicitud}</h3>
              <textarea
                value={descripcionSolicitud}
                onChange={(e) => setDescripcionSolicitud(e.target.value)}
                placeholder="Describe brevemente la solicitud..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setMostrarFormularioSolicitud(null);
                    setDescripcionSolicitud('');
                  }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarSolicitud}
                  disabled={!descripcionSolicitud.trim()}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition duration-200 disabled:opacity-50"
                >
                  Iniciar Solicitud
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Validación */}
        {mostrarFormularioValidacion && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">{mostrarFormularioValidacion}</h3>
              <textarea
                value={descripcionValidacion}
                onChange={(e) => setDescripcionValidacion(e.target.value)}
                placeholder="Describe brevemente la validación realizada..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
                autoFocus
              />
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => {
                    setMostrarFormularioValidacion(null);
                    setDescripcionValidacion('');
                  }}
                  className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition duration-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarValidacion}
                  disabled={!descripcionValidacion.trim()}
                  className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition duration-200 disabled:opacity-50"
                >
                  Iniciar Validación
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Reporte COMPACTO */}
        {mostrarReporte && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-4 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="border-b pb-3 mb-4">
                <h2 className="text-xl font-bold text-gray-800">📋 Reporte de Turno</h2>
                <div className="text-sm text-gray-600 mt-1">
                  {obtenerNombreFormal()} • {actividadesPorTurno[turnoSeleccionado]?.nombre} • {new Date().toLocaleDateString('es-ES')}
                </div>
              </div>

              {/* Actividades Completadas COMPACTO */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold mb-2 text-green-700">✅ Completadas</h3>
                <div className="space-y-1">
                  {registrosHoy
                    .filter(r => r.turno === turnoSeleccionado && r.estado === 'completada')
                    .filter(r => {
                      // Extraer el nombre base de la actividad para comparar
                      const nombreCompleto = r.actividadNombre;
                      const colonIndex = nombreCompleto.indexOf(':');
                      const nombreBase = colonIndex > 0 ? nombreCompleto.substring(0, colonIndex).trim() : nombreCompleto;
                      return actividadesPorTurno[turnoSeleccionado].actividades.includes(nombreBase);
                    })
                    .length > 0 ? (
                    registrosHoy
                      .filter(r => r.turno === turnoSeleccionado && r.estado === 'completada')
                      .filter(r => {
                        const nombreCompleto = r.actividadNombre;
                        const colonIndex = nombreCompleto.indexOf(':');
                        const nombreBase = colonIndex > 0 ? nombreCompleto.substring(0, colonIndex).trim() : nombreCompleto;
                        return actividadesPorTurno[turnoSeleccionado].actividades.includes(nombreBase);
                      })
                      .map((registro, idx) => (
                        <div key={`comp-${idx}`} className="text-xs bg-green-50 p-2 rounded border-l-2 border-green-400">
                          <span className="font-medium">{registro.actividadNombre}</span>
                          <span className="text-gray-600 ml-2">({formatearHora(registro.horaFin)})</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-xs text-gray-500 italic">Sin actividades completadas</div>
                  )}
                </div>
              </div>

              {/* Actividades en Curso COMPACTO */}
              {actividadesActivas.filter(a => a.turno === turnoSeleccionado).length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2 text-blue-700">🔄 En Curso</h3>
                  <div className="space-y-1">
                    {actividadesActivas
                      .filter(a => a.turno === turnoSeleccionado)
                      .map((actividad, idx) => (
                        <div key={`activa-${idx}`} className="text-xs bg-blue-50 p-2 rounded border-l-2 border-blue-400">
                          <span className="font-medium">{actividad.actividadNombre}</span>
                          <span className="text-gray-600 ml-2">
                            ({formatearHora(actividad.horaInicio)}{actividad.estado === 'pausada' ? ' - PAUSADA' : ''})
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Pendientes COMPACTO */}
              {pendientesParaSiguienteTurno.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2 text-orange-700">📤 Pendientes</h3>
                  <div className="space-y-2">
                    {pendientesParaSiguienteTurno.map((pendiente, idx) => (
                      <div key={`pend-${idx}`} className="bg-orange-50 p-2 rounded border-l-2 border-orange-400">
                        <div className="text-xs font-bold text-gray-800">{pendiente.titulo}</div>
                        {pendiente.descripcion && (
                          <div className="text-xs text-gray-600 mt-1 pl-2 border-l border-gray-300">
                            {pendiente.descripcion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  onClick={() => setMostrarReporte(false)}
                  className="px-3 py-1 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm"
                >
                  Cerrar
                </button>
                <button
                  className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white rounded text-sm"
                  onClick={() => {
                    const actividadesCompletadasTurno = registrosHoy
                      .filter(r => r.turno === turnoSeleccionado && r.estado === 'completada')
                      .filter(r => {
                        const nombreCompleto = r.actividadNombre;
                        const colonIndex = nombreCompleto.indexOf(':');
                        const nombreBase = colonIndex > 0 ? nombreCompleto.substring(0, colonIndex).trim() : nombreCompleto;
                        return actividadesPorTurno[turnoSeleccionado].actividades.includes(nombreBase);
                      });
                    
                    const textoReporte = `
📋 REPORTE ${actividadesPorTurno[turnoSeleccionado]?.nombre.toUpperCase()}
${obtenerNombreFormal()} • ${new Date().toLocaleDateString('es-ES')}

✅ COMPLETADAS:
${actividadesCompletadasTurno.length > 0 
  ? actividadesCompletadasTurno.map(r => `• ${r.actividadNombre}`).join('\n')
  : '• Sin actividades completadas'
}

${actividadesActivas.filter(a => a.turno === turnoSeleccionado).length > 0 ? `
🔄 EN CURSO:
${actividadesActivas.filter(a => a.turno === turnoSeleccionado).map(a => `• ${a.actividadNombre}${a.estado === 'pausada' ? ' (PAUSADA)' : ''}`).join('\n')}
` : ''}

${pendientesParaSiguienteTurno.length > 0 ? `
📤 PENDIENTES:
${pendientesParaSiguienteTurno.map(p => `
🔸 ${p.titulo}
${p.descripcion ? `   ${p.descripcion.replace(/\n/g, '\n   ')}` : ''}
`).join('\n')}` : ''}
                    `.trim();
                    
                    navigator.clipboard.writeText(textoReporte);
                    alert('Reporte copiado al portapapeles');
                  }}
                >
                  📋 Copiar
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
