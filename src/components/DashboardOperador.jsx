import React, { useState, useEffect } from 'react';
import { Clock, Play, Square, Plus, Activity, LogOut, Calendar } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';

function DashboardOperador({ usuario }) {
  const [actividadActual, setActividadActual] = useState(null);
  const [actividadesPredefinidas, setActividadesPredefinidas] = useState([]);
  const [registrosHoy, setRegistrosHoy] = useState([]);
  const [nuevaActividad, setNuevaActividad] = useState('');
  const [mostrarNueva, setMostrarNueva] = useState(false);

  useEffect(() => {
    // Cargar actividades predefinidas
    const qActividades = query(collection(db, 'actividades_predefinidas'), where('activa', '==', true));
    const unsubActividades = onSnapshot(qActividades, (snapshot) => {
      const actividades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setActividadesPredefinidas(actividades);
    });

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
      
      // Verificar si hay actividad en progreso
      const enProgreso = registros.find(r => r.estado === 'en_progreso');
      if (enProgreso) {
        setActividadActual(enProgreso);
      }
    });

    return () => {
      unsubActividades();
      unsubRegistros();
    };
  }, [usuario.uid]);

  const iniciarActividad = async (nombreActividad) => {
    try {
      const nuevaActividad = {
        usuarioId: usuario.uid,
        usuarioNombre: usuario.nombre,
        usuarioEmail: usuario.email,
        actividadNombre: nombreActividad,
        horaInicio: new Date(),
        horaFin: null,
        duracionMinutos: null,
        fecha: new Date().toISOString().split('T')[0],
        estado: 'en_progreso',
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

  const formatearHora = (fecha) => {
    return fecha.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Bitácora de Actividades</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">Hola, {usuario.nombre}</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Panel de Control de Actividad */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Activity className="text-blue-500" />
                Control de Actividad
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
                  <h3 className="font-semibold mb-3">Iniciar Nueva Actividad:</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {actividadesPredefinidas.map(actividad => (
                      <button
                        key={actividad.id}
                        onClick={() => iniciarActividad(actividad.nombre)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-left transition duration-200"
                      >
                        <Play size={16} className="inline mr-2" />
                        {actividad.nombre}
                      </button>
                    ))}
                  </div>

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

          {/* Resumen del Día */}
          <div className="lg:col-span-1">
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
              </div>
            </div>
          </div>
        </div>

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
                    <th className="text-left py-2 px-4">Inicio</th>
                    <th className="text-left py-2 px-4">Fin</th>
                    <th className="text-left py-2 px-4">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosHoy.map(registro => (
                    <tr key={registro.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-4">{registro.actividadNombre}</td>
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
      </div>
    </div>
  );
}

export default DashboardOperador;
