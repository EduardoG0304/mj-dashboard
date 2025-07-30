'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import AuthGuard from '../components/AuthGuard'
import { useRouter } from 'next/navigation'
import { FiLogOut, FiRefreshCw, FiChevronRight, FiImage, FiCalendar, FiDollarSign, FiPlus, FiAlertCircle, FiX, FiUpload, FiSave, FiFolder, FiCheck, FiChevronDown, FiChevronUp } from 'react-icons/fi'

export default function Panel() {
  const [eventos, setEventos] = useState([])
  const [nombre, setNombre] = useState('')
  const [fecha, setFecha] = useState('')
  const [precioImagen, setPrecioImagen] = useState(0)
  const [loading, setLoading] = useState({
    eventos: true,
    formulario: false,
    procesandoImagenes: false,
    agregandoFotos: false,
    subiendoImagenes: false
  })
  const [error, setError] = useState('')
  const [fotosPorSubir, setFotosPorSubir] = useState([])
  const [eventoActual, setEventoActual] = useState(null)
  const [progresoSubida, setProgresoSubida] = useState(0)
  const [fotosExpandidas, setFotosExpandidas] = useState({})
  const router = useRouter()
  const portadaInputRef = useRef(null)
  const originalInputRef = useRef(null)

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('eventos')
          .select(`
            *,
            fotos: fotos(id, url, precio, ruta_portada, ruta_original)
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

  useEffect(() => {
    return () => {
      fotosPorSubir.forEach(foto => {
        if (foto.portada?.preview) URL.revokeObjectURL(foto.portada.preview)
        if (foto.original?.preview) URL.revokeObjectURL(foto.original.preview)
      })
    }
  }, [fotosPorSubir])

  const handlePortadaChange = (e, index) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.match('image.*')) {
        setError('El archivo seleccionado no es una imagen válida')
        return
      }

      const imageWithPreview = {
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size > 1024000
          ? `${(file.size / 1024000).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`
      }

      setFotosPorSubir(prev => {
        const nuevasFotos = [...prev]
        nuevasFotos[index].portada = imageWithPreview
        return nuevasFotos
      })
      
      setError('')
    } catch (err) {
      setError('Error al cargar la portada: ' + err.message)
    }
  }

  const handleOriginalChange = (e, index) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.match('image.*')) {
        setError('El archivo seleccionado no es una imagen válida')
        return
      }

      const imageWithPreview = {
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size > 1024000
          ? `${(file.size / 1024000).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`
      }

      setFotosPorSubir(prev => {
        const nuevasFotos = [...prev]
        nuevasFotos[index].original = imageWithPreview
        return nuevasFotos
      })
      
      setError('')
    } catch (err) {
      setError('Error al cargar la imagen original: ' + err.message)
    }
  }

  const removeFotoPorSubir = (index) => {
    setFotosPorSubir(prev => {
      const nuevasFotos = [...prev]
      const foto = nuevasFotos[index]
      if (foto.portada?.preview) URL.revokeObjectURL(foto.portada.preview)
      if (foto.original?.preview) URL.revokeObjectURL(foto.original.preview)
      nuevasFotos.splice(index, 1)
      return nuevasFotos
    })
  }

  const agregarNuevoParDeFotos = () => {
    setFotosPorSubir(prev => [...prev, { portada: null, original: null }])
  }

  const crearEvento = async () => {
    if (!nombre || !fecha) {
      setError('Nombre y fecha son obligatorios')
      return
    }

    if (fotosPorSubir.length === 0) {
      setError('Debes subir al menos una foto (portada + original)')
      return
    }

    const fotosIncompletas = fotosPorSubir.some(foto => !foto.portada || !foto.original)
    if (fotosIncompletas) {
      setError('Todas las fotos deben tener tanto la versión de portada como la original')
      return
    }

    setLoading(prev => ({ ...prev, formulario: true, procesandoImagenes: false }))
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

      setEventoActual(evento)
      
      setLoading(prev => ({ ...prev, procesandoImagenes: true, subiendoImagenes: true }))
      await subirTodasLasFotos(evento.id)

      const { data: eventoActualizado, error: fetchError } = await supabase
        .from('eventos')
        .select(`
          *,
          fotos: fotos(id, url, precio, ruta_portada, ruta_original)
        `)
        .eq('id', evento.id)
        .single()

      if (fetchError) throw fetchError

      setEventos(prev => [eventoActualizado, ...prev])

      setNombre('')
      setFecha('')
      setPrecioImagen(0)
      setFotosPorSubir([])
      setEventoActual(null)

    } catch (err) {
      setError('Error al crear evento: ' + err.message)
      console.error(err)
    } finally {
      setLoading(prev => ({ ...prev, formulario: false, procesandoImagenes: false, subiendoImagenes: false }))
    }
  }

  const agregarFotosAEvento = async (eventoId) => {
    if (fotosPorSubir.length === 0) {
      setError('Debes subir al menos una foto (portada + original)')
      return
    }

    const fotosIncompletas = fotosPorSubir.some(foto => !foto.portada || !foto.original)
    if (fotosIncompletas) {
      setError('Todas las fotos deben tener tanto la versión de portada como la original')
      return
    }

    setLoading(prev => ({ ...prev, agregandoFotos: true, subiendoImagenes: true }))
    setError('')

    try {
      await subirTodasLasFotos(eventoId)

      const { data: eventosActualizados, error: fetchError } = await supabase
        .from('eventos')
        .select(`
          *,
          fotos: fotos(id, url, precio, ruta_portada, ruta_original)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setEventos(eventosActualizados || [])
      setFotosPorSubir([])

    } catch (err) {
      setError('Error al agregar fotos: ' + err.message)
      console.error(err)
    } finally {
      setLoading(prev => ({ ...prev, agregandoFotos: false, subiendoImagenes: false }))
    }
  }

  const agregarMarcaDeAgua = async (imageFile) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(imageFile)
      }, 200)
    })
  }

  const subirTodasLasFotos = async (eventoId) => {
    try {
      let fotosSubidas = 0
      const totalFotos = fotosPorSubir.length
      
      for (const [index, foto] of fotosPorSubir.entries()) {
        const timestamp = Date.now()
        const nombrePortada = `${timestamp}-${foto.portada.file.name.replace(/\s+/g, '-')}`
        const nombreOriginal = `${timestamp}-${foto.original.file.name.replace(/\s+/g, '-')}`
        
        const rutaPortada = `eventos/${eventoId}/${nombrePortada}`
        const rutaOriginal = `eventos/${eventoId}/${nombreOriginal}`

        const imagenConMarca = await agregarMarcaDeAgua(foto.portada.file)
        const { error: uploadPortadaError } = await supabase.storage
          .from('fotos_eventos')
          .upload(rutaPortada, imagenConMarca)

        if (uploadPortadaError) throw uploadPortadaError

        const { error: uploadOriginalError } = await supabase.storage
          .from('fotos_eventos')
          .upload(rutaOriginal, foto.original.file)

        if (uploadOriginalError) throw uploadOriginalError

        const { data: { publicUrl: urlPortada } } = supabase.storage
          .from('fotos_eventos')
          .getPublicUrl(rutaPortada)

        const { error: dbError } = await supabase
          .from('fotos')
          .insert({
            evento_id: eventoId,
            url: urlPortada,
            precio: precioImagen,
            nombre: nombrePortada,
            ruta_portada: rutaPortada,
            ruta_original: rutaOriginal
          })

        if (dbError) throw dbError

        fotosSubidas++
        setProgresoSubida(Math.round((fotosSubidas / totalFotos) * 100))
      }
    } catch (err) {
      throw new Error('Error al subir imágenes: ' + err.message)
    } finally {
      setProgresoSubida(0)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const calcularPrecioTotal = (fotos) => {
    return fotos?.reduce((total, foto) => total + (foto.precio || 0), 0) || 0
  }

  const toggleExpandirFotos = (eventoId) => {
    setFotosExpandidas(prev => ({
      ...prev,
      [eventoId]: !prev[eventoId]
    }))
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
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

        <main className="p-6 md:p-8 max-w-6xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-800 border-l-4 border-red-600 flex items-start gap-2 rounded-lg">
              <FiAlertCircle className="flex-shrink-0 mt-0.5 text-xl" />
              <span className="text-sm font-bold">{error}</span>
            </div>
          )}

          <section className="mb-12 bg-white p-6 rounded-xl shadow-md border border-gray-200">
            <h2 className="text-xl font-bold tracking-tight mb-6 pb-4 border-b border-gray-200 text-gray-900">
              {eventoActual ? 'AGREGAR FOTOS AL EVENTO' : 'NUEVO EVENTO'}
            </h2>

            {!eventoActual && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900">Nombre del Evento *</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="w-full p-3 border border-gray-300 focus:ring-2 focus:ring-black focus:border-black rounded-lg bg-white font-medium placeholder-gray-500 text-gray-900"
                      placeholder="Ej: Fiesta de cumpleaños"
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
            )}

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
                    placeholder="Ej: 5.99"
                    disabled={loading.formulario || loading.agregandoFotos}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900">Total estimado</label>
                <div className="w-full p-3 border border-gray-300 bg-gray-50 font-bold rounded-lg text-gray-900">
                  ${(fotosPorSubir.length * precioImagen).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Fotos a subir ({fotosPorSubir.length})
                </h3>
                <button
                  onClick={agregarNuevoParDeFotos}
                  disabled={loading.formulario || loading.agregandoFotos}
                  className="flex items-center gap-2 text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FiPlus />
                  <span>Nuevo par</span>
                </button>
              </div>

              {fotosPorSubir.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-lg border border-dashed border-gray-300 text-center">
                  <FiImage className="mx-auto text-gray-400 text-2xl mb-2" />
                  <p className="text-gray-700 font-medium">No hay fotos para subir</p>
                  <p className="text-sm text-gray-500 mt-1">Agrega al menos un par de fotos (portada + original)</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {fotosPorSubir.map((foto, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <FiFolder className="text-gray-500" />
                          <span>Foto #{index + 1}</span>
                          {(foto.portada && foto.original) && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <FiCheck size={12} />
                              <span>Lista</span>
                            </span>
                          )}
                        </h4>
                        <button
                          onClick={() => removeFotoPorSubir(index)}
                          className="text-red-500 hover:text-red-700"
                          disabled={loading.formulario || loading.agregandoFotos}
                        >
                          <FiX />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-900">
                            Foto de Portada (con marca de agua)
                          </label>
                          {foto.portada ? (
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-sm border border-gray-300">
                              <img
                                src={foto.portada.preview}
                                alt="Preview portada"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-xs text-white truncate font-medium">{foto.portada.name}</p>
                                <p className="text-xs text-gray-300">{foto.portada.size}</p>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-400 hover:border-black hover:bg-gray-50 cursor-pointer transition-all rounded-lg">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FiImage className="mb-2 text-gray-700 text-2xl" />
                                <p className="text-sm text-gray-900 font-medium">Seleccionar portada</p>
                                <p className="text-xs text-gray-600 mt-1">JPEG, PNG, WEBP</p>
                              </div>
                              <input
                                type="file"
                                onChange={(e) => handlePortadaChange(e, index)}
                                className="hidden"
                                accept="image/jpeg, image/png, image/webp"
                                disabled={loading.formulario || loading.agregandoFotos}
                                ref={portadaInputRef}
                              />
                            </label>
                          )}
                        </div>

                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-900">
                            Foto Original (sin marca de agua)
                          </label>
                          {foto.original ? (
                            <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-sm border border-gray-300">
                              <img
                                src={foto.original.preview}
                                alt="Preview original"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                                <p className="text-xs text-white truncate font-medium">{foto.original.name}</p>
                                <p className="text-xs text-gray-300">{foto.original.size}</p>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-400 hover:border-black hover:bg-gray-50 cursor-pointer transition-all rounded-lg">
                              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <FiImage className="mb-2 text-gray-700 text-2xl" />
                                <p className="text-sm text-gray-900 font-medium">Seleccionar original</p>
                                <p className="text-xs text-gray-600 mt-1">JPEG, PNG, WEBP</p>
                              </div>
                              <input
                                type="file"
                                onChange={(e) => handleOriginalChange(e, index)}
                                className="hidden"
                                accept="image/jpeg, image/png, image/webp"
                                disabled={loading.formulario || loading.agregandoFotos}
                                ref={originalInputRef}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {loading.subiendoImagenes && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-700 mb-1">
                  <span>Subiendo imágenes...</span>
                  <span>{progresoSubida}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${progresoSubida}%` }}
                  ></div>
                </div>
              </div>
            )}

            {eventoActual ? (
              <div className="space-y-4">
                <button
                  onClick={() => agregarFotosAEvento(eventoActual.id)}
                  disabled={loading.agregandoFotos || fotosPorSubir.length === 0 || fotosPorSubir.some(f => !f.portada || !f.original)}
                  className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 transition-colors disabled:bg-gray-400 font-bold rounded-lg text-lg shadow-md hover:shadow-lg"
                >
                  {loading.agregandoFotos ? (
                    <>
                      <FiRefreshCw className="animate-spin" />
                      <span>AGREGANDO FOTOS...</span>
                    </>
                  ) : (
                    <>
                      <FiUpload />
                      <span>AGREGAR FOTOS AL EVENTO</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setEventoActual(null)
                    setFotosPorSubir([])
                  }}
                  className="w-full flex justify-center items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-4 transition-colors font-medium rounded-lg shadow-sm hover:shadow-md"
                >
                  <FiX />
                  <span>CANCELAR</span>
                </button>
              </div>
            ) : (
              <button
                onClick={crearEvento}
                disabled={loading.formulario || !nombre || !fecha || fotosPorSubir.length === 0 || fotosPorSubir.some(f => !f.portada || !f.original)}
                className="w-full flex justify-center items-center gap-2 bg-black hover:bg-gray-800 text-white py-3 px-4 transition-colors disabled:bg-gray-400 font-bold rounded-lg text-lg shadow-md hover:shadow-lg"
              >
                {loading.formulario ? (
                  <>
                    <FiRefreshCw className="animate-spin" />
                    <span>
                      {loading.procesandoImagenes ? 'PROCESANDO IMÁGENES...' : 'CREANDO EVENTO...'}
                    </span>
                  </>
                ) : (
                  <>
                    <FiSave />
                    <span>CREAR EVENTO</span>
                  </>
                )}
              </button>
            )}
          </section>

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
                            <span className="text-xs text-gray-500 ml-2">({evento.fotos.length} fotos)</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEventoActual(evento)
                            setPrecioImagen(evento.fotos?.[0]?.precio || 0)
                          }}
                          className="flex items-center gap-1 text-sm font-medium text-white hover:text-gray-200 transition-colors bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg"
                        >
                          <FiUpload />
                          <span>Agregar fotos</span>
                        </button>
                        <button
                          onClick={() => router.push(`/eventos/${evento.id}`)}
                          className="flex items-center gap-1 text-sm font-medium text-white hover:text-gray-200 transition-colors bg-black hover:bg-gray-800 px-3 py-1.5 rounded-lg"
                        >
                          <span>Ver detalles</span>
                          <FiChevronRight />
                        </button>
                      </div>
                    </div>

                    {evento.fotos?.length > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={() => toggleExpandirFotos(evento.id)}
                          className="flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900 mb-2"
                        >
                          {fotosExpandidas[evento.id] ? (
                            <>
                              <FiChevronUp />
                              <span>Ocultar fotos</span>
                            </>
                          ) : (
                            <>
                              <FiChevronDown />
                              <span>Mostrar fotos ({evento.fotos.length})</span>
                            </>
                          )}
                        </button>
                        
                        {fotosExpandidas[evento.id] && (
                          <div className="flex gap-2 overflow-x-auto py-1">
                            {evento.fotos.map((foto, index) => (
                              <div key={foto.id} className="relative flex-shrink-0 group w-20 h-20">
                                <img
                                  src={foto.url}
                                  alt={`Imagen ${index + 1} del evento`}
                                  className="h-full w-full object-cover rounded-lg shadow-sm border border-gray-300"
                                  onError={(e) => {
                                    e.target.onerror = null
                                    e.target.src = '/images/placeholder-image.jpg'
                                  }}
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-center">
                                  <p className="text-[10px] font-bold text-white">${foto.precio?.toFixed(2) || '0.00'}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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