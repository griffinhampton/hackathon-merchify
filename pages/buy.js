import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState, useRef } from 'react'

export default function Buy() {
  const [generatedFrame, setGeneratedFrame] = useState(null)
  const [processedImageUrl, setProcessedImageUrl] = useState(null)
  const canvasRef = useRef(null)
  const printCanvasRef = useRef(null)

  useEffect(() => {
    // Get the generated frames from localStorage
    const framesJson = localStorage.getItem('generatedFrames')
    if (framesJson) {
      try {
        const frames = JSON.parse(framesJson)
        if (frames && frames.length > 0) {
          // Use the first frame — build a safe URL (handle cases where the stored value
          // may already include a path or full URL)
          const raw = frames[0]
          let frameUrl
          if (!raw) {
            frameUrl = null
          } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
            frameUrl = raw
          } else if (raw.startsWith('/')) {
            frameUrl = raw
          } else if (raw.startsWith('generated/')) {
            // already has the folder
            frameUrl = '/' + raw
          } else {
            frameUrl = `/generated/${raw}`
          }
          setGeneratedFrame(frameUrl)
          console.log('Loaded frame (raw):', raw, ' -> frameUrl:', frameUrl)
          
          // Process the image to remove navy blue background
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = img.width
            canvas.height = img.height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            
            // Get image data and make navy blue transparent (robust)
            let imageData
            try {
              imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            } catch (err) {
              console.warn('getImageData failed on buy page processing, skipping transparency:', err)
              setProcessedImageUrl(canvas.toDataURL())
              return
            }

            const data = imageData.data
            let transparentPixels = 0

            for (let i = 0; i < data.length; i += 4) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              const a = data[i + 3]

              if (r === 0 && g === 0 && b === 128) {
                data[i + 3] = 0
                transparentPixels++
                continue
              }

              if (r < 50 && g < 50 && b > 60 && b < 150) {
                data[i + 3] = 0
                transparentPixels++
                continue
              }

              const blueDominance = Math.max(b - r, b - g)
              if (b > 60 && blueDominance > 20) {
                data[i + 3] = 0
                transparentPixels++
              } else if (b > 60 && blueDominance > 8) {
                const factor = (blueDominance - 8) / (20 - 8)
                data[i + 3] = Math.round(a * (1 - Math.min(1, factor)))
              }
            }

            if (transparentPixels > 0) console.log(`Made ${transparentPixels} pixels transparent out of ${data.length / 4} total pixels`)

            ctx.putImageData(imageData, 0, 0)
            setProcessedImageUrl(canvas.toDataURL())
          }
          img.src = frameUrl
        }
      } catch (error) {
        console.error('Error parsing frames:', error)
      }
    }
  }, [])

  // Draw processed image into the small 'Your print' canvas so transparency is preserved
  useEffect(() => {
    const canvas = printCanvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (!processedImageUrl) {
      // draw placeholder text
      ctx.fillStyle = '#f9f9f9'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#666'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('No image', canvas.width / 2, canvas.height / 2)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // draw image covering the canvas (cover behavior)
      const cw = canvas.width
      const ch = canvas.height
      const iw = img.width
      const ih = img.height
      const scale = Math.max(cw / iw, ch / ih)
      const w = iw * scale
      const h = ih * scale
      const x = (cw - w) / 2
      const y = (ch - h) / 2
      ctx.clearRect(0, 0, cw, ch)
      ctx.drawImage(img, x, y, w, h)
    }
    img.onerror = () => {
      ctx.fillStyle = '#f9f9f9'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = '#666'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('No image', canvas.width / 2, canvas.height / 2)
    }
    img.src = processedImageUrl
  }, [processedImageUrl])

  return (
    <main style={{ padding: '2rem', background: '#fff', minHeight: 'calc(100vh - 70px)' }}>
      <div style={{ textAlign: 'center', marginBottom: '4rem', marginTop: '2rem' }}>
        <h1 style={{
          fontSize: 'clamp(2rem, 8vw, 5rem)',
          fontWeight: '900',
          textAlign: 'center',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          filter: 'blur(0.5px)',
          fontFamily: 'Trebuchet MS, Arial Black, Impact, sans-serif',
        }}>
          <span style={{
            color: '#ff6b8a',
            WebkitTextStroke: '2px #000',
            paintOrder: 'stroke',
          }}>Merchify </span>
          <span style={{
            color: '#4db8ff',
            WebkitTextStroke: '2px #000',
            paintOrder: 'stroke',
          }}>Menu</span>
        </h1>
        <p style={{
          fontSize: '1.5rem',
          color: '#333',
          textAlign: 'center',
          fontWeight: '600',
        }}>
          Choose your product and customize it your way
        </p>
      </div>

      

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <Link href="/buy/shirt" style={{
          textDecoration: 'none',
          color: '#000',
          background: '#fff',
          border: '4px solid #000',
          borderRadius: '16px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-2px, -2px)'
          e.currentTarget.style.boxShadow = '8px 8px 0px rgba(0, 0, 0, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)'
          e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '250px',
            marginBottom: '1.5rem',
          }}>
            <Image 
              src="/placeholders/shirt-placeholder.png" 
              alt="Custom T-Shirt"
              fill
              style={{ objectFit: 'contain', objectPosition: 'top' }}
            />
            {processedImageUrl && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60%',
                height: '60%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img 
                  src={processedImageUrl} 
                  alt="Generated frame"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
          </div>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}>Custom T-Shirt</h3>
          <p style={{
            fontSize: '1rem',
            color: '#666',
            marginBottom: '1rem',
            flex: '1',
          }}>Design your own t-shirt with custom colors and text</p>
          <span style={{
            fontSize: '1.3rem',
            fontWeight: '800',
            color: '#aed13a',
          }}>From $30.00</span>
        </Link>

        <Link href="/buy/pants" style={{
          textDecoration: 'none',
          color: '#000',
          background: '#fff',
          border: '4px solid #000',
          borderRadius: '16px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-2px, -2px)'
          e.currentTarget.style.boxShadow = '8px 8px 0px rgba(0, 0, 0, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)'
          e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '250px',
            marginBottom: '1.5rem',
          }}>
            <Image 
              src="/placeholders/pants-placeholder.png" 
              alt="Custom Pants"
              fill
              style={{ objectFit: 'contain', objectPosition: 'top' }}
            />
            {processedImageUrl && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60%',
                height: '60%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img 
                  src={processedImageUrl} 
                  alt="Generated frame"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            )}
          </div>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}>Custom Pants</h3>
          <p style={{
            fontSize: '1rem',
            color: '#666',
            marginBottom: '1rem',
            flex: '1',
          }}>Design your own pants with custom colors and text</p>
          <span style={{
            fontSize: '1.3rem',
            fontWeight: '800',
            color: '#aed13a',
          }}>From $45.00</span>
        </Link>

        <Link href="/buy/hat" style={{
          textDecoration: 'none',
          color: '#000',
          background: '#fff',
          border: '4px solid #000',
          borderRadius: '16px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-2px, -2px)'
          e.currentTarget.style.boxShadow = '8px 8px 0px rgba(0, 0, 0, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)'
          e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '250px',
            marginBottom: '1.5rem',
          }}>
            <Image 
              src="/placeholders/hat-placeholder.png" 
              alt="Custom Hat"
              fill
              style={{ objectFit: 'contain', objectPosition: 'top' }}
            />
          </div>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}>Custom Hat</h3>
          <p style={{
            fontSize: '1rem',
            color: '#666',
            marginBottom: '1rem',
            flex: '1',
          }}>Design your own hat with custom colors and text</p>
          <span style={{
            fontSize: '1.3rem',
            fontWeight: '800',
            color: '#aed13a',
          }}>From $25.00</span>
        </Link>

        <Link href="/buy/cup" style={{
          textDecoration: 'none',
          color: '#000',
          background: '#fff',
          border: '4px solid #000',
          borderRadius: '16px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-2px, -2px)'
          e.currentTarget.style.boxShadow = '8px 8px 0px rgba(0, 0, 0, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)'
          e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '250px',
            marginBottom: '1.5rem',
          }}>
            <Image 
              src="/placeholders/cup-placeholder.png" 
              alt="Custom Cup"
              fill
              style={{ objectFit: 'contain', objectPosition: 'top' }}
            />
          </div>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}>Custom Cup</h3>
          <p style={{
            fontSize: '1rem',
            color: '#666',
            marginBottom: '1rem',
            flex: '1',
          }}>Design your own cup with custom colors and text</p>
          <span style={{
            fontSize: '1.3rem',
            fontWeight: '800',
            color: '#aed13a',
          }}>From $20.00</span>
        </Link>

        <Link href="/buy/propane" style={{
          textDecoration: 'none',
          color: '#000',
          background: '#fff',
          border: '4px solid #000',
          borderRadius: '16px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.2)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translate(-2px, -2px)'
          e.currentTarget.style.boxShadow = '8px 8px 0px rgba(0, 0, 0, 0.2)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translate(0, 0)'
          e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ 
            position: 'relative', 
            width: '100%', 
            height: '250px',
            marginBottom: '1.5rem',
          }}>
            <Image 
              src="/placeholders/propane-placeholder.png" 
              alt="Custom Propane Tank"
              fill
              style={{ objectFit: 'contain', objectPosition: 'top' }}
            />
          </div>
          <h3 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
          }}>Custom Propane Tank</h3>
          <p style={{
            fontSize: '1rem',
            color: '#666',
            marginBottom: '1rem',
            flex: '1',
          }}>Design your own propane tank with custom colors and text</p>
          <span style={{
            fontSize: '1.3rem',
            fontWeight: '800',
            color: '#aed13a',
          }}>From $35.00</span>
        </Link>
      </div>
    </main>
  )
}
