import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/router'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// Loading Game Component - Zerg Rush style
function LoadingGame() {
  const [playerHealth, setPlayerHealth] = useState(15)
  const [letters, setLetters] = useState([])
  const [damagePopups, setDamagePopups] = useState([])
  const [gameOver, setGameOver] = useState(false)
  const [loadingDots, setLoadingDots] = useState(1)
  const gameRef = useRef(null)
  const letterIdCounter = useRef(0)
  const availableLetters = [
    'icon.png', 
    'y-letter.png',
    'c-letter.PNG',
    'e-letter.PNG',
    'f-letter.PNG',
    'h-letter.PNG',
    'i-letter.PNG',
    'r-letter.PNG'
  ]

  // Animate loading dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setLoadingDots(prev => prev === 3 ? 1 : prev + 1)
    }, 500)
    return () => clearInterval(dotsInterval)
  }, [])

  useEffect(() => {
    // Spawn multiple letters every 0.5-1 seconds
    const spawnInterval = setInterval(() => {
      setLetters(prev => {
        // Only spawn if we have less than 4 letters on screen
        if (prev.length >= 4) return prev
        
        const numLetters = Math.floor(Math.random() * 3) + 1 // Spawn 1-3 letters at once
        const newLetters = []
        
        for (let i = 0; i < numLetters; i++) {
          // Don't exceed max of 4 letters
          if (prev.length + newLetters.length >= 4) break
          
          // Random direction: 0=top, 1=right, 2=bottom, 3=left
          const direction = Math.floor(Math.random() * 4)
          let x, y, vx, vy
          
          switch(direction) {
            case 0: // From top
              x = Math.random() * window.innerWidth
              y = -60
              break
            case 1: // From right
              x = window.innerWidth + 60
              y = Math.random() * window.innerHeight
              break
            case 2: // From bottom
              x = Math.random() * window.innerWidth
              y = window.innerHeight + 60
              break
            case 3: // From left
              x = -60
              y = Math.random() * window.innerHeight
              break
          }
          
          newLetters.push({
            id: letterIdCounter.current++,
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 2,
            vy: Math.random() * 2 + 1,
            health: 2,
            image: availableLetters[Math.floor(Math.random() * availableLetters.length)],
            rotation: Math.random() * 360
          })
        }
        
        return [...prev, ...newLetters]
      })
    }, Math.random() * 500 + 500)

    // Animation loop
    const animationLoop = setInterval(() => {
      setLetters(prev => prev.map(letter => {
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2 - 60 // Target "now loading..." text position
        
        // Move towards "now loading..." text
        const dx = centerX - letter.x
        const dy = centerY - letter.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance > 5) {
          const speed = 1.5
          letter.x += (dx / distance) * speed
          letter.y += (dy / distance) * speed
          letter.rotation += 2
        } else {
          // Collided with "now loading..." text
          if (!letter.collided) {
            letter.collided = true
            setPlayerHealth(h => {
              const newHealth = Math.max(0, h - 1)
              if (newHealth === 0) setGameOver(true)
              return newHealth
            })
            
            // Create damage popup
            setDamagePopups(prev => [...prev, {
              id: Math.random(),
              x: centerX,
              y: centerY,
              time: Date.now()
            }])
            
            // Remove letter after collision
            return null
          }
        }
        
        return letter
      }).filter(Boolean))
      
      // Clean old damage popups
      setDamagePopups(prev => prev.filter(p => Date.now() - p.time < 1000))
    }, 1000 / 60) // 60 FPS

    return () => {
      clearInterval(spawnInterval)
      clearInterval(animationLoop)
    }
  }, [])

  const handleLetterClick = (letterId) => {
    let clickedLetter = null;
    setLetters(prev => prev.map(letter => {
      if (letter.id === letterId) {
        clickedLetter = letter;
        const newHealth = letter.health - 1;
        if (newHealth <= 0) {
          return null; // Remove letter
        }
        return { ...letter, health: newHealth };
      }
      return letter;
    }).filter(Boolean));
    // Add green money popup at letter position
    if (clickedLetter) {
      setDamagePopups(prev => [
        ...prev,
        {
          id: Math.random(),
          x: clickedLetter.x + 25, // center of letter
          y: clickedLetter.y,
          time: Date.now(),
          type: 'money'
        }
      ]);
    }
  }

  return (
    <div ref={gameRef} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#f5f5f5',
      overflow: 'hidden',
      zIndex: 10000,
      cursor: gameOver ? 'default' : 'crosshair'
    }}>
      {/* Letters */}
      {letters.map(letter => (
        <div
          key={letter.id}
          onClick={() => !gameOver && handleLetterClick(letter.id)}
          style={{
            position: 'absolute',
            left: `${letter.x}px`,
            top: `${letter.y}px`,
            width: '50px',
            height: '50px',
            cursor: 'pointer',
            transform: `rotate(${letter.rotation}deg)`,
            transition: 'transform 0.05s',
            userSelect: 'none',
            pointerEvents: gameOver ? 'none' : 'auto'
          }}
        >
          <img 
            src={`/assets/${letter.image}`} 
            alt="letter" 
            style={{ 
              width: '100%', 
              height: '100%', 
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
              animation: 'letterSpin 2s linear infinite'
            }}
            draggable="false"
          />
          {/* Letter health bar */}
          <div style={{
            position: 'absolute',
            bottom: '-8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '40px',
            height: '4px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(letter.health / 2) * 100}%`,
              height: '100%',
              background: letter.health === 2 ? '#aed13a' : '#ffb74d',
              transition: 'width 0.2s'
            }}></div>
          </div>
        </div>
      ))}

      {/* Damage Popups */}
      {damagePopups.map(popup => {
        const age = Date.now() - popup.time;
        const opacity = 1 - (age / 1000);
        const yOffset = age / 10;
        if (popup.type === 'money') {
          return (
            <div
              key={popup.id}
              style={{
                position: 'absolute',
                left: `${popup.x}px`,
                top: `${popup.y - yOffset}px`, // same as -1 popup
                color: '#00ff00',
                fontSize: '2rem',
                fontWeight: '900',
                opacity: opacity,
                pointerEvents: 'none',
                textShadow: '0 0 12px #00ff00, 2px 2px 4px rgba(0,0,0,0.8)',
                transform: 'translateX(-50%)',
              }}
            >
              +$0.0001
            </div>
          );
        }
        // Default damage popup
        return (
          <div
            key={popup.id}
            style={{
              position: 'absolute',
              left: `${popup.x}px`,
              top: `${popup.y - yOffset}px`,
              color: '#d97676',
              fontSize: '2rem',
              fontWeight: '900',
              opacity: opacity,
              pointerEvents: 'none',
              textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
              transform: 'translateX(-50%)'
            }}
          >
            -1
          </div>
        );
      })}

      {/* Loading Bar (Player) - Centered */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '300px',
        textAlign: 'center'
      }}>
        {!gameOver ? (
          <>
            {/* "now loading..." text above health bar */}
            <div style={{
              fontSize: '1.5rem',
              color: '#000',
              fontWeight: '700',
              letterSpacing: '2px',
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
              marginBottom: '20px'
            }}>
              now loading{'.'.repeat(loadingDots)}
            </div>
            
            <div style={{
              width: '100%',
              height: '12px',
              background: '#000',
              border: '2px solid #fff',
              borderRadius: '6px',
              overflow: 'hidden',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
              position: 'relative'
            }}>
            <div style={{
              width: `${(playerHealth / 15) * 100}%`,
              height: '100%',
              background: playerHealth > 10 ? '#aed13a' : playerHealth > 5 ? '#ffb74d' : '#d97676',
              transition: 'width 0.3s, background 0.3s',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Animated scrolling stripes */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '200%',
                height: '100%',
                background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.2) 10px, rgba(255,255,255,0.2) 20px)',
                animation: 'scroll 1s linear infinite'
              }}></div>
            </div>
          </div>
          </>
        ) : (
          <h1 style={{
            fontSize: '4rem',
            color: '#000',
            fontWeight: '900',
            marginTop: '-20px'
          }}>
            now what...
          </h1>
        )}
      </div>
      
      {/* Loaded Message */}
      {!gameOver && playerHealth === 15 && letters.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, calc(-50% + 40px))',
          fontSize: '1.5rem',
          color: '#aed13a',
          fontWeight: '900',
          textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          animation: 'fadeIn 0.5s'
        }}>
        </div>
      )}

      <style jsx global>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        
        @keyframes fadeIn {
          0% { opacity: 0; transform: translate(-50%, calc(-50% + 50px)); }
          100% { opacity: 1; transform: translate(-50%, calc(-50% + 40px)); }
        }
        
        @keyframes letterSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default function Home() {
  const heroCanvasRef = useRef(null)
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [videoId, setVideoId] = useState('')
  const [videoUrl, setVideoUrl] = useState('') // For non-YouTube videos
  const [timestamp, setTimestamp] = useState([1, 5]) // [start, end] - minimum 1 second
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingRange, setIsDraggingRange] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const [dragStartTimestamp, setDragStartTimestamp] = useState([0, 0])
  const [isPaused, setIsPaused] = useState(false)
  const [selectionMode, setSelectionMode] = useState('range') // 'single' or 'range'
  const [videoSource, setVideoSource] = useState('youtube') // 'youtube', 'tiktok', 'instagram', 'local'
  const [localFile, setLocalFile] = useState(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [promptText, setPromptText] = useState('')
  const playerRef = useRef(null)
  const videoRef = useRef(null) // For HTML5 video
  const timelineRef = useRef(null)

  const extractVideoId = (url) => {
    // Check for YouTube Shorts
    const shortsRegExp = /youtube\.com\/shorts\/([A-Za-z0-9_-]+)/
    const shortsMatch = url.match(shortsRegExp)
    if (shortsMatch) {
      return shortsMatch[1]
    }
    
    // Reject regular YouTube videos
    const regularRegExp = /youtube\.com\/watch\?v=|youtu\.be\//
    if (regularRegExp.test(url)) {
      return null // Not a short
    }
    
    return null
  }

  const extractTikTokId = (url) => {
    // Extract TikTok video ID from URL - handles query parameters
    const match = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/)
    return match ? match[1] : null
  }

  const extractInstagramId = (url) => {
    // Extract Instagram reel/post ID from URL - handle both /reel/ and /p/
    const match = url.match(/instagram\.com\/(reel|reels|p)\/([A-Za-z0-9_-]+)/)
    return match ? match[2] : null
  }

  const getInstagramEmbedUrl = async (postId) => {
    // Instagram embeds use the /reel/ path for proper display
    return `https://www.instagram.com/reel/${postId}/embed/`
  }

  const handleLoadVideo = async () => {
    if (videoSource === 'youtube') {
      const id = extractVideoId(youtubeUrl)
      if (id) {
        setVideoId(id)
        setVideoUrl('')
        // Load YouTube IFrame API
        if (!window.YT) {
          const tag = document.createElement('script')
          tag.src = 'https://www.youtube.com/iframe_api'
          const firstScriptTag = document.getElementsByTagName('script')[0]
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
          
          window.onYouTubeIframeAPIReady = () => {
            initPlayer(id)
          }
        } else {
          setTimeout(() => initPlayer(id), 100)
        }
      } else {
        alert('Invalid YouTube Shorts URL. Please use a YouTube Shorts link (youtube.com/shorts/...)')
      }
    } else if (videoSource === 'tiktok') {
      const id = extractTikTokId(youtubeUrl)
      if (id) {
        // For TikTok, we'll use an embed URL
        setVideoId('')
        setVideoUrl(`https://www.tiktok.com/embed/v2/${id}`)
        setDuration(60) // Set default duration for manual input
        setTimestamp([1, 5])
      } else {
        alert('Invalid TikTok URL')
      }
    } else if (videoSource === 'instagram') {
      const id = extractInstagramId(youtubeUrl)
      if (id) {
        // For Instagram, use the embed approach
        setVideoId('')
        const embedUrl = await getInstagramEmbedUrl(id)
        setVideoUrl(embedUrl)
        setDuration(60) // Set default duration for manual input
        setTimestamp([1, 5])
      } else {
        alert('Invalid Instagram URL. Please use an Instagram Reels link.')
      }
    }
  }

  const handleLocalFileLoad = (file) => {
    if (file && file.type.startsWith('video/')) {
      setLocalFile(file)
      const url = URL.createObjectURL(file)
      setVideoUrl(url)
      setVideoId('')
      setTimeout(() => initHTML5Player(), 100)
    } else {
      alert('Please select a valid video file')
    }
  }

  const initHTML5Player = () => {
    const checkVideo = setInterval(() => {
      if (videoRef.current) {
        clearInterval(checkVideo)
        
        const handleLoadedMetadata = () => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration)
            setIsPaused(true)
          }
        }
        
        const handleTimeUpdate = () => {
          if (videoRef.current && !isDragging && !isDraggingRange) {
            setCurrentTime(videoRef.current.currentTime)
          }
        }
        
        videoRef.current.addEventListener('loadedmetadata', handleLoadedMetadata)
        videoRef.current.addEventListener('timeupdate', handleTimeUpdate)
        
        // If metadata is already loaded
        if (videoRef.current.duration) {
          handleLoadedMetadata()
        }
        
        // Store cleanup function
        videoRef.current.cleanupListeners = () => {
          if (videoRef.current) {
            videoRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata)
            videoRef.current.removeEventListener('timeupdate', handleTimeUpdate)
          }
        }
      }
    }, 100)
    
    // Clear interval after 5 seconds if video never loads
    setTimeout(() => clearInterval(checkVideo), 5000)
  }

  const initPlayer = (id) => {
    if (window.YT && window.YT.Player) {
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: id,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            setDuration(event.target.getDuration())
            event.target.playVideo()
            
            // Update timestamp as video plays
            const updateInterval = setInterval(() => {
              if (playerRef.current && playerRef.current.getCurrentTime) {
                const time = playerRef.current.getCurrentTime()
                setCurrentTime(prev => {
                  // Only update if user is not dragging the slider
                  return isDragging ? prev : time
                })
              }
            }, 100) // Update every 100ms for smooth slider movement
            
            // Store interval ID for cleanup
            playerRef.current.updateInterval = updateInterval
          },
          onStateChange: (event) => {
            // Continue updating timestamp when video is playing
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (!playerRef.current.updateInterval) {
                const updateInterval = setInterval(() => {
                  if (playerRef.current && playerRef.current.getCurrentTime) {
                    const time = playerRef.current.getCurrentTime()
                    setCurrentTime(prev => {
                      // Only update if user is not dragging the slider
                      return isDragging ? prev : time
                    })
                  }
                }, 100)
                playerRef.current.updateInterval = updateInterval
              }
            }
          }
        }
      })
    }
  }

  const handleStartChange = (value) => {
    // Pause video when dragging
    if (videoSource === 'youtube' && playerRef.current && playerRef.current.pauseVideo && !isPaused) {
      playerRef.current.pauseVideo()
      setIsPaused(true)
    } else if (videoRef.current && !isPaused) {
      videoRef.current.pause()
      setIsPaused(true)
    }
    
    if (value >= timestamp[1]) {
      // If start is dragged past end, move end along with it
      const diff = timestamp[1] - timestamp[0]
      setTimestamp([value, value + diff])
      if (videoSource === 'youtube' && playerRef.current && playerRef.current.seekTo) {
        playerRef.current.seekTo(value, true)
      } else if (videoRef.current) {
        videoRef.current.currentTime = value
      }
    } else {
      setTimestamp([value, timestamp[1]])
      if (videoSource === 'youtube' && playerRef.current && playerRef.current.seekTo) {
        playerRef.current.seekTo(value, true)
      } else if (videoRef.current) {
        videoRef.current.currentTime = value
      }
    }
  }

  const handleEndChange = (value) => {
    // Pause video when dragging
    if (videoSource === 'youtube' && playerRef.current && playerRef.current.pauseVideo && !isPaused) {
      playerRef.current.pauseVideo()
      setIsPaused(true)
    } else if (videoRef.current && !isPaused) {
      videoRef.current.pause()
      setIsPaused(true)
    }
    
    // Prevent end from going before start
    const newEnd = Math.max(value, timestamp[0] + 0.1)
    
    setTimestamp([timestamp[0], newEnd])
    if (videoSource === 'youtube' && playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(newEnd, true)
    } else if (videoRef.current) {
      videoRef.current.currentTime = newEnd
    }
  }

  const handleTimeInputChange = (index, value) => {
    const newTimestamp = [...timestamp]
    newTimestamp[index] = Math.max(1, parseFloat(value) || 1) // Minimum 1 second
    
    // Ensure start < end
    if (index === 0 && newTimestamp[0] >= timestamp[1]) {
      newTimestamp[0] = Math.max(1, timestamp[1] - 1)
    } else if (index === 1 && newTimestamp[1] <= timestamp[0]) {
      newTimestamp[1] = timestamp[0] + 1
    }
    
    setTimestamp(newTimestamp)
    if (videoSource === 'youtube' && playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(newTimestamp[index], true)
    } else if (videoRef.current) {
      videoRef.current.currentTime = newTimestamp[index]
    }
  }

  const handleSingleTimeChange = (value) => {
    // Pause video when dragging
    if (videoSource === 'youtube' && playerRef.current && playerRef.current.pauseVideo && !isPaused) {
      playerRef.current.pauseVideo()
      setIsPaused(true)
    } else if (videoRef.current && !isPaused) {
      videoRef.current.pause()
      setIsPaused(true)
    }
    
    const clampedValue = Math.max(1, value) // Minimum 1 second
    setTimestamp([clampedValue, clampedValue])
    if (videoSource === 'youtube' && playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(clampedValue, true)
    } else if (videoRef.current) {
      videoRef.current.currentTime = clampedValue
    }
  }

  const handleRangeMouseDown = (e) => {
    setIsDraggingRange(true)
    setDragStartX(e.clientX)
    setDragStartTimestamp([...timestamp])
    
    // Pause video when starting to drag
    if (videoSource === 'youtube' && playerRef.current && playerRef.current.pauseVideo) {
      playerRef.current.pauseVideo()
      setIsPaused(true)
    } else if (videoRef.current) {
      videoRef.current.pause()
      setIsPaused(true)
    }
  }

  const handleRangeMouseMove = (e) => {
    if (!isDraggingRange || !timelineRef.current) return
    
    const timelineRect = timelineRef.current.getBoundingClientRect()
    const deltaX = e.clientX - dragStartX
    const deltaTime = (deltaX / timelineRect.width) * duration
    
    let newStart = dragStartTimestamp[0] + deltaTime
    let newEnd = dragStartTimestamp[1] + deltaTime
    
    // Constrain to video bounds
    if (newStart < 0) {
      newEnd = newEnd - newStart
      newStart = 0
    }
    if (newEnd > duration) {
      newStart = newStart - (newEnd - duration)
      newEnd = duration
    }
    
    setTimestamp([Math.max(0, newStart), Math.min(duration, newEnd)])
    
    // Seek video to new start position
    if (videoSource === 'youtube' && playerRef.current && playerRef.current.seekTo) {
      playerRef.current.seekTo(newStart, true)
    } else if (videoRef.current) {
      videoRef.current.currentTime = newStart
    }
  }

  const handleRangeMouseUp = () => {
    setIsDraggingRange(false)
  }

  const handlePlayPause = () => {
    if (videoSource === 'youtube') {
      if (!playerRef.current) return
      
      if (isPaused) {
        // Always seek to start time before playing
        playerRef.current.seekTo(timestamp[0], true)
        setTimeout(() => {
          playerRef.current.playVideo()
          setIsPaused(false)
        }, 100)
      } else {
        playerRef.current.pauseVideo()
        setIsPaused(true)
      }
    } else {
      if (!videoRef.current) return
      
      if (isPaused) {
        // Always seek to start time before playing
        videoRef.current.currentTime = timestamp[0]
        videoRef.current.play()
        setIsPaused(false)
      } else {
        videoRef.current.pause()
        setIsPaused(true)
      }
    }
  }

  const trimVideoSegment = async (videoElement, startTime, endTime) => {
    return new Promise((resolve, reject) => {
      try {
        // Create a canvas to capture the video
        const canvas = document.createElement('canvas')
        canvas.width = videoElement.videoWidth
        canvas.height = videoElement.videoHeight
        const ctx = canvas.getContext('2d')
        
        // Capture canvas stream
        const stream = canvas.captureStream(30) // 30 fps
        
        // Add audio track if available
        if (videoElement.captureStream) {
          const videoStream = videoElement.captureStream()
          const audioTracks = videoStream.getAudioTracks()
          if (audioTracks.length > 0) {
            stream.addTrack(audioTracks[0])
          }
        }
        
        // Setup MediaRecorder
        const chunks = []
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'video/webm;codecs=vp9',
          videoBitsPerSecond: 2500000
        })
        
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data)
          }
        }
        
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' })
          resolve(blob)
        }
        
        // Seek to start time
        videoElement.currentTime = startTime
        
        videoElement.onseeked = () => {
          // Start recording
          mediaRecorder.start(100) // Collect data every 100ms
          videoElement.play()
          
          // Draw frames to canvas
          const drawFrame = () => {
            if (videoElement.currentTime >= endTime) {
              mediaRecorder.stop()
              videoElement.pause()
              return
            }
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height)
            requestAnimationFrame(drawFrame)
          }
          
          drawFrame()
        }
        
        videoElement.onerror = reject
      } catch (error) {
        reject(error)
      }
    })
  }

  const handleConfirm = async () => {
    console.log('Video Source:', videoSource)
    console.log('Start Time:', formatTime(timestamp[0]))
    console.log('End Time:', formatTime(timestamp[1]))
    console.log('Duration:', formatTime(timestamp[1] - timestamp[0]))
    
    // Close modal and show loading
    setShowModal(false)
    setIsUploading(true)
    
    try {
      if (videoSource === 'local' && localFile) {
        // For local files, trim and upload the video segment
        const trimmedVideoBlob = await trimVideoSegment(videoRef.current, timestamp[0], timestamp[1])
        
        // Create FormData to send to backend
        const formData = new FormData()
        formData.append('video', trimmedVideoBlob, `trimmed_video_${timestamp[0]}-${timestamp[1]}.webm`)
        formData.append('startTime', formatTime(timestamp[0]))
        formData.append('endTime', formatTime(timestamp[1]))
        formData.append('duration', formatTime(timestamp[1] - timestamp[0]))
        formData.append('prompt',)
        formData.append('source', 'local')
        formData.append('originalFilename', localFile.name)
        
        console.log('Uploading trimmed video:', {
          size: `${(trimmedVideoBlob.size / 1024 / 1024).toFixed(2)} MB`,
          duration: `${(timestamp[1] - timestamp[0]).toFixed(1)}s`
        })
        
        // Log FormData contents
        console.log('=== FormData Contents ===')
        for (let [key, value] of formData.entries()) {
          if (value instanceof Blob) {
            console.log(`${key}:`, {
              type: value.type,
              size: `${(value.size / 1024 / 1024).toFixed(2)} MB`,
              name: value.name || 'blob'
            })
          } else {
            console.log(`${key}:`, value)
          }
        }
        console.log('========================')
        
        // Send FormData to backend API
        const response = await fetch('http://localhost:8080/merch', {
          mode: 'no-cors',
          method: 'POST',
          body: formData
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error Response:', errorText)
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        console.log('API Response:', result)

        // Navigate to /buy after successful upload
        router.push('/buy')
      } else {
        // For online videos (YouTube, TikTok, Instagram), send ONLY JSON
        const payload = {
          //videoId: videoId,
          videoLink: youtubeUrl || videoUrl,
          startTime: formatTime(timestamp[0]),
          //endTime: formatTime(timestamp[1]),
          duration: formatTime(timestamp[1]-timestamp[0]),
          videoSource: videoSource,
          prompt: "",
          //selectionMode: selectionMode
        }
        
        console.log('=== Sending JSON to backend ===')
        console.log('Payload:', payload)
        console.log('JSON String:', JSON.stringify(payload))
        console.log('===============================')
        
        // Send ONLY JSON data to backend API
        const response = await fetch('http://localhost:8080/merch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error Response:', errorText)
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }

        const result = await response.json()
        console.log('=== API Response ===')
        console.log('Raw JSON:', JSON.stringify(result))
        console.log('Parsed Result:', result)
        
        // Log PNG filenames if it's an array
        if (Array.isArray(result)) {
          console.log('PNG Files:', result)
          console.log('Number of files:', result.length)
          result.forEach((filename, index) => {
            console.log(`  [${index}]: ${filename}`)
          })
          
          // Store PNG filenames in localStorage for the buy page
          if (result.length > 0) {
            localStorage.setItem('generatedFrames', JSON.stringify(result))
            console.log('Stored frames in localStorage:', result)
          }
        }
        console.log('===================')
        
        // Navigate to /buy after successful upload
        router.push('/buy')
      }
    } catch (error) {
      console.error('Error uploading:', error)
      alert('Failed to upload video. Please try again.')
      setIsUploading(false)
    }
  }

  const formatTime = (seconds) => {
    // Ensure minimum of 1 second
    const totalSeconds = Math.max(1, Math.floor(seconds))
    const hours = Math.floor(totalSeconds / 3600)
    const mins = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Three.js Hero Canvas Effect
  useEffect(() => {
    const mount = heroCanvasRef.current
    if (!mount) return

    const width = mount.clientWidth || 800
    const height = mount.clientHeight || 600
    
    const scene = new THREE.Scene()
    scene.background = null // Transparent so CSS grid shows through

    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    camera.position.set(0, 0.5, 2.5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0) // Transparent background
    mount.appendChild(renderer.domElement)

    // Setup OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.enableZoom = false
    controls.enablePan = false
    controls.minPolarAngle = Math.PI / 3
    controls.maxPolarAngle = 2 * Math.PI / 3
    controls.target.set(0, 0, 0)
    controls.autoRotate = true
    controls.autoRotateSpeed = 2

    // Add lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
    directionalLight.position.set(5, 5, 5)
    scene.add(directionalLight)
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5)
    directionalLight2.position.set(-5, -5, -5)
    scene.add(directionalLight2)

    // Load the t-shirt model
    const loader = new GLTFLoader()
    const textureLoader = new THREE.TextureLoader()
    let tshirtModel = null

    loader.load(
      '/models/tshirt.gltf',
      function(gltf) {
        tshirtModel = gltf.scene
        
        const box = new THREE.Box3().setFromObject(tshirtModel)
        const size = box.getSize(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        const scale = 2 / maxDim
        tshirtModel.scale.multiplyScalar(scale)
        
        box.setFromObject(tshirtModel)
        const center = box.getCenter(new THREE.Vector3())
        tshirtModel.position.set(-center.x, -center.y, -center.z)
        
        // Load and apply the UV map texture
        textureLoader.load('/uv-maps/Template2.png', function(texture) {
          texture.flipY = false
          texture.needsUpdate = true
          
          // Create a canvas to modify the texture colors
          const canvas = document.createElement('canvas')
          const img = texture.image
          canvas.width = img.width
          canvas.height = img.height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          
          // Get image data and convert grey to white
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const data = imageData.data
          
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i]
            const g = data[i + 1]
            const b = data[i + 2]
            // Make exact #000080 fully transparent
            if (r === 0 && g === 0 && b === 128) {
              data[i + 3] = 0;
            }
            // Check if pixel is grey (R, G, B values are similar and in grey range)
            const avg = (r + g + b) / 3;
            const variance = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
            // If it's a grey color (low variance between RGB channels)
            if (variance < 30 && avg > 100 && avg < 220) {
              data[i] = 255;     // R
              data[i + 1] = 255; // G
              data[i + 2] = 255; // B
            }
          }
          
          ctx.putImageData(imageData, 0, 0)
          
          // Create new texture from modified canvas
          const modifiedTexture = new THREE.CanvasTexture(canvas)
          modifiedTexture.flipY = false
          modifiedTexture.needsUpdate = true
          
          tshirtModel.traverse((child) => {
            if (child.isMesh && child.material) {
              if (child.material.map) {
                child.material.map.dispose()
              }
              child.material.map = modifiedTexture
              child.material.color = new THREE.Color(0xffffff)
              child.material.needsUpdate = true
            }
          })
        })
        
        scene.add(tshirtModel)
      },
      undefined,
      function(error) {
        console.error('Error loading t-shirt model:', error)
      }
    )

    // Handle scroll to move canvas down
    const handleScroll = () => {
      const scrollY = window.scrollY
      const heroHeight = mount.parentElement?.offsetHeight || 0
      
      // Move the canvas down with scroll
      if (mount.parentElement) {
        const translateY = Math.min(scrollY, heroHeight)
        mount.style.transform = `translateY(${translateY}px)`
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

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
    window.addEventListener('orientationchange', () => {
      setTimeout(handleResize, 100)
    })

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
      if (mount && renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement)
      }
      if (tshirtModel) {
        tshirtModel.traverse((child) => {
          if (child.geometry) child.geometry.dispose()
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose())
            } else {
              child.material.dispose()
            }
          }
        })
      }
      renderer.dispose()
    }
  }, [])

  // Listen for navbar upload button click
  useEffect(() => {
    const handleOpenModal = () => {
      setShowModal(true)
    }
    
    window.addEventListener('openUploadModal', handleOpenModal)
    
    return () => {
      window.removeEventListener('openUploadModal', handleOpenModal)
    }
  }, [])

  return (
    <>
      <main style={{ position: 'relative' }}>
        {/* Hero Section - Full Screen with Three.js Canvas */}
        <section className="hero-section" style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4rem 2rem',
          overflow: 'visible',
        }}>
          {/* Three.js Canvas Background - Fixed position */}
          <div ref={heroCanvasRef} style={{
            position: 'fixed',
            top: '70px',
            left: 0,
            right: 0, // use left/right instead of 100vw so it doesn't sit underneath the scrollbar
            height: 'calc(100vh - 70px)',
            zIndex: 0,
            willChange: 'transform',
            pointerEvents: 'none',
            background: `
              linear-gradient(to right, #ddd 1px, transparent 1px),
              linear-gradient(to bottom, #ddd 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px',
            backgroundColor: '#f5f5f5',
          }} />
          
          {/* Content Overlay */}
          <div style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {/* Stars in corners */}
            <div style={{
              position: 'absolute',
              top: '-8rem',
              left: '-10rem',
              fontSize: '8rem',
              color: '#ff6b8a',
              WebkitTextStroke: '3px #000',
              paintOrder: 'stroke',
              animation: 'rotateLeftRight 3s ease-in-out infinite',
              userSelect: 'none',
            }}>★</div>
            
            <div style={{
              position: 'absolute',
              top: '-8rem',
              right: '-10rem',
              fontSize: '8rem',
              color: '#4db8ff',
              WebkitTextStroke: '3px #000',
              paintOrder: 'stroke',
              animation: 'rotateLeftRight 3s ease-in-out infinite',
              animationDelay: '0.5s',
              userSelect: 'none',
            }}>★</div>
            
            <div style={{
              position: 'absolute',
              bottom: '-8rem',
              left: '-10rem',
              fontSize: '8rem',
              color: '#ffeb3b',
              WebkitTextStroke: '3px #000',
              paintOrder: 'stroke',
              animation: 'rotateLeftRight 3s ease-in-out infinite',
              animationDelay: '1s',
              userSelect: 'none',
            }}>★</div>
            
            <div style={{
              position: 'absolute',
              bottom: '-8rem',
              right: '-10rem',
              fontSize: '8rem',
              color: '#aed13a',
              WebkitTextStroke: '3px #000',
              paintOrder: 'stroke',
              animation: 'rotateLeftRight 3s ease-in-out infinite',
              animationDelay: '1.5s',
              userSelect: 'none',
            }}>★</div>
            
            <h1 style={{
              fontSize: 'clamp(2rem, 8vw, 5rem)',
              fontWeight: '900',
              textAlign: 'center',
              marginBottom: '2rem',
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              filter: 'blur(0.5px)',
              fontFamily: 'Trebuchet MS, Arial Black, Impact, sans-serif',
            }}>
              <span style={{
                color: '#ff6b8a',
                WebkitTextStroke: '2px #000',
                paintOrder: 'stroke',
              }}>Turn </span>
              <span style={{
                color: '#4db8ff',
                WebkitTextStroke: '2px #000',
                paintOrder: 'stroke',
              }}>your </span>
              <span style={{
                color: '#ffeb3b',
                WebkitTextStroke: '2px #000',
                paintOrder: 'stroke',
              }}>favorite </span>
              <span style={{
                color: '#b388ff',
                WebkitTextStroke: '2px #000',
                paintOrder: 'stroke',
              }}>clips</span>
              <br/>
              <span style={{
                color: '#ffb74d',
                WebkitTextStroke: '2px #000',
                paintOrder: 'stroke',
              }}>INTO </span>
              <span style={{
                color: '#aed13aff',
                WebkitTextStroke: '2px #000',
                paintOrder: 'stroke',
              }}>MERCH</span>
            </h1>
            <p style={{
              fontSize: '1.5rem',
              color: '#333',
              textAlign: 'center',
              marginBottom: '3rem',
              maxWidth: '600px',
            }}>
              Funny moments? Inside jokes? Marketable ideas? You can make merch for anything you can think of. In just one click.
            </p>
            <button 
              onClick={() => setShowModal(true)}
              style={{
                fontSize: '1.8rem',
                padding: '1.5rem 4rem',
                background: '#d97676',
                border: '4px solid #000',
                borderRadius: '50px',
                color: '#000',
                cursor: 'pointer',
                fontWeight: '800',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                boxShadow: '6px 6px 0px rgba(0, 0, 0, 0.2)',
                paintOrder: 'stroke',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#c96666'
                e.currentTarget.style.transform = 'translate(-2px, -2px)'
                e.currentTarget.style.boxShadow = '8px 8px 0px rgba(0, 0, 0, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#d97676'
                e.currentTarget.style.transform = 'translate(0, 0)'
                e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
              }}>
              Upload Video
            </button>
          </div>
        </section>

        {/* Star Marquee Bar */}
        <section style={{
          background: '#fff',
          padding: '1rem 0',
          borderTop: '3px solid #000',
          borderBottom: '3px solid #000',
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'inline-block',
            animation: 'marquee 20s linear infinite',
            fontSize: '4rem',
            whiteSpace: 'nowrap',
          }}>
            <span style={{ color: '#ff6b8a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#4db8ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffeb3b', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#b388ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffb74d', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#aed13a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ff6b8a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#4db8ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffeb3b', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#b388ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffb74d', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#aed13a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ff6b8a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#4db8ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffeb3b', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#b388ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffb74d', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#aed13a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ff6b8a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#4db8ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffeb3b', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#b388ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffb74d', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#aed13a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ff6b8a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#4db8ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffeb3b', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#b388ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffb74d', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#aed13a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ff6b8a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#4db8ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffeb3b', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#b388ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffb74d', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#aed13a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ff6b8a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#4db8ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffeb3b', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#b388ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffb74d', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#aed13a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ff6b8a', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#4db8ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffeb3b', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#b388ff', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#ffb74d', margin: '0 1rem' }}>★</span>
            <span style={{ color: '#aed13a', margin: '0 1rem' }}>★</span>
          </div>
        </section>

        {/* How to Use Section */}
        <section style={{
          background: 'transparent',
          padding: '4rem 2rem 2rem 2rem',
          position: 'relative',
          zIndex: 2,
        }}>
          <h1 style={{
            fontSize: 'clamp(2rem, 8vw, 5rem)',
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: '3rem',
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            filter: 'blur(0.5px)',
            fontFamily: 'Trebuchet MS, Arial Black, Impact, sans-serif',
          }}>
            <span style={{
              color: '#ff6b8a',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke',
            }}>How </span>
            <span style={{
              color: '#4db8ff',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke',
            }}>to </span>
            <span style={{
              color: '#ffeb3b',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke',
            }}>use:</span>
          </h1>
        </section>

        {/* Three Cards Section */}
        <section className="three-cards-section" style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '0',
          background: '#fff',
          borderTop: '3px solid #000',
          borderBottom: '3px solid #000',
          borderLeft: '3px solid #000',
          borderRight: '3px solid #000',
          margin: '0 2rem 4rem 2rem',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Card 1 - Grid Background */}
          <div className="card" style={{
            flex: '1',
            padding: '4rem 2rem',
            backgroundColor: '#f5f5f5',
            borderRight: '3px solid #000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '500px',
            position: 'relative',
          }}>
            {/* Step Header */}
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '900',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              color: '#ff6b8a',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke',
            }}>Step 1:</h2>
            
            {/* Image placeholder circle */}
            <div style={{
              width: '200px',
              height: '200px',
              background: '#fff',
              border: '4px solid #000',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              marginTop: '2rem',
            }}>
              {/* Add your image here */}
              📹
            </div>
            
            {/* Button at bottom */}
            <button style={{
              padding: '1rem 3rem',
              background: '#fff9c4',
              border: '3px solid #000',
              borderRadius: '50px',
              fontSize: '1.3rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
              marginBottom: '2rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)'
              e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.2)'
            }}>
              Upload
            </button>
          </div>

          {/* Card 2 - Grid Background */}
          <div className="card" style={{
            flex: '1',
            padding: '4rem 2rem',
            backgroundColor: '#f5f5f5',
            borderRight: '3px solid #000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '500px',
            position: 'relative',
          }}>
            {/* Step Header */}
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '900',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              color: '#4db8ff',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke',
            }}>Step 2:</h2>
            
            {/* Image placeholder circle */}
            <div style={{
              width: '200px',
              height: '200px',
              background: '#fff',
              border: '4px solid #000',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              marginTop: '2rem',
            }}>
              {/* Add your image here */}
              🎨
            </div>
            
            {/* Button at bottom */}
            <button style={{
              padding: '1rem 3rem',
              background: '#fff9c4',
              border: '3px solid #000',
              borderRadius: '50px',
              fontSize: '1.3rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
              marginBottom: '2rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)'
              e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.2)'
            }}>
              Customize
            </button>
          </div>

          {/* Card 3 - Grid Background */}
          <div className="card" style={{
            flex: '1',
            padding: '4rem 2rem',
            backgroundColor: '#f5f5f5',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            minHeight: '500px',
            position: 'relative',
          }}>
            {/* Step Header */}
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '900',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              color: '#ffeb3b',
              WebkitTextStroke: '2px #000',
              paintOrder: 'stroke',
            }}>Step 3:</h2>
            
            {/* Image placeholder circle */}
            <div style={{
              width: '200px',
              height: '200px',
              background: '#fff',
              border: '4px solid #000',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '4rem',
              marginTop: '2rem',
            }}>
              {/* Add your image here */}
              📦
            </div>
            
            {/* Button at bottom */}
            <button style={{
              padding: '1rem 3rem',
              background: '#fff9c4',
              border: '3px solid #000',
              borderRadius: '50px',
              fontSize: '1.3rem',
              fontWeight: '800',
              textTransform: 'uppercase',
              cursor: 'pointer',
              boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.2s ease',
              marginBottom: '2rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-2px, -2px)'
              e.currentTarget.style.boxShadow = '6px 6px 0px rgba(0, 0, 0, 0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(0, 0)'
              e.currentTarget.style.boxShadow = '4px 4px 0px rgba(0, 0, 0, 0.2)'
            }}>
              Receive
            </button>
          </div>
        </section>
      </main>

      {showModal && (
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
          zIndex: 1000,
        }}>
          <div style={{
            background: '#fff',
            border: '4px solid #000',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
            position: 'relative',
            boxShadow: '8px 8px 0px rgba(0, 0, 0, 0.3)',
          }}>
            {/* Logo in top left */}
            <img 
              src="/assets/main-logo.png" 
              alt="Logo" 
              style={{
                position: 'absolute',
                top: '1rem',
                left: '1rem',
                height: '32px',
                width: 'auto',
              }}
            />
            
            {/* Close button */}
            <button
              onClick={() => {
                if (playerRef.current && playerRef.current.updateInterval) {
                  clearInterval(playerRef.current.updateInterval)
                }
                if (localFile && videoUrl) {
                  URL.revokeObjectURL(videoUrl)
                }
                setShowModal(false)
                setVideoId('')
                setYoutubeUrl('')
                setVideoUrl('')
                setLocalFile(null)
                setSelectedFileName('')
                setTimestamp([1, 5])
                setCurrentTime(0)
                setIsDragging(false)
                setIsDraggingRange(false)
                setIsPaused(false)
              }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#000',
                border: '2px solid #000',
                color: '#fff',
                fontSize: '1.5rem',
                cursor: 'pointer',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'all 0.2s ease',
                fontWeight: 'bold',
                padding: 0,
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#4db8ff'
                e.currentTarget.style.borderColor = '#000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#000'
                e.currentTarget.style.borderColor = '#000'
              }}
            >
              ✕
            </button>

            <h2 style={{ 
              color: '#000', 
              marginBottom: '1.5rem', 
              marginTop: '2.5rem',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              filter: 'blur(0.5px)',
              fontFamily: 'Trebuchet MS, Arial Black, Impact, sans-serif',
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
            }}>Select Video Frame</h2>
            
            {/* Video source dropdown */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                color: '#000', 
                display: 'block', 
                marginBottom: '0.5rem',
                fontWeight: '600',
              }}>
                Video Source
              </label>
              <select
                value={videoSource}
                onChange={(e) => {
                  setVideoSource(e.target.value)
                  setYoutubeUrl('')
                  setVideoId('')
                }}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#fff',
                  border: '2px solid #000',
                  borderRadius: '8px',
                  color: '#000',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: '700',
                  fontFamily: "'mono45-headline', monospace, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
                }}>
                <option value="youtube" style={{ background: '#fff' }}>YouTube Shorts</option>
                <option value="tiktok" style={{ background: '#fff' }}>TikTok</option>
                <option value="instagram" style={{ background: '#fff' }}>Instagram Reels</option>
                <option value="local" style={{ background: '#fff' }}>Upload Local File</option>
              </select>
            </div>

            {videoSource === 'local' ? (
              /* Local file upload */
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  color: '#000', 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                }}>
                  Upload Video File
                </label>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <label style={{
                    padding: '0.75rem 1.5rem',
                    background: '#d97676',
                    border: '2px solid #000',
                    borderRadius: '8px',
                    color: '#000',
                    fontSize: '1rem',
                    fontWeight: '800',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease',
                    boxShadow: '3px 3px 0px rgba(0, 0, 0, 0.2)',
                    whiteSpace: 'nowrap',
                    textTransform: 'uppercase',
                  }}>
                    Choose File
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSelectedFileName(e.target.files[0].name)
                          handleLocalFileLoad(e.target.files[0])
                        }
                      }}
                      style={{
                        display: 'none',
                      }}
                    />
                  </label>
                  <span style={{
                    flex: 1,
                    color: '#666',
                    fontSize: '0.9rem',
                    fontStyle: selectedFileName ? 'normal' : 'italic',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {selectedFileName || 'No file chosen'}
                  </span>
                </div>
              </div>
            ) : (
              /* URL input for YouTube, TikTok, Instagram */
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  color: '#000', 
                  display: 'block', 
                  marginBottom: '0.5rem',
                  fontWeight: '600',
                }}>
                  {videoSource === 'youtube' && 'YouTube Shorts URL'}
                  {videoSource === 'tiktok' && 'TikTok URL'}
                  {videoSource === 'instagram' && 'Instagram Reels URL'}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder={
                      videoSource === 'youtube' ? 'https://www.youtube.com/shorts/...' :
                      videoSource === 'tiktok' ? 'https://www.tiktok.com/@user/video/...' :
                      'https://www.instagram.com/reels/...'
                    }
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      background: '#fff',
                      border: '2px solid #000',
                      borderRadius: '8px',
                      color: '#000',
                      fontSize: '1rem',
                      fontWeight: '700',
                      fontFamily: "'mono45-headline', monospace, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
                    }}
                  />
                  <button
                    onClick={handleLoadVideo}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#b388ff',
                      border: '2px solid #000',
                      borderRadius: '8px',
                      color: '#000',
                      cursor: 'pointer',
                      fontWeight: '800',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#a370ee'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#b388ff'
                    }}>
                    Load
                  </button>
                </div>
                {videoSource === 'tiktok' && (
                  <p style={{ 
                    color: '#666', 
                    fontSize: '0.875rem', 
                    marginTop: '0.5rem',
                    fontStyle: 'italic'
                  }}>
                    Note: Use TikTok's player to find your timestamp, then enter it manually in the inputs below.
                  </p>
                )}
                {videoSource === 'instagram' && (
                  <p style={{ 
                    color: '#666', 
                    fontSize: '0.875rem', 
                    marginTop: '0.5rem',
                    fontStyle: 'italic'
                  }}>
                    Note: Use Instagram's player to find your timestamp, then enter it manually in the inputs below.
                  </p>
                )}
              </div>
            )}

            {(videoId || videoUrl) && (
              <>
                <div style={{ 
                  marginBottom: '1.5rem',
                  ...(videoSource === 'instagram' || videoSource === 'tiktok' ? {
                    height: '600px',
                    overflow: 'hidden',
                    borderRadius: '8px',
                    background: '#000'
                  } : {})
                }}>
                  {videoSource === 'youtube' ? (
                    <div id="youtube-player" style={{ width: '100%', height: '400px' }}></div>
                  ) : videoSource === 'tiktok' ? (
                    <iframe
                      src={videoUrl}
                      style={{ 
                        width: '100%', 
                        height: '100%',
                        border: 'none',
                      }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : videoSource === 'instagram' ? (
                    <iframe
                      src={videoUrl}
                      style={{ 
                        width: '100%', 
                        height: '800px',
                        border: 'none',
                        marginTop: '-100px'
                      }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      scrolling="no"
                    />
                  ) : (
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      style={{ 
                        width: '100%', 
                        height: '400px',
                        background: '#000',
                        borderRadius: '8px'
                      }}
                      controls
                    />
                  )}
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <label style={{ 
                      color: '#000',
                      fontWeight: '600',
                    }}>
                      Select Time
                    </label>
                    {videoSource !== 'instagram' && videoSource !== 'tiktok' && (
                      <button
                        onClick={handlePlayPause}
                        style={{
                          padding: '0.5rem 1rem',
                          background: isPaused ? '#ffeb3b' : '#f0f0f0',
                          border: '2px solid #000',
                          borderRadius: '8px',
                          color: '#000',
                          cursor: 'pointer',
                          fontWeight: '800',
                          fontSize: '0.9rem',
                          transition: 'all 0.2s ease',
                          textTransform: 'uppercase',
                        }}>
                        {isPaused ? '▶ Play' : '⏸ Pause'}
                      </button>
                    )}
                  </div>

                  {/* Selection mode radio buttons */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '1.5rem', 
                    marginBottom: '1rem',
                    padding: '0.75rem',
                    background: '#f5f5f5',
                    borderRadius: '8px',
                    border: '2px solid #000',
                  }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      color: '#000',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                    }}>
                      <input
                        type="radio"
                        value="single"
                        checked={selectionMode === 'single'}
                        onChange={(e) => {
                          setSelectionMode(e.target.value)
                          setTimestamp([timestamp[0], timestamp[0]])
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      Single Frame
                    </label>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '0.5rem', 
                      color: '#000',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                    }}>
                      <input
                        type="radio"
                        value="range"
                        checked={selectionMode === 'range'}
                        onChange={(e) => {
                          setSelectionMode(e.target.value)
                          if (timestamp[0] === timestamp[1]) {
                            setTimestamp([timestamp[0], timestamp[0] + 5])
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      Time Range
                    </label>
                  </div>
                  
                  {/* Visual timeline with current playhead - hidden for iframe sources */}
                  {videoSource !== 'instagram' && videoSource !== 'tiktok' && (
                    <>
                      <div 
                        ref={timelineRef}
                        style={{ 
                          position: 'relative', 
                          height: '80px', 
                          background: 'linear-gradient(90deg, rgba(255, 107, 138, 0.4) 0%, rgba(77, 184, 255, 0.4) 16.67%, rgba(255, 235, 59, 0.4) 33.33%, rgba(179, 136, 255, 0.4) 50%, rgba(255, 183, 77, 0.4) 66.67%, rgba(174, 209, 58, 0.4) 83.33%, rgba(255, 107, 138, 0.4) 100%)',
                          borderRadius: '20px',
                          border: '3px solid #000',
                          marginBottom: '0.5rem',
                          cursor: isDraggingRange ? 'grabbing' : 'default',
                          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                        }}
                        onMouseMove={handleRangeMouseMove}
                        onMouseUp={handleRangeMouseUp}
                        onMouseLeave={handleRangeMouseUp}
                      >
                        {/* Selected range/point highlight */}
                        {selectionMode === 'range' ? (
                          <div 
                            onMouseDown={handleRangeMouseDown}
                            style={{
                              position: 'absolute',
                              left: `${(timestamp[0] / duration) * 100}%`,
                              width: `${((timestamp[1] - timestamp[0]) / duration) * 100}%`,
                              height: '100%',
                              background: '#fff',
                              borderLeft: '4px solid #000',
                              borderRight: '4px solid #000',
                              borderRadius: '16px',
                              cursor: isDraggingRange ? 'grabbing' : 'grab',
                              userSelect: 'none',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                            }}
                          />
                        ) : (
                          <div style={{
                            position: 'absolute',
                            left: `${(timestamp[0] / duration) * 100}%`,
                            width: '5px',
                            height: '100%',
                            background: '#000',
                            boxShadow: '0 0 12px rgba(0, 0, 0, 0.6)',
                            borderRadius: '2px',
                          }}></div>
                        )}
                        
                        {/* Current playhead */}
                      <div style={{
                        position: 'absolute',
                        left: `${(currentTime / duration) * 100}%`,
                        width: '4px',
                        height: '100%',
                        background: '#000',
                        borderRadius: '3px',
                        zIndex: 2,
                      }}></div>
                    </div>
                    
                    {/* Drag instruction below timeline - only show in range mode */}
                    {selectionMode === 'range' && (
                      <div style={{
                        textAlign: 'center',
                        color: '#666',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        fontStyle: 'italic',
                        marginBottom: '1rem',
                      }}>
                        Drag the highlighted area to move your selection
                      </div>
                    )}
                  </>
                  )}

                  {/* For iframe sources, show instruction and manual input only */}
                  {(videoSource === 'instagram' || videoSource === 'tiktok') && (
                    <div style={{ 
                      padding: '1rem',
                      background: '#f5f5f5',
                      borderRadius: '8px',
                      border: '2px solid #000',
                      marginBottom: '1rem'
                    }}>
                      <p style={{ 
                        color: '#000', 
                        marginBottom: '0.5rem',
                        fontSize: '0.9rem',
                        lineHeight: '1.4',
                        fontWeight: '700',
                      }}>
                        <strong>How to select a timestamp:</strong>
                      </p>
                      <p style={{ 
                        color: '#333', 
                        fontSize: '0.85rem',
                        lineHeight: '1.4'
                      }}>
                        1. Use the player above to find your desired moment<br/>
                        2. Note the time shown in the player<br/>
                        3. Enter that time (in seconds) in the input fields below
                      </p>
                    </div>
                  )}

                  {selectionMode === 'single' ? (
                    /* Single time slider */
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        marginBottom: '0.5rem' 
                      }}>
                        <label style={{ 
                          color: '#000', 
                          fontSize: '0.9rem',
                          fontWeight: '600',
                        }}>
                          Time: {formatTime(timestamp[0])}
                        </label>
                        <input
                          type="number"
                          value={timestamp[0].toFixed(1)}
                          onChange={(e) => handleSingleTimeChange(parseFloat(e.target.value) || 1)}
                          step="0.1"
                          min="1"
                          max={duration}
                          style={{
                            width: '80px',
                            padding: '0.25rem 0.5rem',
                            background: '#fff',
                            border: '2px solid #000',
                            borderRadius: '4px',
                            color: '#000',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                          }}
                        />
                      </div>
                      {videoSource !== 'instagram' && videoSource !== 'tiktok' && (
                        <input
                          type="range"
                          min="1"
                          max={duration}
                          step="0.1"
                          value={timestamp[0]}
                          onChange={(e) => handleSingleTimeChange(parseFloat(e.target.value))}
                          onMouseDown={() => setIsDragging(true)}
                          onMouseUp={() => setIsDragging(false)}
                          onTouchStart={() => setIsDragging(true)}
                          onTouchEnd={() => setIsDragging(false)}
                          style={{
                            width: '100%',
                            height: '6px',
                            background: '#f5f5f5',
                            borderRadius: '4px',
                            outline: 'none',
                            cursor: 'pointer',
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Start time slider */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '0.5rem' 
                        }}>
                          <label style={{ 
                            color: '#000', 
                            fontSize: '0.9rem',
                            fontWeight: '600',
                          }}>
                            Start: {formatTime(timestamp[0])}
                          </label>
                          <input
                            type="number"
                            value={timestamp[0].toFixed(1)}
                            onChange={(e) => handleTimeInputChange(0, e.target.value)}
                            step="0.1"
                            min="1"
                            max={duration}
                            style={{
                              width: '80px',
                              padding: '0.25rem 0.5rem',
                              background: '#fff',
                              border: '2px solid #000',
                              borderRadius: '4px',
                              color: '#000',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                            }}
                          />
                        </div>
                        {videoSource !== 'instagram' && videoSource !== 'tiktok' && (
                          <input
                            type="range"
                            min="1"
                            max={duration}
                            step="0.1"
                            value={timestamp[0]}
                            onChange={(e) => handleStartChange(parseFloat(e.target.value))}
                            onMouseDown={() => setIsDragging(true)}
                            onMouseUp={() => setIsDragging(false)}
                            onTouchStart={() => setIsDragging(true)}
                            onTouchEnd={() => setIsDragging(false)}
                            style={{
                              width: '100%',
                              height: '12px',
                              background: 'linear-gradient(90deg, rgba(255, 107, 138, 0.4) 0%, rgba(77, 184, 255, 0.4) 16.67%, rgba(255, 235, 59, 0.4) 33.33%, rgba(179, 136, 255, 0.4) 50%, rgba(255, 183, 77, 0.4) 66.67%, rgba(174, 209, 58, 0.4) 83.33%, rgba(255, 107, 138, 0.4) 100%)',
                              borderRadius: '8px',
                              border: '2px solid #000',
                              outline: 'none',
                              cursor: 'pointer',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                            }}
                          />
                        )}
                      </div>

                      {/* End time slider */}
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '0.5rem' 
                        }}>
                          <label style={{ 
                            color: '#000', 
                            fontSize: '0.9rem',
                            fontWeight: '600',
                          }}>
                            End: {formatTime(timestamp[1])}
                          </label>
                          <input
                            type="number"
                            value={timestamp[1].toFixed(1)}
                            onChange={(e) => handleTimeInputChange(1, e.target.value)}
                            step="0.1"
                            min="1"
                            max={duration}
                            style={{
                              width: '80px',
                              padding: '0.25rem 0.5rem',
                              background: '#fff',
                              border: '2px solid #000',
                              borderRadius: '4px',
                              color: '#000',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                            }}
                          />
                        </div>
                        {videoSource !== 'instagram' && videoSource !== 'tiktok' && (
                          <input
                            type="range"
                            min="1"
                            max={duration}
                            step="0.1"
                            value={timestamp[1]}
                            onChange={(e) => handleEndChange(parseFloat(e.target.value))}
                            onMouseDown={() => setIsDragging(true)}
                            onMouseUp={() => setIsDragging(false)}
                            onTouchStart={() => setIsDragging(true)}
                            onTouchEnd={() => setIsDragging(false)}
                            style={{
                              width: '100%',
                              height: '12px',
                              background: 'linear-gradient(90deg, rgba(255, 107, 138, 0.4) 0%, rgba(77, 184, 255, 0.4) 16.67%, rgba(255, 235, 59, 0.4) 33.33%, rgba(179, 136, 255, 0.4) 50%, rgba(255, 183, 77, 0.4) 66.67%, rgba(174, 209, 58, 0.4) 83.33%, rgba(255, 107, 138, 0.4) 100%)',
                              borderRadius: '8px',
                              border: '2px solid #000',
                              outline: 'none',
                              cursor: 'pointer',
                              appearance: 'none',
                              WebkitAppearance: 'none',
                            }}
                          />
                        )}
                      </div>
                    </>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    color: '#666',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                  }}>
                    {selectionMode === 'range' ? (
                      <>
                        <span>Duration: {formatTime(timestamp[1] - timestamp[0])}</span>
                        <span>Total: {formatTime(duration)}</span>
                      </>
                    ) : (
                      <>
                        <span>Selected: {formatTime(timestamp[0])}</span>
                        <span>Total: {formatTime(duration)}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Prompt Input */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ 
                    color: '#000', 
                    display: 'block', 
                    marginBottom: '0.5rem',
                    fontWeight: '600',
                  }}>
                    AI Prompt (Optional)
                  </label>
                  <textarea
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Describe what you want to generate from this video..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#fff',
                      border: '2px solid #000',
                      borderRadius: '8px',
                      color: '#000',
                      fontSize: '1rem',
                      fontWeight: '700',
                      fontFamily: "'mono45-headline', monospace, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
                      resize: 'vertical',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => {
                      // Clean up interval
                      if (playerRef.current && playerRef.current.updateInterval) {
                        clearInterval(playerRef.current.updateInterval)
                      }
                      // Clean up video URL
                      if (localFile && videoUrl) {
                        URL.revokeObjectURL(videoUrl)
                      }
                      setShowModal(false)
                      setVideoId('')
                      setYoutubeUrl('')
                      setVideoUrl('')
                      setLocalFile(null)
                      setSelectedFileName('')
                      setTimestamp([1, 5])
                      setCurrentTime(0)
                      setIsDragging(false)
                      setIsDraggingRange(false)
                      setIsPaused(false)
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#ffb74d',
                      border: '2px solid #000',
                      borderRadius: '8px',
                      color: '#000',
                      cursor: 'pointer',
                      fontWeight: '800',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ee9f35'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffb74d'
                    }}>
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#aed13a',
                      border: '2px solid #000',
                      borderRadius: '8px',
                      color: '#000',
                      cursor: 'pointer',
                      fontWeight: '800',
                      transition: 'all 0.2s ease',
                      textTransform: 'uppercase',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#9bc025'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#aed13a'
                    }}>
                    Confirm
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Loading Screen Game */}
      {isUploading && <LoadingGame />}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes rotateLeftRight {
          0% { transform: rotate(-15deg); }
          50% { transform: rotate(15deg); }
          100% { transform: rotate(-15deg); }
        }

        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Hero Section - Always full screen minus navbar */
        .hero-section {
          height: calc(100vh - 70px);
          max-height: calc(100vh - 70px);
          min-height: calc(100vh - 70px);
        }

        /* Mobile Landscape - reduce hero padding and allow content to fit */
        @media (max-height: 600px) and (orientation: landscape) {
          .hero-section {
            padding: 2rem 1rem !important;
            min-height: auto !important;
            height: auto !important;
            max-height: none !important;
          }
          
          .hero-section h1 {
            font-size: clamp(3rem, 8vw, 5rem) !important;
            margin-bottom: 1rem !important;
          }
          
          .hero-section p {
            font-size: 1rem !important;
            margin-bottom: 1.5rem !important;
          }
          
          .hero-section button {
            font-size: 1.2rem !important;
            padding: 1rem 2rem !important;
          }
        }

        /* Tablet/Small Desktop - Adjust hero for medium screens */
        @media (min-height: 601px) and (max-height: 800px) {
          .hero-section {
            padding: 3rem 2rem !important;
          }
          
          .hero-section h1 {
            font-size: clamp(2rem, 10vw, 4rem) !important;
            margin-bottom: 1.5rem !important;
          }
          
          .hero-section p {
            font-size: 1.2rem !important;
            margin-bottom: 2rem !important;
          }
        }

        /* Three Cards Section Responsive */
        @media (max-height: 600px) and (orientation: landscape) {
          .card {
            padding: 2rem 1rem !important;
            min-height: 350px !important;
          }

          .card > div:first-child {
            width: 120px !important;
            height: 120px !important;
            font-size: 2.5rem !important;
          }
        }

        /* Mobile/Portrait Mode - Stack cards vertically */
        @media (max-width: 768px), (orientation: portrait) {
          .three-cards-section {
            flex-direction: column !important;
          }

          .card {
            border-right: none !important;
            border-bottom: 3px solid #000 !important;
          }

          .card:last-child {
            border-bottom: none !important;
          }
        }
      `}</style>
    </>
  )
}

