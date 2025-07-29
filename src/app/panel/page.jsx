'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import AuthGuard from '../components/AuthGuard'
import { useRouter } from 'next/navigation'
import { FiLogOut, FiRefreshCw, FiChevronRight, FiImage, FiCalendar, FiDollarSign, FiPlus, FiAlertCircle, FiX } from 'react-icons/fi'

export default function Panel() {
  const [eventos, setEventos] = useState([])
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const [imagenes, setImagenes] = useState([])
  const [precioImagen, setPrecioImagen] = useState(0)
  const [loading, setLoading] = useState({
    eventos: true,
    formulario: false
  })
  const [error, setError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef(null)
  const dropAreaRef = useRef(null)

  // Cargar eventos al montar el componente
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('eventos')
          .select(`
            *,
            fotos: fotos(url, precio)
          `)
          .order('created_at', { ascending: false })

        if (fetchError) throw fetchError

        setEventos(data || [])
      } catch (err) {
        setError('Error al cargar eventos: ' + err.message)
        console.error(err)
      } finally {
        setLoading(prev => ({ ...prev, eventos: false }))
      }
    }

    cargarDatos()
  }, [])

  // Limpiar URLs de objeto al desmontar
  useEffect(() => {
    return () => {
      imagenes.forEach(img => {
        if (img instanceof Blob) {
          URL.revokeObjectURL(img.preview)
        }
      })
    }
  }, [imagenes])

  // Manejar selección de imágenes (tanto input como drop)
  const handleImageChange = useCallback((e) => {
    try {
      const files = e.target.files || (e.dataTransfer ? e.dataTransfer.files : [])
      if (!files || files.length === 0) return

      // Validar tipos de archivo
      const validImages = Array.from(files).filter(file =>
        file.type.match('image.*')
      )

      if (validImages.length !== files.length) {
        setError('Algunos archivos no son imágenes válidas')
      }

      // Limitar a 20 imágenes
      if (validImages.length + imagenes.length > 20) {
        setError('Máximo 20 imágenes permitidas')
        return
      }

      // Agregar preview a cada imagen
      const imagesWithPreview = validImages.map(file => ({
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size > 1024000
          ? `${(file.size / 1024000).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`
      }))

      setImagenes(prev => [...prev, ...imagesWithPreview])
      setError('')
    } catch (err) {
      setError('Error al cargar imágenes: ' + err.message)
    }
  }, [imagenes.length])

  // Manejar drag and drop
  const handleDragEnter = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      const event = {
        target: {
          files: files
        }
      }
      handleImageChange(event)
    }
  }, [handleImageChange])

  // Eliminar imagen seleccionada
  const removeImage = useCallback((index) => {
    setImagenes(prev => {
      const newImages = [...prev]
      URL.revokeObjectURL(newImages[index].preview)
      newImages.splice(index, 1)
      return newImages
    })
  }, [])

  // Crear nuevo evento
  const crearEvento = async () => {
    if (!nombre || !fecha) {
      setError('Nombre y fecha son obligatorios')
      return
    }

    setLoading(prev => ({ ...prev, formulario: true }))
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .insert([{
          nombre,
          fecha,
          creado_por: user.id
        }])
        .select()
        .single()

      if (eventoError) throw eventoError

      if (imagenes.length > 0) {
        await subirImagenes(evento.id)
      }

      setEventos(prev => [{
        ...evento,
        fotos: imagenes.map((_, i) => ({ url: '', precio: precioImagen }))
      }, ...prev])

      // Resetear formulario
      setNombre('')
      setFecha('')
      setImagenes([])
      setPrecioImagen(0)

    } catch (err) {
      setError('Error al crear evento: ' + err.message)
      console.error(err)
    } finally {
      setLoading(prev => ({ ...prev, formulario: false }))
    }
  }

  // Subir imágenes al storage
  const subirImagenes = async (eventoId) => {
    try {
      await Promise.all(
        imagenes.map(async (img) => {
          const nombreArchivo = `${Date.now()}-${img.file.name.replace(/\s+/g, '-')}`
          const path = `eventos/${eventoId}/${nombreArchivo}`

          const { error: uploadError } = await supabase.storage
            .from('fotos_eventos')
            .upload(path, img.file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('fotos_eventos')
            .getPublicUrl(path)

          const { error: dbError } = await supabase
            .from('fotos')
            .insert({
              evento_id: eventoId,
              url: publicUrl,
              nombre: nombreArchivo,
              precio: precioImagen
            })

          if (dbError) throw dbError
        })
      )
    } catch (err) {
      throw new Error('Error al subir imágenes: ' + err.message)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const calcularPrecioTotal = (fotos) => {
    return fotos?.reduce((total, foto) => total + (foto.precio || 0), 0) || 0
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        {/* Header con logo destacado */}
        <header className="bg-gradient-to-r from-black to-gray-900 py-4 px-6 md:px-8 text-white shadow-lg">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <img
                src="/images/mj_logo.png"
                alt="Logo MJSP"
                className="w-16 h-16 object-contain"
              />
              <div className="ml-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">PANEL DE EVENTOS</h1>
                <div className="w-16 h-0.5 bg-white my-2"></div>
                <p className="text-xs text-gray-300 uppercase tracking-wider">Gestión de eventos</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm uppercase tracking-wider hover:bg-gray-800 px-4 py-2 transition-colors border border-white rounded-lg text-white"
            >
              <FiLogOut className="text-gray-300" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="p-6 md:p-8 max-w-6xl mx-auto">
          {/* Mensajes de error */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-800 border-l-4 border-red-600 flex items-start gap-2 rounded-lg">
              <FiAlertCircle className="flex-shrink-0 mt-0.5 text-xl" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          {/* Formulario de creación */}
          <section className="mb-12 bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h2 className="text-xl font-bold tracking-tight mb-6 pb-4 border-b border-gray-200 text-gray-900">NUEVO EVENTO</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Nombre del Evento *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black rounded-lg bg-white font-medium placeholder-gray-500 text-gray-900"
                    placeholder=" "
                    disabled={loading.formulario}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Fecha *</label>
                <div className="relative">
                  <FiCalendar className="absolute right-3 top-3.5 text-gray-700" />
                  <input
                    type="date"
                    value={fecha}
                    onChange={(e) => setFecha(e.target.value)}
                    className="w-full p-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black rounded-lg bg-white font-medium text-gray-900"
                    disabled={loading.formulario}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Precio por imagen ($)</label>
                <div className="relative">
                  <FiDollarSign className="absolute right-3 top-3.5 text-gray-700" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={precioImagen}
                    onChange={(e) => setPrecioImagen(parseFloat(e.target.value) || 0)}
                    className="w-full p-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black rounded-lg bg-white font-medium placeholder-gray-500 text-gray-900"
                    placeholder=" "
                    disabled={loading.formulario}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Total estimado</label>
                <div className="w-full p-3 border border-gray-300 bg-gray-50 font-bold rounded-lg text-gray-900">
                  ${(imagenes.length * precioImagen).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block mb-2 text-sm font-medium text-gray-900">
                Imágenes ({imagenes.length}/20)
              </label>
              <div
                ref={dropAreaRef}
                className={`relative ${isDragging ? 'bg-gray-100 border-black' : 'bg-white'}`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-400 hover:border-black hover:bg-gray-50 cursor-pointer transition-all rounded-lg">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <FiImage className="mb-2 text-gray-700 text-2xl" />
                    <p className="text-sm text-gray-900 font-medium">Arrastra imágenes o haz clic para seleccionar</p>
                    <p className="text-xs text-gray-600 mt-1">Formatos: JPEG, PNG, WEBP (Máx. 20)</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                    accept="image/jpeg, image/png, image/webp"
                    disabled={loading.formulario || imagenes.length >= 20}
                  />
                </label>
                {isDragging && (
                  <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center rounded-lg pointer-events-none">
                    <div className="bg-white p-4 rounded-lg border-2 border-black shadow-xl">
                      <p className="font-bold text-black">Suelta las imágenes aquí</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Previsualización de imágenes seleccionadas */}
              {imagenes.length > 0 && (
                <div className="mt-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                    {imagenes.map((img, index) => (
                      <div key={index} className="relative aspect-square rounded-lg overflow-hidden shadow-sm border border-gray-300 group">
                        <img
                          src={img.preview}
                          alt={`Preview ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <FiX className="text-xs" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="text-xs text-white truncate font-medium">{img.name}</p>
                          <p className="text-xs text-gray-300">{img.size}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={crearEvento}
              disabled={loading.formulario || !nombre || !fecha}
              className="w-full flex justify-center items-center gap-2 bg-black hover:bg-gray-800 text-white py-3 px-4 transition-colors disabled:bg-gray-400 font-bold rounded-lg text-lg shadow-md hover:shadow-lg"
            >
              {loading.formulario ? (
                <>
                  <FiRefreshCw className="animate-spin" />
                  <span>CREANDO EVENTO...</span>
                </>
              ) : (
                <>
                  <FiPlus />
                  <span>CREAR EVENTO</span>
                </>
              )}
            </button>
          </section>

          {/* Lista de eventos */}
          <section className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">EVENTOS REGISTRADOS</h2>
              <button
                onClick={() => window.location.reload()}
                disabled={loading.eventos}
                className="flex items-center gap-2 text-sm font-medium text-white hover:text-gray-200 transition-colors bg-black hover:bg-gray-800 px-3 py-1.5 rounded-lg"
              >
                {loading.eventos ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiRefreshCw />
                )}
                <span>{loading.eventos ? 'ACTUALIZANDO...' : 'ACTUALIZAR'}</span>
              </button>
            </div>

            {loading.eventos ? (
              <div className="flex justify-center py-12">
                <FiRefreshCw className="animate-spin text-2xl text-gray-700" />
              </div>
            ) : eventos.length === 0 ? (
              <p className="text-center py-12 text-gray-700 font-medium">No hay eventos registrados</p>
            ) : (
              <div className="divide-y divide-gray-200">
                {eventos.map((evento) => (
                  <article key={evento.id} className="py-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-900">{evento.nombre}</h3>
                        <p className="text-sm text-gray-700 mt-1">
                          {new Date(evento.fecha).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                        {evento.fotos?.length > 0 && (
                          <p className="text-sm mt-2">
                            <span className="text-gray-700">Valor total:</span>
                            <span className="font-bold ml-1 text-gray-900">${calcularPrecioTotal(evento.fotos).toFixed(2)}</span>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/eventos/${evento.id}`)}
                        className="flex items-center gap-1 text-sm font-medium text-white hover:text-gray-200 transition-colors bg-black hover:bg-gray-800 px-3 py-1.5 rounded-lg"
                      >
                        <span>Ver detalles</span>
                        <FiChevronRight />
                      </button>
                    </div>

                    {evento.fotos?.length > 0 && (
                      <div className="flex gap-3 mt-4 overflow-x-auto py-2 px-1">
                        {evento.fotos.map((foto, index) => (
                          <div key={index} className="relative flex-shrink-0 group aspect-square w-24 h-24">
                            <img
                              src={foto.url}
                              alt={`Imagen ${index + 1} del evento`}
                              className="h-full w-full object-cover rounded-lg shadow-sm border border-gray-300"
                            />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 text-center">
                              <p className="text-xs font-bold text-white">${foto.precio?.toFixed(2) || '0.00'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </AuthGuard>
  )
}