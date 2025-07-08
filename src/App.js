import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import Login from './components/Login';
import DashboardOperador from './components/DashboardOperador';
import DashboardAdmin from './components/DashboardAdmin';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // IMPORTANTE: Leer datos del usuario desde Firestore
          const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsuario({
              uid: user.uid,
              email: user.email,
              nombre: userData.nombre,
              rol: userData.rol // <-- Lee el rol desde la base de datos
            });
          }
        } catch (error) {
          console.error('Error obteniendo datos del usuario:', error);
        }
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
