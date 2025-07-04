import React, { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import Login from './components/Login';
import DashboardOperador from './components/DashboardOperador';
import DashboardAdmin from './components/DashboardAdmin';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Aquí obtendremos el rol del usuario desde Firestore
        const userData = {
          uid: user.uid,
          email: user.email,
          nombre: user.email.split('@')[0],
          rol: user.email === 'admin@empresa.com' ? 'administrador' : 'operador'
        };
        setUsuario(userData);
      } else {
        setUsuario(null);
      }
      setCargando(false);
    });

    return () => unsubscribe();
  }, []);

  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  if (!usuario) {
    return <Login />;
  }

  return usuario.rol === 'administrador' ? 
    <DashboardAdmin usuario={usuario} /> : 
    <DashboardOperador usuario={usuario} />;
}

export default App;
