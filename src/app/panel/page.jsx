'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/app/lib/supabase'
import AuthGuard from '../components/AuthGuard'
import { useRouter } from 'next/navigation'
import { 
  FiLogOut, FiRefreshCw, FiChevronRight, FiImage, FiCalendar, 
  FiDollarSign, FiPlus, FiAlertCircle, FiX, FiUpload, FiSave, 
  FiFolder, FiCheck, FiChevronDown, FiChevronUp, FiPercent, 
  FiTrash2, FiEdit, FiEye, FiSettings, FiTag
} from 'react-icons/fi'

export default function Panel() {
  // Estados
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
  const [success, setSuccess] = useState('')
  const [fotosPorSubir, setFotosPorSubir] = useState([])
  const [eventoActual, setEventoActual] = useState(null)
  const [progresoSubida, setProgresoSubida] = useState(0)
  const [fotosExpandidas, setFotosExpandidas] = useState({})
  const router = useRouter()
  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)
  const [portadaEvento, setPortadaEvento] = useState(null)
  const [dragActivePortadaEvento, setDragActivePortadaEvento] = useState(false)
  const [marcaDeAgua, setMarcaDeAgua] = useState(null)
  const [opacidadMarcaAgua, setOpacidadMarcaAgua] = useState(50)
  const [posicionMarcaAgua, setPosicionMarcaAgua] = useState('centro')
  const [descuentos, setDescuentos] = useState([])
  const [mostrarFormularioDescuento, setMostrarFormularioDescuento] = useState(false)
  const [nuevoDescuento, setNuevoDescuento] = useState({
    cantidadMinima: 0,
    porcentaje: 0
  })
  const [activeTab, setActiveTab] = useState('crear')

  // Componente para previsualizar imágenes
  const ImagePreview = ({ src, alt, className }) => {
    const [error, setError] = useState(false)
    
    if (error || !src) {
      return (
        <div className={`${className} bg-gray-200 flex items-center justify-center text-gray-500`}>
          <FiImage className="text-2xl" />
          <span className="sr-only">Imagen no disponible</span>
        </div>
      )
    }

    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onLoad={() => console.log('Imagen cargada correctamente')}
        onError={() => {
          console.log('Error al cargar la imagen')
          setError(true)
        }}
      />
    )
  }

  // Función para crear URLs seguras para previsualización
  const createSafeBlobUrl = (file) => {
    try {
      if (!file) return null
      return URL.createObjectURL(file)
    } catch (err) {
      console.error('Error al crear URL de blob:', err)
      return null
    }
  }

  // Limpieza de URLs de previsualización al desmontar
  useEffect(() => {
    const currentFotos = [...fotosPorSubir]
    const currentPortadaEvento = portadaEvento
    const currentMarcaDeAgua = marcaDeAgua
    
    return () => {
      currentFotos.forEach(foto => {
        if (foto?.preview) {
          try {
            URL.revokeObjectURL(foto.preview)
          } catch (err) {
            console.error('Error al revocar URL al eliminar foto:', err)
          }
        }
      })
      if (currentPortadaEvento?.preview) {
        try {
          URL.revokeObjectURL(currentPortadaEvento.preview)
        } catch (err) {
          console.error('Error al revocar URL de portada de evento:', err)
        }
      }
      if (currentMarcaDeAgua?.preview) {
        try {
          URL.revokeObjectURL(currentMarcaDeAgua.preview)
        } catch (err) {
          console.error('Error al revocar URL de marca de agua:', err)
        }
      }
    }
  }, [fotosPorSubir, portadaEvento, marcaDeAgua])

  // Cargar datos iniciales
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('eventos')
          .select(`
            *,
            fotos: fotos(id, url, precio, nombre, ruta_original),
            descuentos: descuentos(id, cantidad_minima, porcentaje)
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

  // Funciones para drag and drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const handleDragPortadaEvento = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActivePortadaEvento(true)
  }

  const handleDragLeavePortadaEvento = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActivePortadaEvento(false)
  }

  const handleDropPortadaEvento = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActivePortadaEvento(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePortadaEventoChange({ target: { files: e.dataTransfer.files } })
    }
  }

  const handleDragMarcaDeAgua = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeaveMarcaDeAgua = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDropMarcaDeAgua = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleMarcaDeAguaChange({ target: { files: e.dataTransfer.files } })
    }
  }

  // Manejadores de cambios para portada y marca de agua
  const handlePortadaEventoChange = (e) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.match('image.*')) {
        setError('El archivo seleccionado no es una imagen válida')
        return
      }

      const previewUrl = createSafeBlobUrl(file)
      if (!previewUrl) {
        setError('No se pudo cargar la imagen de portada del evento')
        return
      }

      const imageWithPreview = {
        file,
        preview: previewUrl,
        name: file.name,
        size: file.size > 1024000
          ? `${(file.size / 1024000).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type
      }

      setPortadaEvento(imageWithPreview)
      setError('')
    } catch (err) {
      setError('Error al cargar la portada del evento: ' + err.message)
    }
  }

  const handleMarcaDeAguaChange = (e) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      if (!file.type.match('image.*')) {
        setError('El archivo seleccionado no es una imagen válida')
        return
      }

      const previewUrl = createSafeBlobUrl(file)
      if (!previewUrl) {
        setError('No se pudo cargar la marca de agua')
        return
      }

      const imageWithPreview = {
        file,
        preview: previewUrl,
        name: file.name,
        size: file.size > 1024000
          ? `${(file.size / 1024000).toFixed(1)} MB`
          : `${(file.size / 1024).toFixed(1)} KB`,
        type: file.type
      }

      setMarcaDeAgua(imageWithPreview)
      setError('')
    } catch (err) {
      setError('Error al cargar la marca de agua: ' + err.message)
    }
  }

  // Manejador para selección de archivos
  const handleFileSelect = (files) => {
    try {
      if (!files || files.length === 0) return

      const nuevasFotos = []
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        if (!file.type.match('image.*')) {
          setError(`El archivo "${file.name}" no es una imagen válida`)
          continue
        }

        const previewUrl = createSafeBlobUrl(file)
        if (!previewUrl) {
          setError(`No se pudo cargar la imagen "${file.name}"`)
          continue
        }

        nuevasFotos.push({
          file,
          preview: previewUrl,
          name: file.name,
          size: file.size > 1024000
            ? `${(file.size / 1024000).toFixed(1)} MB`
            : `${(file.size / 1024).toFixed(1)} KB`,
          type: file.type
        })
      }

      if (nuevasFotos.length > 0) {
        setFotosPorSubir(prev => [...prev, ...nuevasFotos])
        setError('')
      }
    } catch (err) {
      setError('Error al cargar las imágenes: ' + err.message)
    }
  }

  // Funciones para eliminar elementos
  const removeFotoPorSubir = (index) => {
    setFotosPorSubir(prev => {
      const nuevasFotos = [...prev]
      const foto = nuevasFotos[index]
      if (foto?.preview) {
        try {
          URL.revokeObjectURL(foto.preview)
        } catch (err) {
          console.error('Error al revocar URL al eliminar foto:', err)
        }
      }
      nuevasFotos.splice(index, 1)
      return nuevasFotos
    })
  }

  const removePortadaEvento = () => {
    if (portadaEvento?.preview) {
      try {
        URL.revokeObjectURL(portadaEvento.preview)
      } catch (err) {
        console.error('Error al revocar URL al eliminar portada de evento:', err)
      }
    }
    setPortadaEvento(null)
  }

  const removeMarcaDeAgua = () => {
    if (marcaDeAgua?.preview) {
      try {
        URL.revokeObjectURL(marcaDeAgua.preview)
      } catch (err) {
        console.error('Error al revocar URL al eliminar marca de agua:', err)
      }
    }
    setMarcaDeAgua(null)
  }

  // Subir portada del evento
  const subirPortadaEvento = async (eventoId) => {
    if (!portadaEvento) return null

    try {
      const timestamp = Date.now()
      const nombreArchivo = `portada-${timestamp}-${portadaEvento.file.name.replace(/\s+/g, '-')}`
      const ruta = `eventos/${eventoId}/${nombreArchivo}`

      const { error: uploadError } = await supabase.storage
        .from('fotos_eventos')
        .upload(ruta, portadaEvento.file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('fotos_eventos')
        .getPublicUrl(ruta)

      return publicUrl
    } catch (err) {
      console.error('Error al subir portada del evento:', err)
      return null
    }
  }

  // Agregar marca de agua a las imágenes
  const agregarMarcaDeAgua = async (imageFile) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      const marcaImg = new Image()
      
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0, img.width, img.height)
        
        marcaImg.onload = () => {
          const marcaWidth = img.width * 0.3
          const marcaHeight = (marcaImg.height / marcaImg.width) * marcaWidth
          
          let x, y
          
          switch(posicionMarcaAgua) {
            case 'esquina-superior-izquierda':
              x = 20
              y = 20
              break
            case 'esquina-superior-derecha':
              x = img.width - marcaWidth - 20
              y = 20
              break
            case 'esquina-inferior-izquierda':
              x = 20
              y = img.height - marcaHeight - 20
              break
            case 'esquina-inferior-derecha':
              x = img.width - marcaWidth - 20
              y = img.height - marcaHeight - 20
              break
            case 'centro':
              x = (img.width - marcaWidth) / 2
              y = (img.height - marcaHeight) / 2
              break
            default:
              x = (img.width - marcaWidth) / 2
              y = (img.height - marcaHeight) / 2
          }
          
          ctx.globalAlpha = opacidadMarcaAgua / 100
          ctx.drawImage(marcaImg, x, y, marcaWidth, marcaHeight)
          ctx.globalAlpha = 1.0
          
          let quality = 0.85;
          let outputWidth = img.width;
          let outputHeight = img.height;
          
          if (img.width > 2000 || img.height > 2000) {
            const scaleFactor = 2000 / Math.max(img.width, img.height);
            outputWidth = img.width * scaleFactor;
            outputHeight = img.height * scaleFactor;
            quality = 0.75;
          }
          
          const outputCanvas = document.createElement('canvas');
          outputCanvas.width = outputWidth;
          outputCanvas.height = outputHeight;
          const outputCtx = outputCanvas.getContext('2d');
          outputCtx.drawImage(canvas, 0, 0, outputWidth, outputHeight);
          
          let outputType = 'image/jpeg';
          if (imageFile.type === 'image/png' || imageFile.type === 'image/webp') {
            outputType = imageFile.type;
          }
          
          outputCanvas.toBlob((blob) => {
            const watermarkedFile = new File([blob], imageFile.name, {
              type: outputType,
              lastModified: Date.now()
            });
            resolve(watermarkedFile);
          }, outputType, quality);
        }
        
        marcaImg.src = createSafeBlobUrl(marcaDeAgua.file)
      }
      
      img.src = createSafeBlobUrl(imageFile)
    })
  }

  // Funciones para manejar descuentos
  const agregarDescuento = () => {
    if (nuevoDescuento.cantidadMinima <= 0 || nuevoDescuento.porcentaje <= 0) {
      setError('La cantidad mínima y el porcentaje deben ser mayores a 0')
      return
    }

    if (descuentos.some(d => d.cantidadMinima === nuevoDescuento.cantidadMinima)) {
      setError('Ya existe un descuento para esta cantidad de fotos')
      return
    }

    setDescuentos([...descuentos, { ...nuevoDescuento }])
    setNuevoDescuento({ cantidadMinima: 0, porcentaje: 0 })
    setMostrarFormularioDescuento(false)
    setError('')
  }

  const eliminarDescuento = (index) => {
    setDescuentos(descuentos.filter((_, i) => i !== index))
  }

  const calcularPrecioConDescuento = (cantidadFotos, precioUnitario) => {
    if (descuentos.length === 0) return cantidadFotos * precioUnitario

    // Ordenar descuentos de mayor a menor cantidad mínima
    const descuentosOrdenados = [...descuentos].sort((a, b) => b.cantidadMinima - a.cantidadMinima)
    
    // Encontrar el descuento aplicable
    const descuentoAplicable = descuentosOrdenados.find(d => cantidadFotos >= d.cantidadMinima)
    
    if (!descuentoAplicable) return cantidadFotos * precioUnitario
    
    const descuento = descuentoAplicable.porcentaje / 100
    return cantidadFotos * precioUnitario * (1 - descuento)
  }

  // Crear evento
  const crearEvento = async () => {
    if (!nombre || !fecha) {
      setError('Nombre y fecha son obligatorios')
      return
    }

    if (fotosPorSubir.length === 0) {
      setError('Debes subir al menos una foto')
      return
    }

    if (!marcaDeAgua) {
      setError('Debes subir una marca de agua')
      return
    }

    setLoading(prev => ({ ...prev, formulario: true, procesandoImagenes: false }))
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      const portadaUrl = portadaEvento ? await subirPortadaEvento('temp') : null

      const { data: evento, error: eventoError } = await supabase
        .from('eventos')
        .insert([{
          nombre,
          fecha,
          creado_por: user.id,
          portada_url: portadaUrl
        }])
        .select()
        .single()

      if (eventoError) throw eventoError

      // Guardar descuentos si existen
      if (descuentos.length > 0) {
        const descuentosParaGuardar = descuentos.map(d => ({
          evento_id: evento.id,
          cantidad_minima: d.cantidadMinima,
          porcentaje: d.porcentaje
        }))

        const { error: descuentosError } = await supabase
          .from('descuentos')
          .insert(descuentosParaGuardar)

        if (descuentosError) throw descuentosError
      }

      setEventoActual(evento)
      
      setLoading(prev => ({ ...prev, procesandoImagenes: true, subiendoImagenes: true }))
      await subirTodasLasFotos(evento.id)

      if (portadaEvento && portadaUrl) {
        const nombreArchivo = portadaUrl.split('/').pop()
        const rutaOriginal = `eventos/temp/${nombreArchivo}`
        const rutaNueva = `eventos/${evento.id}/${nombreArchivo}`

        const { error: copyError } = await supabase.storage
          .from('fotos_eventos')
          .copy(rutaOriginal, rutaNueva)

        if (!copyError) {
          await supabase.storage
            .from('fotos_eventos')
            .remove([rutaOriginal])

          const { data: { publicUrl } } = supabase.storage
            .from('fotos_eventos')
            .getPublicUrl(rutaNueva)

          await supabase
            .from('eventos')
            .update({ portada_url: publicUrl })
            .eq('id', evento.id)
        }
      }

      const { data: eventoActualizado, error: fetchError } = await supabase
        .from('eventos')
        .select(`
          *,
          fotos: fotos(id, url, precio, nombre, ruta_original),
          descuentos: descuentos(id, cantidad_minima, porcentaje)
        `)
        .eq('id', evento.id)
        .single()

      if (fetchError) throw fetchError

      setEventos(prev => [eventoActualizado, ...prev])
      setSuccess('Evento creado exitosamente!')
      setTimeout(() => setSuccess(''), 5000)

      // Resetear formulario
      setNombre('')
      setFecha('')
      setPrecioImagen(0)
      setFotosPorSubir([])
      setPortadaEvento(null)
      setEventoActual(null)
      setDescuentos([])
      setActiveTab('listado')

    } catch (err) {
      setError('Error al crear evento: ' + err.message)
      console.error(err)
    } finally {
      setLoading(prev => ({ ...prev, formulario: false, procesandoImagenes: false, subiendoImagenes: false }))
    }
  }

  // Agregar fotos a evento existente
  const agregarFotosAEvento = async (eventoId) => {
    if (fotosPorSubir.length === 0) {
      setError('Debes subir al menos una foto')
      return
    }

    if (!marcaDeAgua) {
      setError('Debes subir una marca de agua')
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
          fotos: fotos(id, url, precio, nombre, ruta_original),
          descuentos: descuentos(id, cantidad_minima, porcentaje)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setEventos(eventosActualizados || [])
      setFotosPorSubir([])
      setSuccess('Fotos agregadas exitosamente!')
      setTimeout(() => setSuccess(''), 5000)

    } catch (err) {
      setError('Error al agregar fotos: ' + err.message)
      console.error(err)
    } finally {
      setLoading(prev => ({ ...prev, agregandoFotos: false, subiendoImagenes: false }))
    }
  }

  // Subir todas las fotos
  const subirTodasLasFotos = async (eventoId) => {
    try {
      let fotosSubidas = 0
      const totalFotos = fotosPorSubir.length
      
      for (const [index, foto] of fotosPorSubir.entries()) {
        const timestamp = Date.now()
        const nombreArchivo = `${timestamp}-${foto.file.name.replace(/\s+/g, '-')}`
        const rutaOriginal = `eventos/${eventoId}/originales/${nombreArchivo}`
        const rutaProcesado = `eventos/${eventoId}/procesadas/${nombreArchivo}`

        // 1. Subir la imagen original
        const { error: uploadOriginalError } = await supabase.storage
          .from('fotos_eventos')
          .upload(rutaOriginal, foto.file)

        if (uploadOriginalError) throw uploadOriginalError

        // 2. Procesar y subir la imagen con marca de agua
        const imagenConMarca = await agregarMarcaDeAgua(foto.file)
        
        const { error: uploadProcesadoError } = await supabase.storage
          .from('fotos_eventos')
          .upload(rutaProcesado, imagenConMarca)

        if (uploadProcesadoError) throw uploadProcesadoError

        // 3. Obtener URLs públicas
        const { data: { publicUrl: urlOriginal } } = supabase.storage
          .from('fotos_eventos')
          .getPublicUrl(rutaOriginal)

        const { data: { publicUrl: urlProcesado } } = supabase.storage
          .from('fotos_eventos')
          .getPublicUrl(rutaProcesado)

        // 4. Guardar en la base de datos
        const { error: dbError } = await supabase
          .from('fotos')
          .insert({
            evento_id: eventoId,
            url: urlProcesado,
            precio: precioImagen,
            nombre: foto.file.name,
            ruta_procesada: rutaProcesado,
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

  // Eliminar evento
  const eliminarEvento = async (eventoId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este evento y todas sus fotos?')) return

    try {
      setLoading(prev => ({ ...prev, eventos: true }))
      
      // 1. Eliminar fotos del storage
      const { data: fotos, error: fotosError } = await supabase
        .from('fotos')
        .select('ruta_procesada, ruta_original')
        .eq('evento_id', eventoId)

      if (fotosError) throw fotosError

      const rutasAEliminar = [
        ...fotos.map(f => f.ruta_procesada),
        ...fotos.map(f => f.ruta_original)
      ].filter(Boolean)

      if (rutasAEliminar.length > 0) {
        const { error: deleteStorageError } = await supabase.storage
          .from('fotos_eventos')
          .remove(rutasAEliminar)

        if (deleteStorageError) throw deleteStorageError
      }

      // 2. Eliminar registros de la base de datos
      const { error: deleteFotosError } = await supabase
        .from('fotos')
        .delete()
        .eq('evento_id', eventoId)

      if (deleteFotosError) throw deleteFotosError

      const { error: deleteDescuentosError } = await supabase
        .from('descuentos')
        .delete()
        .eq('evento_id', eventoId)

      if (deleteDescuentosError) throw deleteDescuentosError

      const { error: deleteEventoError } = await supabase
        .from('eventos')
        .delete()
        .eq('id', eventoId)

      if (deleteEventoError) throw deleteEventoError

      // 3. Actualizar estado local
      setEventos(prev => prev.filter(e => e.id !== eventoId))
      setSuccess('Evento eliminado exitosamente!')
      setTimeout(() => setSuccess(''), 5000)

    } catch (err) {
      setError('Error al eliminar evento: ' + err.message)
      console.error(err)
    } finally {
      setLoading(prev => ({ ...prev, eventos: false }))
    }
  }

  // Funciones auxiliares
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

  const formatFecha = (fechaStr) => {
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="bg-black py-4 px-6 md:px-8 text-white shadow-lg">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center">
              <div className="bg-white p-1 rounded-lg shadow-md">
                <img
                  src="/images/mj_logo.png"
                  alt="Logo MJSP"
                  className="w-14 h-14 object-contain"
                />
              </div>
              <div className="ml-4">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">PANEL DE EVENTOS</h1>
                <p className="text-xs text-gray-300 uppercase tracking-wider">Gestión de eventos fotográficos</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => window.location.reload()}
                disabled={loading.eventos}
                className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                {loading.eventos ? (
                  <FiRefreshCw className="animate-spin" />
                ) : (
                  <FiRefreshCw />
                )}
                <span>{loading.eventos ? 'Actualizando...' : 'Actualizar'}</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
              >
                <FiLogOut />
                <span>Cerrar sesión</span>
              </button>
            </div>
          </div>
        </header>

        <main className="p-6 md:p-8 max-w-7xl mx-auto">
          {/* Notificaciones */}
          {error && (
            <div className="mb-6 p-4 bg-red-100 text-red-800 border-l-4 border-red-600 flex items-start gap-2 rounded-lg">
              <FiAlertCircle className="flex-shrink-0 mt-0.5 text-xl" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-100 text-green-800 border-l-4 border-green-600 flex items-start gap-2 rounded-lg">
              <FiCheck className="flex-shrink-0 mt-0.5 text-xl" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {/* Tabs */}
          <div className="mb-8 border-b border-gray-300">
            <nav className="flex space-x-4">
              <button
                onClick={() => setActiveTab('listado')}
                className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'listado' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                Listado de Eventos
              </button>
              <button
                onClick={() => setActiveTab('crear')}
                className={`py-3 px-4 font-medium text-sm border-b-2 ${activeTab === 'crear' ? 'border-black text-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {eventoActual ? 'Agregar Fotos' : 'Crear Evento'}
              </button>
            </nav>
          </div>

          {/* Contenido según tab activo */}
          {activeTab === 'crear' ? (
            <section className="mb-12 bg-gray-50 p-6 rounded-xl shadow-md border border-gray-300">
              <h2 className="text-xl font-bold tracking-tight mb-6 pb-4 border-b border-gray-300 text-gray-900">
                {eventoActual ? 'AGREGAR FOTOS AL EVENTO' : 'CREAR NUEVO EVENTO'}
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
                        placeholder="Ej: Boda de Ana y Juan"
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

              {!eventoActual && (
                <div className="mb-6">
                  <label className="block mb-2 text-sm font-medium text-gray-900">Portada del Evento</label>
                  {portadaEvento ? (
                    <div className="relative w-full rounded-lg overflow-hidden shadow-sm border border-gray-300 min-h-[200px] flex items-center justify-center bg-gray-200">
                      <ImagePreview
                        src={portadaEvento.preview}
                        alt="Preview portada del evento"
                        className="max-h-full max-w-full object-contain"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-xs text-white truncate font-medium">{portadaEvento.name}</p>
                        <p className="text-xs text-gray-300">{portadaEvento.size} • {portadaEvento.type.split('/')[1].toUpperCase()}</p>
                      </div>
                      <button
                        onClick={removePortadaEvento}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                        disabled={loading.formulario}
                      >
                        <FiX size={16} />
                      </button>
                    </div>
                  ) : (
                    <div 
                      className={`relative border-2 border-dashed rounded-lg transition-all ${dragActivePortadaEvento ? 'border-black bg-gray-100' : 'border-gray-400 hover:border-black hover:bg-gray-100'}`}
                      onDragEnter={handleDragPortadaEvento}
                      onDragLeave={handleDragLeavePortadaEvento}
                      onDragOver={handleDragPortadaEvento}
                      onDrop={handleDropPortadaEvento}
                    >
                      <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <FiImage className="mb-2 text-gray-700 text-2xl" />
                          <p className="text-sm text-gray-900 font-medium">Arrastra o selecciona la portada del evento</p>
                          <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WEBP</p>
                        </div>
                        <input
                          type="file"
                          onChange={handlePortadaEventoChange}
                          className="hidden"
                          accept="image/jpeg, image/png, image/webp"
                          disabled={loading.formulario}
                        />
                      </label>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-gray-500">Esta imagen se mostrará como portada principal del evento (opcional)</p>
                </div>
              )}

              <div className="mb-6">
                <label className="block mb-2 text-sm font-medium text-gray-900">Marca de Agua *</label>
                {marcaDeAgua ? (
                  <div className="relative w-full rounded-lg overflow-hidden shadow-sm border border-gray-300 min-h-[200px] flex items-center justify-center bg-gray-200">
                    <ImagePreview
                      src={marcaDeAgua.preview}
                      alt="Preview marca de agua"
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-xs text-white truncate font-medium">{marcaDeAgua.name}</p>
                      <p className="text-xs text-gray-300">{marcaDeAgua.size} • {marcaDeAgua.type.split('/')[1].toUpperCase()}</p>
                    </div>
                    <button
                      onClick={removeMarcaDeAgua}
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full"
                      disabled={loading.formulario || loading.agregandoFotos}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ) : (
                  <div 
                    className={`relative border-2 border-dashed rounded-lg transition-all ${dragActive ? 'border-black bg-gray-100' : 'border-gray-400 hover:border-black hover:bg-gray-100'}`}
                    onDragEnter={handleDragMarcaDeAgua}
                    onDragLeave={handleDragLeaveMarcaDeAgua}
                    onDragOver={handleDragMarcaDeAgua}
                    onDrop={handleDropMarcaDeAgua}
                  >
                    <label className="flex flex-col items-center justify-center w-full h-32 cursor-pointer">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <FiImage className="mb-2 text-gray-700 text-2xl" />
                        <p className="text-sm text-gray-900 font-medium">Arrastra o selecciona la marca de agua</p>
                        <p className="text-xs text-gray-500 mt-1">JPEG, PNG, WEBP (transparente)</p>
                      </div>
                      <input
                        type="file"
                        onChange={handleMarcaDeAguaChange}
                        className="hidden"
                        accept="image/jpeg, image/png, image/webp"
                        disabled={loading.formulario || loading.agregandoFotos}
                      />
                    </label>
                  </div>
                )}
                <p className="mt-1 text-xs text-gray-500">Esta imagen se usará como marca de agua en todas las fotos subidas</p>
                
                {marcaDeAgua && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Opacidad de la marca de agua</label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={opacidadMarcaAgua}
                          onChange={(e) => setOpacidadMarcaAgua(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-sm font-medium text-gray-900 w-12">{opacidadMarcaAgua}%</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-900">Posición de la marca de agua</label>
                      <select
                        value={posicionMarcaAgua}
                        onChange={(e) => setPosicionMarcaAgua(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                      >
                        <option value="centro">Centro</option>
                        <option value="esquina-superior-izquierda">Esquina superior izquierda</option>
                        <option value="esquina-superior-derecha">Esquina superior derecha</option>
                        <option value="esquina-inferior-izquierda">Esquina inferior izquierda</option>
                        <option value="esquina-inferior-derecha">Esquina inferior derecha</option>
                      </select>
                    </div>
                  </div>
                )}
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
                      placeholder="Ej: 5.99"
                      disabled={loading.formulario || loading.agregandoFotos}
                    />
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-900">Total estimado</label>
                  <div className="w-full p-3 border border-gray-300 bg-gray-100 font-bold rounded-lg text-gray-900">
                    ${(fotosPorSubir.length * precioImagen).toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Sección de descuentos */}
              {!eventoActual && (
                <div className="mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Descuentos por cantidad</h3>
                    <button
                      onClick={() => setMostrarFormularioDescuento(true)}
                      disabled={loading.formulario || loading.agregandoFotos || mostrarFormularioDescuento}
                      className="flex items-center gap-2 text-sm bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <FiPlus />
                      <span>Agregar descuento</span>
                    </button>
                  </div>

                  {mostrarFormularioDescuento && (
                    <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 mb-4">
                      <h4 className="font-medium text-gray-900 mb-3">Nuevo descuento</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <label className="block mb-1 text-sm font-medium text-gray-900">Cantidad mínima de fotos</label>
                          <input
                            type="number"
                            min="1"
                            value={nuevoDescuento.cantidadMinima}
                            onChange={(e) => setNuevoDescuento({...nuevoDescuento, cantidadMinima: parseInt(e.target.value) || 0})}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                            placeholder="Ej: 5"
                          />
                        </div>
                        <div>
                          <label className="block mb-1 text-sm font-medium text-gray-900">Porcentaje de descuento</label>
                          <div className="relative">
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={nuevoDescuento.porcentaje}
                              onChange={(e) => setNuevoDescuento({...nuevoDescuento, porcentaje: parseInt(e.target.value) || 0})}
                              className="w-full p-2 border border-gray-300 rounded-lg bg-white text-gray-900 pr-8"
                              placeholder="Ej: 10"
                            />
                            <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setMostrarFormularioDescuento(false)}
                          className="px-3 py-1.5 text-sm bg-gray-300 hover:bg-gray-400 rounded-lg"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={agregarDescuento}
                          className="px-3 py-1.5 text-sm bg-black hover:bg-gray-800 text-white rounded-lg"
                        >
                          Guardar descuento
                        </button>
                      </div>
                    </div>
                  )}

                  {descuentos.length > 0 ? (
                    <div className="border border-gray-300 rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Cant. mínima</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Descuento</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-300">
                          {descuentos.map((descuento, index) => (
                            <tr key={index}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                {descuento.cantidadMinima} fotos
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                                  <FiPercent className="mr-1" size={12} />
                                  {descuento.porcentaje}%
                                </span>
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                <button
                                  onClick={() => eliminarDescuento(index)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  Eliminar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-gray-100 p-4 rounded-lg border border-gray-300 text-center">
                      <p className="text-gray-600">No hay descuentos configurados</p>
                    </div>
                  )}

                  {descuentos.length > 0 && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-medium text-blue-800 mb-2">Ejemplo de aplicación de descuentos</h4>
                      <ul className="space-y-2 text-sm text-blue-700">
                        {descuentos.sort((a, b) => a.cantidadMinima - b.cantidadMinima).map((descuento, index) => (
                          <li key={index}>
                            <span className="font-medium">{descuento.cantidadMinima}+ fotos:</span> {descuento.porcentaje}% de descuento (${(precioImagen * descuento.cantidadMinima * (1 - descuento.porcentaje/100)).toFixed(2)} en lugar de ${(precioImagen * descuento.cantidadMinima).toFixed(2)})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Fotos a subir ({fotosPorSubir.length})
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading.formulario || loading.agregandoFotos}
                      className="flex items-center gap-2 text-sm bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <FiPlus />
                      <span>Agregar fotos</span>
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => handleFileSelect(e.target.files)}
                      className="hidden"
                      accept="image/jpeg, image/png, image/webp"
                      multiple
                      disabled={loading.formulario || loading.agregandoFotos}
                    />
                  </div>
                </div>

                {fotosPorSubir.length === 0 ? (
                  <div 
                    className={`bg-gray-100 p-6 rounded-lg border-2 border-dashed ${dragActive ? 'border-black bg-gray-200' : 'border-gray-400 hover:border-black hover:bg-gray-200'} text-center`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <FiImage className="mx-auto text-gray-500 text-2xl mb-2" />
                    <p className="text-gray-800 font-medium">Arrastra y suelta tus fotos aquí</p>
                    <p className="text-sm text-gray-500 mt-1">o haz clic en "Agregar fotos" para seleccionarlas</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {fotosPorSubir.map((foto, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden shadow-sm border border-gray-300 bg-gray-200">
                          <ImagePreview
                            src={foto.preview}
                            alt={`Preview foto ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent p-2">
                          <p className="text-xs text-white truncate">{foto.name}</p>
                        </div>
                        <button
                          onClick={() => removeFotoPorSubir(index)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          disabled={loading.formulario || loading.agregandoFotos}
                        >
                          <FiX size={14} />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <p className="text-xs text-white">{foto.size}</p>
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
                  <div className="w-full bg-gray-300 rounded-full h-2.5">
                    <div 
                      className="bg-black h-2.5 rounded-full" 
                      style={{ width: `${progresoSubida}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {eventoActual ? (
                <div className="space-y-4">
                  <button
                    onClick={() => agregarFotosAEvento(eventoActual.id)}
                    disabled={loading.agregandoFotos || fotosPorSubir.length === 0 || !marcaDeAgua}
                    className="w-full flex justify-center items-center gap-2 bg-black hover:bg-gray-800 text-white py-3 px-4 transition-colors disabled:bg-gray-500 font-bold rounded-lg text-lg shadow-md hover:shadow-lg"
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
                      setActiveTab('listado')
                    }}
                    className="w-full flex justify-center items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 px-4 transition-colors font-medium rounded-lg shadow-sm hover:shadow-md"
                  >
                    <FiX />
                    <span>CANCELAR</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={crearEvento}
                  disabled={loading.formulario || !nombre || !fecha || fotosPorSubir.length === 0 || !marcaDeAgua}
                  className="w-full flex justify-center items-center gap-2 bg-black hover:bg-gray-800 text-white py-3 px-4 transition-colors disabled:bg-gray-500 font-bold rounded-lg text-lg shadow-md hover:shadow-lg"
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
          ) : (
            <section className="bg-gray-50 p-6 rounded-xl shadow-md border border-gray-300">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-300">
                <h2 className="text-xl font-bold tracking-tight text-gray-900">LISTADO DE EVENTOS</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEventoActual(null)
                      setActiveTab('crear')
                    }}
                    className="flex items-center gap-2 text-sm bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <FiPlus />
                    <span>Nuevo Evento</span>
                  </button>
                </div>
              </div>

              {loading.eventos ? (
                <div className="flex justify-center py-12">
                  <FiRefreshCw className="animate-spin text-2xl text-gray-700" />
                </div>
              ) : eventos.length === 0 ? (
                <div className="text-center py-12">
                  <FiFolder className="mx-auto text-gray-500 text-4xl mb-4" />
                  <p className="text-gray-800 font-medium">No hay eventos registrados</p>
                  <p className="text-sm text-gray-500 mt-2">Crea tu primer evento para comenzar</p>
                  <button
                    onClick={() => setActiveTab('crear')}
                    className="mt-4 inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <FiPlus />
                    <span>Crear Evento</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {eventos.map((evento) => (
                    <article key={evento.id} className="bg-white p-5 rounded-lg shadow-sm border border-gray-300">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {evento.portada_url && (
                          <div className="flex-shrink-0 w-full md:w-40 h-40 rounded-lg overflow-hidden border border-gray-300">
                            <ImagePreview
                              src={evento.portada_url}
                              alt={`Portada de ${evento.nombre}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{evento.nombre}</h3>
                              <p className="text-sm text-gray-700 mt-1">
                                {formatFecha(evento.fecha)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => router.push(`/eventos/${evento.id}`)}
                                className="flex items-center gap-1 text-sm bg-black hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg"
                              >
                                <FiEye />
                                <span>Ver</span>
                              </button>
                              <button
                                onClick={() => {
                                  setEventoActual(evento)
                                  setPrecioImagen(evento.fotos?.[0]?.precio || 0)
                                  setActiveTab('crear')
                                }}
                                className="flex items-center gap-1 text-sm bg-gray-300 hover:bg-gray-400 text-gray-800 px-3 py-1.5 rounded-lg"
                              >
                                <FiUpload />
                                <span>Agregar fotos</span>
                              </button>
                              <button
                                onClick={() => eliminarEvento(evento.id)}
                                className="flex items-center gap-1 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg"
                              >
                                <FiTrash2 />
                                <span>Eliminar</span>
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                              <p className="text-xs text-gray-700 uppercase font-medium">Fotos</p>
                              <p className="text-lg font-bold text-gray-900">
                                {evento.fotos?.length || 0}
                              </p>
                            </div>
                            <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                              <p className="text-xs text-gray-700 uppercase font-medium">Valor total</p>
                              <p className="text-lg font-bold text-gray-900">
                                ${calcularPrecioTotal(evento.fotos).toFixed(2)}
                              </p>
                            </div>
                            <div className="bg-gray-100 p-3 rounded-lg border border-gray-300">
                              <p className="text-xs text-gray-700 uppercase font-medium">Descuentos</p>
                              <p className="text-lg font-bold text-gray-900">
                                {evento.descuentos?.length || 0}
                              </p>
                            </div>
                          </div>

                          {evento.fotos?.length > 0 && (
                            <div className="mt-4">
                              <button
                                onClick={() => toggleExpandirFotos(evento.id)}
                                className="flex items-center gap-1 text-sm text-black hover:text-gray-700 mb-2"
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
                                  <div className="flex gap-2 flex-wrap">
                                    {evento.fotos.map((foto, index) => (
                                      <div key={foto.id} className="relative flex-shrink-0 group w-20 h-20">
                                        <ImagePreview
                                          src={foto.url}
                                          alt={`Imagen ${index + 1} del evento`}
                                          className="h-full w-full object-cover rounded-lg shadow-sm border border-gray-300"
                                        />
                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1 text-center">
                                          <p className="text-[10px] font-bold text-white">${foto.precio?.toFixed(2) || '0.00'}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}