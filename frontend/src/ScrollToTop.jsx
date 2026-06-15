import React, { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

  useEffect(() => {
    const toggleVisible = () => {
      const scrolled = document.documentElement.scrollTop;
      if (scrolled > window.innerHeight){
        setVisible(true)
      } 
      else {
        setVisible(false)
      }
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    window.addEventListener('scroll', toggleVisible);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', toggleVisible);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const scrollToTop = () =>{
    window.scrollTo({
      top: 0, 
      behavior: 'smooth'
    });
  };

  if (!visible) return null

  return (
    <button 
      onClick={scrollToTop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        position: 'fixed',
        bottom: isMobile ? '80px' : '40px',
        right: isMobile ? '20px' : '40px',
        width: isMobile ? '44px' : '50px',
        height: isMobile ? '44px' : '50px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        color: 'white',
        alignItems: 'center',
        justifyContent: 'center',
        border: 'none',
        cursor: 'pointer',
        boxShadow: isHovered ? '0 15px 30px rgba(37, 99, 235, 0.6)' : '0 10px 25px rgba(37, 99, 235, 0.4)',
        zIndex: 1000,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-5px) scale(1.05)' : 'translateY(0) scale(1)',
      }}
      title="Scroll to Top"
    >
      <ArrowUp size={isMobile ? 20 : 24} />
    </button>
  )
}
