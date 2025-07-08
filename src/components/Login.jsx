import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [esRegistro, setEsRegistro] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Lista de correos administradores
  const correosAdmin = [
    'admin@empresa.com',
    'sergio.hernandez@fractalia.es',
    'antonioj.macias@fractalia.es',
    'luis.herrera@fractaliasystems.es'
  ];

  const esAdministrador = (email) => {
    return correosAdmin.includes(email.toLowerCase());
  };

  const obtenerNombreUsuario = (email) => {
    // Nombres personalizados para administradores
    const nombresAdmin = {
      'sergio.hernandez@fractalia.es': 'Sergio Hernández',
      'antonioj.macias@fractalia.es': 'Antonio Macías',
      'luis.herrera@fractaliasystems.es': 'Luis Herrera',
      'admin@empresa.com': 'Administrador'
    };
    
    return nombresAdmin[email.toLowerCase()] || email.split('@')[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    try {
      if (esRegistro) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        await setDoc(doc(db, 'usuarios', userCredential.user.uid), {
          email: email,
          nombre: obtenerNombreUsuario(email),
          rol: esAdministrador(email) ? 'administrador' : 'operador',
          fechaCreacion: new Date(),
          activo: true
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {esRegistro ? 'Registro' : 'Iniciar Sesión'}
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="correo@ejemplo.com"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
              required
            />
          </div>
          {error && (
            <div className="mb-4 text-red-500 text-sm">{error}</div>
          )}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition duration-200 disabled:opacity-50"
          >
            {cargando ? 'Cargando...' : esRegistro ? 'Registrarse' : 'Iniciar Sesión'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          {esRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}
          <button
            onClick={() => setEsRegistro(!esRegistro)}
            className="text-blue-500 ml-1 hover:underline"
          >
            {esRegistro ? 'Iniciar Sesión' : 'Registrarse'}
          </button>
        </p>
        {esRegistro && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-800 text-center">
              <strong>Cuentas con acceso de administrador:</strong>
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1">
              <li>• Sergio Hernández (sergio.hernandez@fractalia.es)</li>
              <li>• Antonio Macías (antonioj.macias@fractalia.es)</li>
              <li>• Luis Herrera (luis.herrera@fractaliasystems.es)</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
