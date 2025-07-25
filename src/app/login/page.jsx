'use client'
import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { FiMail, FiLock, FiAlertCircle, FiLoader } from 'react-icons/fi'
import { motion } from 'framer-motion'

const ALLOWED_USERS = [
  'renegarciagarcia11@gmail.com',
  'admin2@tudominio.com'
]

// Componente de fondo animado con estrellas
const LightSpeedBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      {/* Capa de estrellas 1 */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 20%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 20% 30%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 30% 40%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 40% 50%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 50% 60%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 60% 70%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 70% 80%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 80% 90%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 90% 10%, white 1%, transparent 2%)
          `,
          backgroundSize: '200px 200px',
          animation: 'lightSpeed 2s linear infinite'
        }}
      />
      
      {/* Capa de estrellas 2 */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 15% 25%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 25% 35%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 35% 45%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 45% 55%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 55% 65%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 65% 75%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 75% 85%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 85% 95%, white 1%, transparent 2%),
            radial-gradient(1px 1px at 95% 15%, white 1%, transparent 2%)
          `,
          backgroundSize: '200px 200px',
          animation: 'lightSpeed 2s linear infinite 0.5s'
        }}
      />
      
      {/* Definición de la animación en el estilo global */}
      <style jsx global>{`
        @keyframes lightSpeed {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(100vw);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!email || !password) {
      setError('Por favor completa todos los campos')
      setLoading(false)
      return
    }

    if (!ALLOWED_USERS.includes(email)) {
      setError('Acceso restringido')
      setLoading(false)
      return
    }

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError
      router.push('/panel')
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-black">
      {/* Fondo animado */}
      <LightSpeedBackground />

      {/* Contenedor del formulario */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-4 z-10"
      >
        <div className="bg-black/70 backdrop-blur-sm border rounded-xl p-8 space-y-6 shadow-2xl">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <div className="p-1 bg-white/90 rounded-lg">
              <img
                src="/images/mj_logo.png"
                alt="Logo MJSP"
                className="w-20 h-20 object-contain"
              />
            </div>
          </motion.div>

          {/* Título */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-white">ACCESO</h1>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: '4rem' }}
              transition={{ delay: 0.3 }}
              className="h-0.5 bg-white/50 mx-auto my-4"
            />
          </motion.div>

          {/* Mensaje de error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-900/70 text-white rounded-lg flex items-start gap-2 border border-red-500/30"
            >
              <FiAlertCircle className="flex-shrink-0 mt-0.5 text-red-300" />
              <span className="text-sm font-medium">{error}</span>
            </motion.div>
          )}

          {/* Formulario */}
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Campo Email */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="text-white/60" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 focus:border-white/40 focus:outline-none text-white rounded-lg placeholder-white/40 backdrop-blur-sm"
                  placeholder="tucorreo@ejemplo.com"
                  required
                />
              </div>
            </motion.div>

            {/* Campo Contraseña */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-white/60" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 focus:border-white/40 focus:outline-none text-white rounded-lg placeholder-white/40 backdrop-blur-sm"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </motion.div>

            {/* Botón de Ingreso */}
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 bg-white text-black py-3 px-4 rounded-lg font-bold transition-all hover:bg-white/90 disabled:opacity-70"
            >
              {loading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <FiLoader />
                  </motion.span>
                  <span>VERIFICANDO</span>
                </>
              ) : 'INGRESAR'}
            </motion.button>
          </form>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-center text-xs text-white/50 pt-4 border-t border-white/10"
          >
            <p>Sistema privado • Versión 1.0 • © {new Date().getFullYear()}</p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}