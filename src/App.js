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
          // Leer datos del usuario desde Firestore
          const userDocRef = doc(db, 'usuarios', user.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUsuario({
              uid: user.uid,
              email: userData.email,
              nombre: userData.nombre,
              rol: userData.rol
            });
          } else {
            // Si no existe el documento (no debería pasar), cerrar sesión
            console.error('No se encontró el documento del usuario');
            setUsuario(null);
          }
        } catch (error) {
          console.error('Error al obtener datos del usuario:', error);
          setUsuario(null);
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
