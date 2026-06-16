import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, ArrowLeft, Mail, Lock, ChevronRight, User, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5001';
      const res = await fetch(`${apiBase}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.message || 'Login failed')
      }

      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      navigate(`/${data.user.role}`)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setEmail('')
    setPassword('')
    setError('')
  }

  return (
    <div className="login-page-container">
      <style>{`
        .login-page-container {
          min-height: 100vh;
          overflow-y: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%);
          padding: 20px 10px;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          box-sizing: border-box;
          position: relative;
        }
        
        .login-back-btn {
          position: absolute;
          top: 24px;
          left: 24px;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #1e293b;
          font-weight: 700;
          font-size: 13px;
          background: #ffffff;
          padding: 8px 16px;
          border-radius: 50px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
          z-index: 10;
        }

        .login-back-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
          color: #003DA5;
        }
        
        .login-card {
          display: flex;
          width: 90%;
          max-width: 1000px;
          height: 520px;
          background: #ffffff;
          border-radius: 36px;
          box-shadow: 0 20px 50px rgba(0, 5, 20, 0.08);
          overflow: hidden;
          box-sizing: border-box;
        }
        
        .login-left {
          width: 52%;
          background: url('/blue.png') right center / cover no-repeat;
          padding: 48px;
          display: flex;
          flex-direction: column;
          position: relative;
          box-sizing: border-box;
        }
        
        .login-right {
          width: 48%;
          background: #ffffff;
          padding: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
        }
        
        .login-form-wrapper {
          width: 100%;
          max-width: 350px;
        }
        
        .solid-logo-card {
          background: #ffffff;
          border-radius: 20px;
          padding: 20px 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          align-self: flex-start;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
        }

        .login-logo-img {
          height: 56px;
          width: auto;
        }
        
        .branding-text-container {
          margin: auto 0;
        }

        .login-brand-title {
          font-size: 48px;
          font-weight: 800;
          line-height: 1.15;
          color: #ffffff;
          letter-spacing: -1.5px;
          margin: 0 0 10px 0;
        }

        .login-brand-subtitle {
          font-size: 20px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
          margin: 0;
        }
        
        .login-pill-input-group {
          margin-bottom: 16px;
        }
        
        .login-field-label {
          display: block;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 750;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .login-pill-input-container {
          display: flex;
          align-items: center;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 50px;
          padding: 0 16px;
          height: 46px;
          transition: all 0.2s ease;
        }
        
        .login-pill-input-container:focus-within {
          border-color: #003DA5;
          box-shadow: 0 0 0 3px rgba(0, 61, 165, 0.12);
          background: #ffffff;
        }
        
        .login-pill-icon {
          color: #94a3b8;
          margin-right: 10px;
          flex-shrink: 0;
          transition: color 0.2s ease;
        }
        
        .login-pill-input-container:focus-within .login-pill-icon {
          color: #003DA5;
        }
        
        .login-pill-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          height: 100%;
          font-size: 14px;
          color: #0f172a;
          font-weight: 550;
        }
        
        .login-pill-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
        }
        
        .login-btn-primary {
          background: linear-gradient(135deg, #003DA5 0%, #002B73 100%);
          color: #ffffff;
          border: none;
          border-radius: 50px;
          height: 46px;
          font-size: 14.5px;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s ease;
          box-shadow: 0 4px 10px rgba(0, 61, 165, 0.2);
        }
        
        .login-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 61, 165, 0.3);
          opacity: 0.95;
        }
        
        .login-btn-primary:active {
          transform: translateY(0);
        }
        
        .login-btn-secondary {
          background: #ffffff;
          color: #003DA5;
          border: 1.5px solid #003DA5;
          border-radius: 50px;
          height: 46px;
          font-size: 14.5px;
          font-weight: 750;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        
        .login-btn-secondary:hover {
          background: rgba(0, 61, 165, 0.04);
        }
        
        .login-btn-secondary:active {
          background: rgba(0, 61, 165, 0.08);
        }

        .login-btn-row {
          display: flex;
          gap: 12px;
        }
        
        .login-forgot-link {
          color: #003DA5;
          font-size: 12.5px;
          font-weight: 600;
          text-decoration: none;
          display: inline-block;
          margin-top: 12px;
          transition: color 0.2s ease;
        }
        
        .login-forgot-link:hover {
          color: #002B73;
          text-decoration: underline;
        }
        
        @media (max-width: 1024px) {
          .login-card {
            max-width: 900px;
          }
          .login-left {
            padding: 36px;
          }
          .login-right {
            padding: 36px;
          }
          .login-brand-title {
            font-size: 38px;
          }
        }
        
        @media (max-width: 768px) {
          .login-back-btn {
            display: none;
          }
          .login-page-container {
            min-height: 100vh;
            overflow-y: auto;
            padding: 24px 12px;
          }
          .login-card {
            flex-direction: column;
            border-radius: 24px;
            height: auto;
            max-height: calc(100vh - 24px);
            width: 92%;
            max-width: 420px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
          }
          .login-left {
            width: 100%;
            height: 130px;
            min-height: 130px;
            padding: 16px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background-position: center center !important;
          }
          .solid-logo-card {
            padding: 6px 12px !important;
            align-self: center !important;
            display: flex !important;
            justify-content: center !important;
            border-radius: 12px !important;
          }
          .login-logo-img {
            height: 28px !important;
          }
          .branding-text-container {
            margin: 0 !important;
            text-align: center !important;
            align-items: center !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .login-brand-title {
            font-size: 16px !important;
            text-align: center !important;
            letter-spacing: -0.3px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            font-weight: 750 !important;
          }
          .login-brand-subtitle {
            display: block !important;
            font-size: 12px !important;
            text-align: center !important;
            color: rgba(255, 255, 255, 0.8) !important;
            margin-top: 2px !important;
          }
          .login-right {
            width: 100%;
            padding: 24px 20px !important;
          }
          .login-form-wrapper {
            max-width: 100%;
          }
          .login-pill-input-group {
            margin-bottom: 12px !important;
          }
          .login-pill-input-container {
            height: 40px !important;
          }
          .login-btn-primary, .login-btn-secondary {
            height: 40px !important;
            font-size: 13.5px !important;
          }
        }

        @media (max-width: 480px) {
          .login-btn-row {
            flex-direction: column;
            gap: 10px;
          }
          .login-btn-primary, .login-btn-secondary {
            width: 100%;
            flex: none !important;
          }
        }
      `}</style>

      <Link to="/" className="login-back-btn">
        <ArrowLeft size={14} /> Back to Site
      </Link>

      <div className="login-card">
        {/* Left Side: Branding */}
        <div className="login-left">
          <div className="solid-logo-card">
            <img src="/ltc.png" alt="LTC Logo" className="login-logo-img" />
          </div>

          <div className="branding-text-container">
            <h1 className="login-brand-title">
              Life Transformation Centre
            </h1>
            <p className="login-brand-subtitle">
              Administration System
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="login-right">
          <div className="login-form-wrapper">
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '800', color: '#002B73', margin: 0, letterSpacing: '-0.5px' }}>
                Login
              </h2>
              <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>
                Please login to your account
              </p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', padding: '10px', borderRadius: '12px', color: '#b91c1c', marginBottom: '20px', fontSize: '13.5px', textAlign: 'center', fontWeight: '600' }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin}>
              <div className="login-pill-input-group">
                <label className="login-field-label">Email Address</label>
                <div className="login-pill-input-container">
                  <User className="login-pill-icon" size={18} />
                  <input 
                    type="email" 
                    className="login-pill-input" 
                    placeholder="Enter email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-pill-input-group" style={{ marginBottom: '24px' }}>
                <label className="login-field-label">Password</label>
                <div className="login-pill-input-container">
                  <Lock className="login-pill-icon" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="login-pill-input" 
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'none', border: 'none', padding: '0 4px', display: 'flex', alignItems: 'center', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="login-btn-row">
                <button type="submit" className="login-btn-primary" style={{ flex: 2 }} disabled={loading}>
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
                <button type="button" className="login-btn-secondary" style={{ flex: 1 }} onClick={handleReset}>
                  Reset
                </button>
              </div>
            </form>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <a href="#" className="login-forgot-link">
                Forgot Password?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
