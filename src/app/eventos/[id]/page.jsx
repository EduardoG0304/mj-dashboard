'use client'
import { useState, useEffect } from 'react'
import { use } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FiEdit, FiTrash2, FiSave, FiX, FiChevronLeft, FiImage, FiCalendar, FiDollarSign } from 'react-icons/fi'

export default function DetalleEvento({ params }) {
  const { id } = use(params)

  const router = useRouter()
  const [evento, setEvento] = useState(null)
  const [fotos, setFotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editando, setEditando] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    fecha: '',
    precioBase: 0
  })

  // Cargar datos del evento
  useEffect(() => {
    const cargarEvento = async () => {
      try {
        setLoading(true)
        
        const { data: eventoData, error: eventoError } = await supabase
          .from('eventos')
          .select('*')
          .eq('id', id)
          .single()

        if (eventoError) throw eventoError

        const { data: fotosData, error: fotosError } = await supabase
          .from('fotos')
          .select('*')
          .eq('evento_id', id)

        if (fotosError) throw fotosError

        setEvento(eventoData)
        setFotos(fotosData || [])
        setFormData({
          nombre: eventoData.nombre,
          fecha: eventoData.fecha,
          precioBase: fotosData[0]?.precio || 0
        })
      } catch (err) {
        setError('Error al cargar el evento: ' + err.message)
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    cargarEvento()
  }, [id])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const guardarCambios = async () => {
    try {
      setLoading(true)
      
      const { error: eventoError } = await supabase
        .from('eventos')
        .update({
          nombre: formData.nombre,
          fecha: formData.fecha
        })
        .eq('id', id)

      if (eventoError) throw eventoError

      if (formData.precioBase !== fotos[0]?.precio) {
        await Promise.all(
          fotos.map(async (foto) => {
            const { error: fotoError } = await supabase
              .from('fotos')
              .update({ precio: formData.precioBase })
              .eq('id', foto.id)

            if (fotoError) throw fotoError
          })
        )
      }

      setEditando(false)
      window.location.reload()
    } catch (err) {
      setError('Error al actualizar el evento: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const eliminarEvento = async () => {
    if (!confirm('¿Estás seguro de eliminar este evento y todas sus fotos?')) return

    try {
      setLoading(true)
      
      await Promise.all(
        fotos.map(async (foto) => {
          const path = foto.url.split('fotos_eventos/')[1]
          const { error: deleteError } = await supabase.storage
            .from('fotos_eventos')
            .remove([path])

          if (deleteError) throw deleteError
        })
      )

      const { error: fotosError } = await supabase
        .from('fotos')
        .delete()
        .eq('evento_id', id)

      if (fotosError) throw fotosError

      const { error: eventoError } = await supabase
        .from('eventos')
        .delete()
        .eq('id', id)

      if (eventoError) throw eventoError

      router.push('/panel')
    } catch (err) {
      setError('Error al eliminar el evento: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const eliminarFoto = async (fotoId, url) => {
    if (!confirm('¿Estás seguro de eliminar esta foto?')) return

    try {
      setLoading(true)
      
      // Eliminar del storage
      const path = url.split('fotos_eventos/')[1]
      const { error: deleteError } = await supabase.storage
        .from('fotos_eventos')
        .remove([path])

      if (deleteError) throw deleteError

      // Eliminar de la base de datos
      const { error: dbError } = await supabase
        .from('fotos')
        .delete()
        .eq('id', fotoId)

      if (dbError) throw dbError

      // Actualizar estado local
      setFotos(prev => prev.filter(foto => foto.id !== fotoId))
    } catch (err) {
      setError('Error al eliminar la foto: ' + err.message)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !evento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 rounded-full border-t-2 border-b-2 border-gray-800"
        />
      </div>
    )
  }

  if (!evento) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100"
      >
        <p className="text-xl font-bold text-gray-900">Evento no encontrado</p>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <motion.header 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="border-b border-gray-200 py-4 px-6 md:px-8 bg-gradient-to-r from-black to-gray-900 text-white shadow-lg"
      >
        <div className="flex justify-between items-center">
          <motion.button 
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/panel')}
            className="flex items-center gap-2 hover:text-gray-300 transition-colors text-white"
          >
            <FiChevronLeft />
            <span>Volver al panel</span>
          </motion.button>
          <div className="flex gap-4">
            {editando ? (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditando(false)}
                  className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg shadow-md transition-all text-white"
                >
                  <FiX />
                  <span>Cancelar</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={guardarCambios}
                  disabled={loading}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg shadow-md transition-all text-white"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    >
                      <FiSave />
                    </motion.div>
                  ) : (
                    <FiSave />
                  )}
                  <span>{loading ? 'Guardando...' : 'Guardar'}</span>
                </motion.button>
              </>
            ) : (
              <>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditando(true)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg shadow-md transition-all text-white"
                >
                  <FiEdit />
                  <span>Editar</span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={eliminarEvento}
                  disabled={loading}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg shadow-md transition-all text-white"
                >
                  <FiTrash2 />
                  <span>Eliminar</span>
                </motion.button>
              </>
            )}
          </div>
        </div>
      </motion.header>

      {/* Contenido principal */}
      <main className="p-6 md:p-8 max-w-6xl mx-auto">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-900 rounded-lg shadow-sm"
            >
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Información del evento */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg"
          >
            <h2 className="text-xl font-bold mb-6 pb-2 border-b border-gray-200 text-gray-900">
              INFORMACIÓN DEL EVENTO
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  Nombre del Evento
                </label>
                {editando ? (
                  <motion.div whileHover={{ scale: 1.01 }}>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 focus:border-black focus:ring-2 focus:ring-black focus:outline-none bg-white font-medium rounded-lg transition-all text-gray-900"
                    />
                  </motion.div>
                ) : (
                  <p className="p-3 bg-gray-50 rounded-lg font-medium text-gray-900 border border-gray-200">
                    {evento.nombre}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  Fecha
                </label>
                {editando ? (
                  <motion.div whileHover={{ scale: 1.01 }} className="relative">
                    <FiCalendar className="absolute right-3 top-3.5 text-gray-700" />
                    <input
                      type="date"
                      name="fecha"
                      value={formData.fecha}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 focus:border-black focus:ring-2 focus:ring-black focus:outline-none bg-white font-medium rounded-lg transition-all text-gray-900"
                    />
                  </motion.div>
                ) : (
                  <p className="p-3 bg-gray-50 rounded-lg font-medium text-gray-900 border border-gray-200">
                    {new Date(evento.fecha).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  Precio por imagen
                </label>
                {editando ? (
                  <motion.div whileHover={{ scale: 1.01 }} className="relative">
                    <FiDollarSign className="absolute right-3 top-3.5 text-gray-700" />
                    <input
                      type="number"
                      name="precioBase"
                      value={formData.precioBase}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="w-full p-3 border border-gray-300 focus:border-black focus:ring-2 focus:ring-black focus:outline-none bg-white font-medium rounded-lg transition-all text-gray-900"
                    />
                  </motion.div>
                ) : (
                  <p className="p-3 bg-gray-50 rounded-lg font-medium text-gray-900 border border-gray-200">
                    ${fotos[0]?.precio?.toFixed(2) || '0.00'}
                  </p>
                )}
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">
                  Total generado
                </label>
                <motion.div 
                  whileHover={{ scale: 1.01 }}
                  className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg font-bold text-gray-900 border border-gray-200"
                >
                  ${(fotos.length * (fotos[0]?.precio || 0)).toFixed(2)}
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Galería de fotos */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg"
          >
            <h2 className="text-xl font-bold mb-6 pb-2 border-b border-gray-200 text-gray-900">
              GALERÍA DE FOTOS ({fotos.length})
            </h2>

            {fotos.length > 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-4"
              >
                {fotos.map((foto, index) => (
                  <motion.div 
                    key={index} 
                    whileHover={{ scale: 1.03 }}
                    className="relative group overflow-hidden rounded-lg shadow-md aspect-square"
                  >
                    <motion.img
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      src={foto.url}
                      alt={`Foto ${index + 1} del evento`}
                      className="w-full h-full object-cover rounded-lg border border-gray-200 hover:shadow-lg transition-all"
                    />
                    {editando && (
                      <button
                        onClick={() => eliminarFoto(foto.id, foto.url)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-100 transition-opacity hover:bg-red-600"
                      >
                        <FiX className="text-sm" />
                      </button>
                    )}
                    <motion.div 
                      whileHover={{ opacity: 1 }}
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent text-white text-center p-2 text-sm font-bold"
                    >
                      ${foto.precio?.toFixed(2) || '0.00'}
                    </motion.div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <FiImage className="text-4xl text-gray-500 mb-4" />
                <p className="text-gray-700 font-medium">No hay fotos en este evento</p>
              </motion.div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  )
}