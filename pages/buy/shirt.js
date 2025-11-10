import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

export default function ShirtCustomizer() {
  const router = useRouter()
  const mountRef = useRef(null)
  const canvasRef = useRef(null)
  const meshRef = useRef(null)
  const cameraRef = useRef(null)
  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const textureCanvasRef = useRef(null)
  const controlsRef = useRef(null)
  
  const [overlays, setOverlays] = useState([])
  const [selectedOverlay, setSelectedOverlay] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [canvasMouseDown, setCanvasMouseDown] = useState(false)
  const [itemSelectedMode, setItemSelectedMode] = useState(false)
  const [uvMapDragging, setUvMapDragging] = useState(false)
  const [uvMapMouseDown, setUvMapMouseDown] = useState(false)
  const [shirtColor, setShirtColor] = useState('#ffffff')
  const [uvMapPosition, setUvMapPosition] = useState({ x: 20, y: 260 }) // Below the card area
  const [isDraggingUvMapWindow, setIsDraggingUvMapWindow] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const uvMapRef = useRef(null)
  const [showAddedToast, setShowAddedToast] = useState(false)
  const toastTimeoutRef = useRef(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [designName, setDesignName] = useState('')

  // Initialize Three.js scene
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const width = mount.clientWidth || 800
    const height = mount.clientHeight || 600
    
  const scene = new THREE.Scene()
  // allow the canvas to be transparent so CSS background on the mount container shows through
  scene.background = null
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(0, 0.5, 2.5)
    cameraRef.current = camera

  // make renderer transparent (alpha) so the parent div's lined background is visible
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer
    canvasRef.current = renderer.domElement
  // clear color alpha 0 to keep canvas transparent
  renderer.setClearColor(0x000000, 0)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = false
    controls.enablePan = false
    controls.minPolarAngle = Math.PI / 3
    controls.maxPolarAngle = 2 * Math.PI / 3
    controls.target.set(0, 0, 0)
    controlsRef.current = controls

    // Allow slight zoom with mouse wheel when hovering the canvas
    const initialCameraZ = camera.position.z
    const minCameraZ = initialCameraZ * 0.6
    const maxCameraZ = initialCameraZ * 1.6
    const onWheel = (e) => {
      e.preventDefault()
      // deltaY positive = zoom out, negative = zoom in
      const deltaZ = e.deltaY * 0.002
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + deltaZ, minCameraZ, maxCameraZ)
      controls.update()
    }
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false })

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight2.position.set(-5, -5, -5)
    scene.add(directionalLight2)

    // Load t-shirt model
    const loader = new GLTFLoader()
    loader.load('/models/tshirt.gltf', (gltf) => {
      const tshirtModel = gltf.scene
      meshRef.current = tshirtModel
      
      const box = new THREE.Box3().setFromObject(tshirtModel)
      const size = box.getSize(new THREE.Vector3())
      const maxDim = Math.max(size.x, size.y, size.z)
      const scale = 2 / maxDim
      tshirtModel.scale.multiplyScalar(scale)
      
      box.setFromObject(tshirtModel)
      const center = box.getCenter(new THREE.Vector3())
      tshirtModel.position.set(-center.x, -center.y, -center.z)
      
      scene.add(tshirtModel)
      
      // Create initial texture canvas
      updateTexture()
    })

    let frameId
    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      if (!mount) return
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w > 0 && h > 0) {
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
    }
    
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
      // remove wheel listener
      try {
        renderer.domElement.removeEventListener('wheel', onWheel)
      } catch (e) {}
      if (mount && renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  // Update texture when overlays change
  useEffect(() => {
    updateTexture()
  }, [overlays, shirtColor])

  const updateTexture = (overlaysToRender = overlays) => {
    if (!meshRef.current) return

    // Create or get texture canvas
    let canvas = textureCanvasRef.current
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.width = 2048
      canvas.height = 2048
      textureCanvasRef.current = canvas
    }

    const ctx = canvas.getContext('2d')
    
    // Convert grey shirt colors to white
    let fillColor = shirtColor
    // Parse hex color to RGB
    const hex = shirtColor.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)
    
    // Check if color is grey (R, G, B values are similar)
    const avg = (r + g + b) / 3
    const variance = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg)
    
    // If it's a grey color, convert to white
    if (variance < 30 && avg > 100 && avg < 220) {
      fillColor = '#ffffff'
    }
    
    // Clear canvas with shirt color background
    ctx.fillStyle = fillColor
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw all overlays
    overlaysToRender.forEach((overlay) => {
      const x = overlay.position.x * canvas.width
      const y = (1 - overlay.position.y) * canvas.height // Flip Y for texture coordinates

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((overlay.rotation * Math.PI) / 180)
      ctx.scale(overlay.scale, overlay.scale)

      if (overlay.type === 'text') {
        ctx.font = `${overlay.fontSize}px ${overlay.fontFamily}`
        ctx.fillStyle = overlay.color
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(overlay.content, 0, 0)
      } else if (overlay.type === 'image' && overlay.imageElement) {
        const w = overlay.width || 100
        const h = overlay.height || 100
        
        // Draw image to temporary canvas to process alpha transparency
        const tempCanvas = document.createElement('canvas')
        tempCanvas.width = w
        tempCanvas.height = h
        const tempCtx = tempCanvas.getContext('2d')
        
        // Ensure image is drawn with proper crossOrigin handling
        tempCtx.drawImage(overlay.imageElement, 0, 0, w, h)
        
        // Get image data and make navy blue transparent (robust)
        let imageData
        try {
          imageData = tempCtx.getImageData(0, 0, w, h)
        } catch (err) {
          // Canvas is tainted (CORS) or other error - skip processing
          console.warn('getImageData failed, skipping navy transparency:', err)
          ctx.drawImage(overlay.imageElement, -w / 2, -h / 2, w, h)
          ctx.restore()
          return
        }

        const data = imageData.data
        let transparentPixels = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]

          // Exact navy match
          if (r === 0 && g === 0 && b === 128) {
            data[i + 3] = 0
            transparentPixels++
            continue
          }

          // Original broader navy check (R,G small, B moderate-high)
          if (r < 50 && g < 50 && b > 60 && b < 150) {
            data[i + 3] = 0
            transparentPixels++
            continue
          }

          // Blue dominance check and anti-alias fade for edge pixels
          const blueDominance = Math.max(b - r, b - g)
          if (b > 60 && blueDominance > 20) {
            data[i + 3] = 0
            transparentPixels++
          } else if (b > 60 && blueDominance > 8) {
            const factor = (blueDominance - 8) / (20 - 8) // 0..1
            data[i + 3] = Math.round(a * (1 - Math.min(1, factor)))
          }
        }

        if (transparentPixels > 0) {
          console.log(`Made ${transparentPixels} pixels transparent out of ${data.length / 4} total pixels`)
        }

        tempCtx.putImageData(imageData, 0, 0)
        ctx.drawImage(tempCanvas, -w / 2, -h / 2, w, h)
      }

      ctx.restore()
    })

    // Apply texture to mesh
    const texture = new THREE.CanvasTexture(canvas)
    texture.flipY = false
    texture.needsUpdate = true

    meshRef.current.traverse((child) => {
      if (child.isMesh && child.material) {
        if (child.material.map) {
          child.material.map.dispose()
        }
        child.material.map = texture
        // Don't apply color tint - let the texture handle the color
        child.material.color = new THREE.Color(0xffffff)
        child.material.needsUpdate = true
      }
    })
  }

  const handleCanvasClick = (e) => {
    if (!cameraRef.current || !meshRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera({ x, y }, cameraRef.current)

    const intersects = raycaster.intersectObject(meshRef.current, true)
    
    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv
      
      // Check if clicked on existing overlay using raycasting
      let clickedOnOverlay = false
      for (let i = overlays.length - 1; i >= 0; i--) {
        const overlay = overlays[i]
        const dx = Math.abs(uv.x - overlay.position.x)
        const dy = Math.abs(uv.y - overlay.position.y)
        
        // More precise hit detection based on overlay type and size
        const hitThreshold = overlay.scale * 0.08
        
        if (dx < hitThreshold && dy < hitThreshold) {
          setSelectedOverlay(i)
          setCanvasMouseDown(true)
          setItemSelectedMode(true)
          clickedOnOverlay = true
          
          // Disable orbit controls when item is selected
          if (controlsRef.current) {
            controlsRef.current.enabled = false
          }
          return
        }
      }
      
      // Clicked on shirt but not on an overlay - deselect and enable rotation
      if (!clickedOnOverlay) {
        setSelectedOverlay(null)
        setItemSelectedMode(false)
        setCanvasMouseDown(false)
        if (controlsRef.current) {
          controlsRef.current.enabled = true
        }
      }
    }
  }

  const handleCanvasMouseMove = (e) => {
    if (!canvasMouseDown || selectedOverlay === null) return
    if (!cameraRef.current || !meshRef.current) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Start dragging on first move
    if (!isDragging) {
      setIsDragging(true)
      // Disable orbit controls when dragging (should already be disabled)
      if (controlsRef.current) {
        controlsRef.current.enabled = false
      }
    }

    const rect = canvas.getBoundingClientRect()
    
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera({ x, y }, cameraRef.current)

    const intersects = raycaster.intersectObject(meshRef.current, true)
    
    if (intersects.length > 0 && intersects[0].uv) {
      const uv = intersects[0].uv
      const newOverlays = [...overlays]
      newOverlays[selectedOverlay] = {
        ...newOverlays[selectedOverlay],
        position: { x: uv.x, y: uv.y }
      }
      setOverlays(newOverlays)
    }
  }

  const handleCanvasMouseUp = () => {
    setCanvasMouseDown(false)
    setIsDragging(false)
    // Don't re-enable orbit controls if we're in item selected mode
    if (controlsRef.current && !itemSelectedMode) {
      controlsRef.current.enabled = true
    }
  }

  const addTextOverlay = () => {
    const newOverlay = {
      type: 'text',
      content: 'Your Text',
      position: { x: 750 / 2048, y: 1 - (500 / 2048) }, // Top left at 750,500 (flipped Y)
      fontSize: 48,
      color: '#000000',
      fontFamily: 'Arial, sans-serif',
      rotation: 0,
      scale: 1
    }
    setOverlays([...overlays, newOverlay])
    setSelectedOverlay(overlays.length)
  }

  const addImageOverlay = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const img = new Image()
          img.onload = () => {
            const newOverlay = {
              type: 'image',
              content: event.target.result,
              imageElement: img,
              position: { x: 750 / 2048, y: 1 - (500 / 2048) }, // Top left at 750,500 (flipped Y)
              width: 200,
              height: 200,
              rotation: 0,
              scale: 1
            }
            setOverlays([...overlays, newOverlay])
            setSelectedOverlay(overlays.length)
          }
          img.src = event.target.result
        }
        reader.readAsDataURL(file)
      }
    }
    input.click()
  }

  const updateOverlay = (index, property, value) => {
    const newOverlays = [...overlays]
    newOverlays[index] = {
      ...newOverlays[index],
      [property]: value
    }
    setOverlays(newOverlays)
  }

  const deleteOverlay = (index) => {
    const newOverlays = overlays.filter((_, i) => i !== index)
    setOverlays(newOverlays)
    if (selectedOverlay === index) setSelectedOverlay(null)
  }

  const handleUvMapWindowMouseDown = (e) => {
    setIsDraggingUvMapWindow(true)
    setDragStartPos({
      x: e.clientX - uvMapPosition.x,
      y: e.clientY - uvMapPosition.y
    })
  }

  const handleUvMapWindowMouseMove = (e) => {
    if (!isDraggingUvMapWindow) return
    
    setUvMapPosition({
      x: e.clientX - dragStartPos.x,
      y: e.clientY - dragStartPos.y
    })
  }

  const handleUvMapWindowMouseUp = () => {
    setIsDraggingUvMapWindow(false)
  }

  // Add global mouse move and mouse up listeners for dragging the UV map window
  useEffect(() => {
    if (isDraggingUvMapWindow) {
      window.addEventListener('mousemove', handleUvMapWindowMouseMove)
      window.addEventListener('mouseup', handleUvMapWindowMouseUp)
      
      return () => {
        window.removeEventListener('mousemove', handleUvMapWindowMouseMove)
        window.removeEventListener('mouseup', handleUvMapWindowMouseUp)
      }
    }
  }, [isDraggingUvMapWindow, dragStartPos, uvMapPosition])

  // Listen for load design event
  useEffect(() => {
    const handleLoadDesign = (e) => {
      const design = e.detail
      if (design.type !== 'shirt') return
      
      // Load the design data
      setShirtColor(design.colorHex || '#ffffff')
      setOverlays(design.overlays || [])
      setSelectedOverlay(null)
    }

    window.addEventListener('loadDesign', handleLoadDesign)
    return () => window.removeEventListener('loadDesign', handleLoadDesign)
  }, [])

  // Auto-load generated frame from video processing
  useEffect(() => {
    const framesJson = localStorage.getItem('generatedFrames')
    if (framesJson) {
      try {
        const frames = JSON.parse(framesJson)
        if (frames && frames.length > 0) {
          const frameUrl = `/generated/${frames[0]}`
          console.log('Auto-loading generated frame:', frameUrl)
          
          // Create an image element to get dimensions
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            // Convert pixel coordinates (600, 500) to normalized UV coordinates (0-1)
            // Texture canvas is 2048x2048
            const uvX = 475 / 2048
            const uvY = 750 / 2048
            
            const newOverlay = {
              type: 'image',
              content: frameUrl,
              imageElement: img,
              position: { x: uvX, y: uvY },
              width: img.width,
              height: img.height,
              rotation: 0,
              scale: 0.3 // 30% scale
            }
            
            console.log('Added generated frame as overlay:', newOverlay)
            
            // Immediately update texture with the new overlay before setting state
            setTimeout(() => {
              if (meshRef.current) {
                updateTexture([newOverlay])
              }
            }, 200)
            
            setOverlays([newOverlay])
            setSelectedOverlay(0) // Auto-select the newly added frame
          }
          img.onerror = () => {
            console.error('Failed to load generated frame:', frameUrl)
          }
          img.src = frameUrl
        }
      } catch (error) {
        console.error('Error loading generated frames:', error)
      }
    }
  }, [])

  const handleUvMapMouseDown = (e) => {
    if (selectedOverlay === null) return
    
    setUvMapMouseDown(true)
  }

  const handleUvMapMouseMove = (e) => {
    if (!uvMapMouseDown || selectedOverlay === null) return
    
    // Start dragging on first move
    setUvMapDragging(true)
    
    const rect = uvMapRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, 1 - ((e.clientY - rect.top) / rect.height))) // Flip Y coordinate
    
    const newOverlays = [...overlays]
    newOverlays[selectedOverlay] = {
      ...newOverlays[selectedOverlay],
      position: { x, y }
    }
    setOverlays(newOverlays)
  }

  const handleUvMapMouseUp = () => {
    setUvMapMouseDown(false)
    setUvMapDragging(false)
  }

  const handleAddToCart = () => {
    // Generate a snapshot of the current design
    const canvas = textureCanvasRef.current
    if (!canvas) return

    const designSnapshot = canvas.toDataURL('image/png')
    
    // Get color name
    const colorNames = {
      '#ffffff': 'White',
      '#ff6b8a': 'Pink',
      '#4db8ff': 'Blue',
      '#ffeb3b': 'Yellow',
      '#b388ff': 'Purple',
      '#ffb74d': 'Orange',
      '#aed13a': 'Green',
      '#000000': 'Black',
    }

    const cartItem = {
      type: 'shirt',
      price: 30.00,
      color: colorNames[shirtColor] || 'Custom',
      colorHex: shirtColor,
      design: designSnapshot,
      overlays: [...overlays], // Save overlay configuration
      timestamp: Date.now()
    }

    // Check if user is logged in
    const currentUser = sessionStorage.getItem('currentUser')
    
    if (currentUser) {
      // Store in user-specific localStorage
      const existingCart = JSON.parse(localStorage.getItem(`cart_${currentUser}`) || '[]')
      existingCart.push(cartItem)
      localStorage.setItem(`cart_${currentUser}`, JSON.stringify(existingCart))
    } else {
      // Store in sessionStorage for guest
      const existingCart = JSON.parse(sessionStorage.getItem('cart') || '[]')
      existingCart.push(cartItem)
      sessionStorage.setItem('cart', JSON.stringify(existingCart))
    }

    // Dispatch custom event to update cart count
    window.dispatchEvent(new CustomEvent('cartUpdated'))

    // Show temporary Bootstrap-style toast (keep user on the same page)
    setShowAddedToast(true)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    toastTimeoutRef.current = setTimeout(() => setShowAddedToast(false), 3000)
  }

  const handleSaveDesign = () => {
    const currentUser = sessionStorage.getItem('currentUser')
    if (!currentUser) {
      alert('Please log in to save designs')
      return
    }
    if (overlays.length === 0) {
      alert('Add some elements before saving')
      return
    }
    setShowSaveModal(true)
  }

  const confirmSaveDesign = () => {
    if (!designName.trim()) {
      alert('Please enter a design name')
      return
    }

    const currentUser = sessionStorage.getItem('currentUser')
    if (!currentUser) return

    const canvas = textureCanvasRef.current
    const preview = canvas ? canvas.toDataURL('image/png') : null

    const colorNames = {
      '#ffffff': 'White',
      '#ff6b8a': 'Pink',
      '#4db8ff': 'Blue',
      '#ffeb3b': 'Yellow',
      '#b388ff': 'Purple',
      '#ffb74d': 'Orange',
      '#aed13a': 'Green',
      '#000000': 'Black',
    }

    const design = {
      name: designName,
      type: 'shirt',
      color: colorNames[shirtColor] || 'Custom',
      colorHex: shirtColor,
      overlays: [...overlays],
      preview: preview,
      timestamp: Date.now()
    }

    const existingDesigns = JSON.parse(localStorage.getItem(`designs_${currentUser}`) || '[]')
    existingDesigns.push(design)
    localStorage.setItem(`designs_${currentUser}`, JSON.stringify(existingDesigns))

    // Dispatch event to update designs list in app
    window.dispatchEvent(new CustomEvent('designsUpdated'))

    setShowSaveModal(false)
    setDesignName('')
    alert('Design saved!')
  }

  const openDesignsModal = () => {
    const currentUser = sessionStorage.getItem('currentUser')
    if (!currentUser) {
      alert('Please login to view your designs')
      return
    }
    window.dispatchEvent(new CustomEvent('openDesigns'))
  }

  return (
    <main style={{ 
      display: 'flex', 
      minHeight: 'calc(100vh - 70px)',
      background: '#fff',
      position: 'relative',
      flexDirection: 'row',
    }}>
      {/* 3D Canvas */}
      <div style={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minWidth: 0,
      }}>
        <div style={{
          padding: '2rem',
          borderBottom: '3px solid #000',
        }}>
          <h1 style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            fontWeight: '900',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            filter: 'blur(0.5px)',
            fontFamily: 'Trebuchet MS, Arial Black, Impact, sans-serif',
          }}>
            <span style={{
              color: '#ff6b8a',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke',
            }}>Custom </span>
            <span style={{
              color: '#4db8ff',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke',
            }}>T-Shirt</span>
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#333',
            marginBottom: '1rem',
          }}>
            Customize with your own text and images
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '0.75rem'
          }}>
            <span style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#aed13a',
            }}>
              $30.00
            </span>
            <span style={{
              fontSize: '1rem',
              color: '#999',
              textDecoration: 'line-through'
            }}>
              $45.00
            </span>
          </div>
        </div>

          {/* Added to cart toast (temporary) */}
          {showAddedToast && (
            <div style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '380px',
              maxWidth: '90vw',
              border: '4px solid #000',
              borderRadius: '12px',
              background: '#fff',
              boxShadow: '8px 8px 0px rgba(0,0,0,0.3)',
              zIndex: 2000,
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', gap: '12px', padding: '12px', alignItems: 'center' }}>
                <div style={{ width: 64, height: 64, border: '2px solid #000', borderRadius: '8px', background: textureCanvasRef.current ? `url(${textureCanvasRef.current.toDataURL()})` : '#fff', backgroundSize: 'cover', backgroundPosition: 'center' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>Added to cart</div>
                  <div style={{ color: '#666', fontSize: '0.9rem' }}>Custom T-Shirt · {shirtColor}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('openCart'))} style={{ padding: '8px 10px', background: '#4db8ff', border: '2px solid #000', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}>View Cart</button>
                  <button onClick={() => setShowAddedToast(false)} style={{ padding: '6px 10px', background: '#fff', border: '2px solid #000', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>Close</button>
                </div>
              </div>
            </div>
          )}
        
        <div 
          ref={mountRef} 
          style={{ 
            flex: 1, 
            cursor: isDragging ? 'grabbing' : (itemSelectedMode ? 'move' : 'grab'),
            width: '100%',
            height: '100%',
            minHeight: 0,
            // lined/grid background so canvas appears on top of these lines
            background: `\n              linear-gradient(to right, #ddd 1px, transparent 1px),\n              linear-gradient(to bottom, #ddd 1px, transparent 1px)\n            `,
            backgroundSize: '30px 30px',
            backgroundColor: '#f5f5f5',
            // ensure children canvas doesn't cover pointer events for controls
            position: 'relative',
          }}
          onMouseDown={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />

        {/* UV Map Preview Overlay - Draggable */}
        {overlays.length > 0 && selectedOverlay !== null && (
          <div style={{
            position: 'absolute',
            top: `${uvMapPosition.y}px`,
            left: `${uvMapPosition.x}px`,
            width: '250px',
            border: '3px solid #000',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#fff',
            boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.3)',
            zIndex: 50,
          }}>
            <div 
              onMouseDown={handleUvMapWindowMouseDown}
              style={{
                padding: '0.5rem',
                background: '#000',
                color: '#fff',
                fontWeight: '700',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                textAlign: 'center',
                cursor: isDraggingUvMapWindow ? 'grabbing' : 'grab',
                userSelect: 'none',
              }}
            >
              Placement Map
            </div>
            <div 
              ref={uvMapRef}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1',
                cursor: 'crosshair',
                background: `url(/uv-maps/shirt-uv.png)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              onMouseDown={handleUvMapMouseDown}
              onMouseMove={handleUvMapMouseMove}
              onMouseUp={handleUvMapMouseUp}
              onMouseLeave={handleUvMapMouseUp}
            >
              {overlays.map((overlay, index) => {
                const isSelected = selectedOverlay === index
                const x = overlay.position.x * 100
                const y = (1 - overlay.position.y) * 100 // Flip Y for display
                
                // Get the UV map container dimensions
                const uvMapWidth = uvMapRef.current?.clientWidth || 250
                const textureSize = 2048
                const scaleFactor = uvMapWidth / textureSize
                
                return (
                  <div
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedOverlay(index)
                    }}
                    style={{
                      position: 'absolute',
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})`,
                      cursor: 'pointer',
                      pointerEvents: 'all',
                      zIndex: isSelected ? 10 : 1,
                      userSelect: 'none',
                    }}
                  >
                    {overlay.type === 'text' ? (
                      <div style={{
                        fontSize: `${overlay.fontSize * scaleFactor}px`,
                        fontFamily: overlay.fontFamily,
                        color: overlay.color,
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        textAlign: 'center',
                        textShadow: isSelected ? '0 0 8px rgba(255, 107, 138, 0.8)' : 'none',
                        border: isSelected ? '1px solid #ff6b8a' : '1px solid transparent',
                        borderRadius: '2px',
                        background: isSelected ? 'rgba(255, 107, 138, 0.1)' : 'rgba(77, 184, 255, 0.05)',
                      }}>
                        {overlay.content}
                      </div>
                    ) : (
                      <div style={{
                        width: `${overlay.width * scaleFactor}px`,
                        height: `${overlay.height * scaleFactor}px`,
                        background: `url(${overlay.content})`,
                        backgroundSize: 'contain',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        border: isSelected ? '1px solid #ff6b8a' : '1px solid #4db8ff',
                        borderRadius: '2px',
                        boxShadow: isSelected ? '0 0 8px rgba(255, 107, 138, 0.8)' : '0 0 4px rgba(77, 184, 255, 0.5)',
                      }} />
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{
              padding: '0.5rem',
              fontSize: '0.65rem',
              color: '#666',
              textAlign: 'center',
              fontStyle: 'italic',
              fontWeight: '600',
            }}>
              Click and drag to position on shirt
            </div>
          </div>
        )}
        
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#666',
          fontSize: '0.9rem',
          fontWeight: '600',
          pointerEvents: 'none',
          textAlign: 'center',
        }}>
          {itemSelectedMode ? 'Item selected - Click away to rotate shirt' : '← Click and drag to rotate →'}
        </div>
      </div>

      {/* Customization Panel */}
      <div style={{
        width: '350px',
        minWidth: '300px',
        maxWidth: '400px',
        borderLeft: '3px solid #000',
        padding: '2rem',
        overflowY: 'auto',
        background: '#f5f5f5',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            textTransform: 'uppercase',
            margin: 0,
          }}>Customize</h2>
          <button 
            onClick={openDesignsModal}
            style={{
              fontSize: '0.85rem',
              fontWeight: '800',
              fontFamily: "'mono45-headline', monospace, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
              color: '#000',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              border: '3px solid #000',
              borderRadius: '50px',
              background: '#ffb74d',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff9b4d'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffb74d'
              e.currentTarget.style.transform = 'scale(1)'
            }}>
            PAST DESIGNS
          </button>
        </div>

        {/* Shirt Color Picker */}
        <div style={{
          marginBottom: '1.5rem',
          border: '3px solid #000',
          borderRadius: '12px',
          padding: '1rem',
          background: '#fff',
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '700',
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
          }}>Shirt Color</h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.5rem',
          }}>
            {[
              { name: 'White', color: '#ffffff' },
              { name: 'Pink', color: '#ff6b8a' },
              { name: 'Blue', color: '#4db8ff' },
              { name: 'Yellow', color: '#ffeb3b' },
              { name: 'Purple', color: '#b388ff' },
              { name: 'Orange', color: '#ffb74d' },
              { name: 'Green', color: '#aed13a' },
              { name: 'Black', color: '#000000' },
            ].map((colorOption) => (
              <button
                key={colorOption.color}
                onClick={() => setShirtColor(colorOption.color)}
                style={{
                  width: '100%',
                  aspectRatio: '1',
                  background: colorOption.color,
                  border: `3px solid ${shirtColor === colorOption.color ? '#000' : '#ddd'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: shirtColor === colorOption.color ? '0 0 0 2px #4db8ff' : 'none',
                }}
                title={colorOption.name}
              />
            ))}
          </div>
        </div>

        {/* Add Buttons */}
        <button
          onClick={addTextOverlay}
          style={{
            width: '100%',
            padding: '1rem',
            marginBottom: '0.75rem',
            background: '#4db8ff',
            border: '3px solid #000',
            borderRadius: '12px',
            color: '#000',
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '1rem',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-2px, -2px)'
            e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.2)'
          }}
        >
          + Add Text
        </button>

        <button
          onClick={addImageOverlay}
          style={{
            width: '100%',
            padding: '1rem',
            marginBottom: '1.5rem',
            background: '#ffeb3b',
            border: '3px solid #000',
            borderRadius: '12px',
            color: '#000',
            cursor: 'pointer',
            fontWeight: '800',
            fontSize: '1rem',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.2)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translate(-2px, -2px)'
            e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translate(0, 0)'
            e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.2)'
          }}
        >
          + Add Image
        </button>

        {/* Overlays List */}
        {overlays.length > 0 && (
          <>
            <h3 style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              marginBottom: '1rem',
              textTransform: 'uppercase',
            }}>Elements ({overlays.length})</h3>
            
            {overlays.map((overlay, index) => (
              <div
                key={index}
                style={{
                  padding: '1rem',
                  marginBottom: '1rem',
                  background: selectedOverlay === index ? '#fff' : '#fff',
                  border: `3px solid ${selectedOverlay === index ? '#000' : '#ddd'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  boxShadow: selectedOverlay === index ? '4px 4px 0px rgba(0, 0, 0, 0.2)' : 'none',
                }}
                onClick={() => setSelectedOverlay(index)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}>
                  <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>
                    {overlay.type === 'text' ? '📝 Text' : '🖼️ Image'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteOverlay(index)
                    }}
                    style={{
                      background: '#ff6b8a',
                      border: '2px solid #000',
                      borderRadius: '6px',
                      padding: '0.4rem 0.8rem',
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    Delete
                  </button>
                </div>

                {overlay.type === 'text' && (
                  <>
                    <input
                      type="text"
                      value={overlay.content}
                      onChange={(e) => updateOverlay(index, 'content', e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid #000',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        marginBottom: '0.75rem',
                        fontWeight: '600',
                      }}
                    />
                    
                    <div style={{ marginBottom: '0.75rem' }}>
                      <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
                        Color
                      </label>
                      <input
                        type="color"
                        value={overlay.color}
                        onChange={(e) => updateOverlay(index, 'color', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          width: '100%',
                          height: '40px',
                          border: '2px solid #000',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      />
                    </div>
                  </>
                )}

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
                    Size: {Math.round(overlay.scale * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.1"
                    value={overlay.scale}
                    onChange={(e) => updateOverlay(index, 'scale', parseFloat(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '700', display: 'block', marginBottom: '0.5rem' }}>
                    Rotation: {Math.round(overlay.rotation)}°
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={overlay.rotation}
                    onChange={(e) => updateOverlay(index, 'rotation', parseInt(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            ))}
          </>
        )}

        {overlays.length === 0 && (
          <p style={{
            textAlign: 'center',
            color: '#999',
            fontSize: '0.9rem',
            padding: '2rem 1rem',
            fontStyle: 'italic',
          }}>
            Click "Add Text" or "Add Image" to start customizing
          </p>
        )}

        {/* Save Design Button */}
        <button
          onClick={handleSaveDesign}
          disabled={overlays.length === 0}
          style={{
            width: '100%',
            padding: '1rem',
            marginTop: '2rem',
            background: overlays.length === 0 ? '#ddd' : '#ffeb3b',
            border: '3px solid #000',
            borderRadius: '12px',
            color: '#000',
            cursor: overlays.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '800',
            fontSize: '1rem',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.2)',
            opacity: overlays.length === 0 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (overlays.length > 0) {
              e.currentTarget.style.transform = 'translate(-2px, -2px)'
              e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
            }
          }}
          onMouseLeave={(e) => {
            if (overlays.length > 0) {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.2)'
            }
          }}
        >
          {overlays.length === 0 ? 'Add designs to save' : 'Save Design'}
        </button>

        {/* Add to Cart Button - Always visible at bottom */}
        <button
          onClick={handleAddToCart}
          disabled={overlays.length === 0}
          style={{
            width: '100%',
            padding: '1.25rem',
            marginTop: '0.75rem',
            background: overlays.length === 0 ? '#ddd' : '#aed13a',
            border: '3px solid #000',
            borderRadius: '12px',
            color: '#000',
            cursor: overlays.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: '800',
            fontSize: '1.1rem',
            textTransform: 'uppercase',
            transition: 'all 0.2s ease',
            boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.2)',
            opacity: overlays.length === 0 ? 0.5 : 1,
          }}
          onMouseEnter={(e) => {
            if (overlays.length > 0) {
              e.currentTarget.style.transform = 'translate(-2px, -2px)'
              e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
            }
          }}
          onMouseLeave={(e) => {
            if (overlays.length > 0) {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.2)'
            }
          }}
        >
          {overlays.length === 0 ? 'Add designs to continue' : 'Add to Cart - $30.00'}
        </button>
      </div>

      {/* Save Design Modal */}
      {showSaveModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div style={{
            background: '#fff',
            border: '4px solid #000',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.3)',
          }}>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '900',
              marginBottom: '1rem',
              textTransform: 'uppercase',
            }}>Save Design</h3>
            <p style={{ color: '#666', marginBottom: '1rem' }}>Give your design a name</p>
            <input
              type="text"
              value={designName}
              onChange={(e) => setDesignName(e.target.value)}
              placeholder="My Awesome Design"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #000',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmSaveDesign()
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setDesignName('')
                }}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#fff',
                  border: '3px solid #000',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmSaveDesign}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#ffeb3b',
                  border: '3px solid #000',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

