import React, { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

// Determine mobile at module level using matchMedia (no resize listener needed)
const isMobile = () => window.matchMedia('(max-width: 768px)').matches

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const [mobile, setMobile] = useState(isMobile())

  useEffect(() => {
    const toggleVisible = () => {
      setVisible(document.documentElement.scrollTop > window.innerHeight)
    }

    const mql = window.matchMedia('(max-width: 768px)')
    const handleMediaChange = (e) => setMobile(e.matches)

    window.addEventListener('scroll', toggleVisible, { passive: true })
    mql.addEventListener('change', handleMediaChange)

    return () => {
      window.removeEventListener('scroll', toggleVisible)
      mql.removeEventListener('change', handleMediaChange)
    }
  }, [])

  if (!visible) return null

  return (
    <>
      <style>{`
        .scroll-to-top-btn {
          display: flex;
          position: fixed;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          align-items: center;
          justify-content: center;
          border: none;
          cursor: pointer;
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.4);
        }
        .scroll-to-top-btn:hover {
          transform: translateY(-5px) scale(1.05);
          box-shadow: 0 15px 30px rgba(37, 99, 235, 0.6);
        }
      `}</style>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="scroll-to-top-btn"
        style={{
          bottom: mobile ? '80px' : '40px',
          right: mobile ? '20px' : '40px',
          width: mobile ? '44px' : '50px',
          height: mobile ? '44px' : '50px',
        }}
        title="Scroll to Top"
      >
        <ArrowUp size={mobile ? 20 : 24} />
      </button>
    </>
  )
}
