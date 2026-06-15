import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, ClipboardList, PenTool, LayoutDashboard, Flag, Search, LogOut, MessageSquare, Bell, Menu, Clock, RefreshCw, Sparkles, Rocket, ChevronRight, Sun, X, FileText } from 'lucide-react'
import ScrollToTop from './ScrollToTop'
import TimetablePanel from './TimetablePanel'

const SQUAD_COLORS = {
  Surya: '#f59e0b', Chandra: '#8b5cf6', Mangal: '#ef4444', Budh: '#10b981',
  Guru: '#f97316', Shukra: '#ec4899', Shani: '#64748b', Rahu: '#1e293b',
  Ketu: '#06b6d4', Agni: '#dc2626'
}

const MUTED_SQUAD_COLORS = {
  Surya: '#9f6e4a',    // Soft brownish / terracotta
  Chandra: '#5f4b8b',  // Soft muted purple
  Mangal: '#a64f4f',   // Muted soft red
  Budh: '#2d6a4f',     // Soft forest green
  Guru: '#b27a37',     // Soft ochre/bronze
  Shukra: '#b05c7e',   // Soft muted rose
  Shani: '#4a5568',    // Soft slate gray
  Rahu: '#2b3a67',     // Soft indigo/navy
  Ketu: '#2a7b7b',     // Soft muted teal/cyan
  Agni: '#a35246'      // Soft burnt sienna
}

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [myData, setMyData] = useState({})
  const [squadFaculty, setSquadFaculty] = useState([])
  const [schedules, setSchedules] = useState([])
  const [attendance, setAttendance] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [scheduleSearch, setScheduleSearch] = useState('')
  const [feedbackText, setFeedbackText] = useState('')
  const [feedbackCategory, setFeedbackCategory] = useState('General')
  const [additionalNotes, setAdditionalNotes] = useState('')
  const [showReveal, setShowReveal] = useState(false)
  const [revealStep, setRevealStep] = useState(1)
  const [undertakingForm, setUndertakingForm] = useState({
    signedName: '',
    signedDate: new Date().toISOString().split('T')[0]
  })
  const [submittingUndertaking, setSubmittingUndertaking] = useState(false)
  
  const filteredSchedules = schedules.filter(s => 
    s.title.toLowerCase().includes(scheduleSearch.toLowerCase()) || 
    s.date.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
    s.time.toLowerCase().includes(scheduleSearch.toLowerCase())
  )

  const [readScheduleIds, setReadScheduleIds] = useState(() => {
    return JSON.parse(localStorage.getItem('readScheduleIds') || '[]')
  })
  const [isNotifOpen, setIsNotifOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
      if (window.innerWidth > 768) setIsSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const unreadSchedules = schedules.filter(s => !readScheduleIds.includes(s.id))
  const unreadCount = unreadSchedules.length

  const markAsRead = (id) => {
    const updated = [...readScheduleIds, id]
    setReadScheduleIds(updated)
    localStorage.setItem('readScheduleIds', JSON.stringify(updated))
  }

  const markAllAsRead = () => {
    const allIds = schedules.map(e => e.id)
    setReadScheduleIds(allIds)
    localStorage.setItem('readScheduleIds', JSON.stringify(allIds))
  }

  const getCountdown = (dateStr, timeStr) => {
    try {
      const eventDate = new Date(`${dateStr}T${timeStr}`)
      const now = new Date()
      const diff = eventDate - now
      
      if (diff <= 0) return 'Started'
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      
      if (days > 0) return `${days}d ${hours}h`
      if (hours > 0) return `${hours}h ${minutes}m`
      return `${minutes}m`
    } catch (e) {
      return 'N/A'
    }
  }

  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/')
  }

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    if (!feedbackText.trim()) return alert('Please enter feedback.')
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          feedback_text: feedbackText,
          category: feedbackCategory,
          additional_notes: additionalNotes
        })
      })
      if (res.ok) {
        alert('Feedback submitted successfully!')
        setFeedbackText('')
        setFeedbackCategory('General')
        setAdditionalNotes('')
      }
    } catch (err) {
      alert('Failed to submit feedback.')
    }
  }

  const handleSubmitUndertaking = async (e) => {
    e.preventDefault()
    if (!undertakingForm.signedName.trim()) return alert('Please type your full name to sign the undertaking.')
    setSubmittingUndertaking(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/student/submit-undertaking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(undertakingForm)
      })
      if (res.ok) {
        alert('Undertaking signed and submitted successfully!')
        fetchDashboardData()
      } else {
        alert('Failed to submit undertaking.')
      }
    } catch (err) {
      alert('Error submitting undertaking.')
    } finally {
      setSubmittingUndertaking(false)
    }
  }

  const handlePrintUndertaking = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>LTC Participant Undertaking</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #0f172a; background: #ffffff; }
            .document { border: 2px solid #0f172a; border-radius: 16px; padding: 40px; max-width: 700px; margin: 0 auto; background: #ffffff; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #0f172a; padding-bottom: 20px; }
            .logo { height: 60px; margin-bottom: 12px; }
            h2 { font-size: 22px; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
            .subtitle { font-size: 13px; color: #64748b; margin-top: 6px; }
            .receipt { display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; padding: 20px; }
            .checkmark { font-size: 24px; color: #10b981; font-weight: bold; }
            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; text-align: left; width: 100%; margin-top: 20px; border: 1px dashed #cbd5e1; padding: 20px; border-radius: 12px; background: #f8fafc; }
            .label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 700; }
            .value { font-size: 14px; font-weight: 800; color: #0f172a; margin: 4px 0 0 0; }
            .sig { font-family: Georgia, serif; font-style: italic; font-size: 16px; }
            .code-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; font-size: 13.5px; color: #334155; line-height: 1.6; text-align: left; margin-bottom: 20px; }
            ol { margin: 0; padding-left: 20px; }
            li { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="document">
            <div class="header">
              <h2>LTC Participant Undertaking</h2>
              <div class="subtitle">Official Immersion Honor Code & Agreement</div>
            </div>
            
            <div class="code-box">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #0f172a;">LTC Honor Code & Conduct Policy</p>
              <p style="margin: 0 0 10px 0;">As a student representing my institution and participating in the Life Transformation Centre (LTC) program, I solemnly declare that:</p>
              <ol>
                <li>I will maintain <strong>100% attendance</strong> across all schedules, timetable activities, and physical sessions unless officially excused.</li>
                <li>I will actively engage and collaborate with my designated <strong>Squad Leader</strong> and <strong>Squad Faculty</strong> for all tasks and evaluation milestones.</li>
                <li>I will adhere to the official guidelines, timings, and code of conduct set by the LTC administration. Any breach of discipline is subject to warning/red flag actions.</li>
                <li>I understand that any violation of the code of conduct may lead to immediate disciplinary action, including suspension from the program.</li>
              </ol>
            </div>

            <div class="receipt">
              <div class="checkmark">✓ SIGNED UNDERTAKING RECORD</div>
              <div class="details-grid">
                <div>
                  <div class="label">Signed Signature</div>
                  <div class="value sig">${myData.undertaking_signed_name}</div>
                </div>
                <div>
                  <div class="label">Permanent Register Number (PRN)</div>
                  <div class="value" style="font-family: monospace;">${myData.prn}</div>
                </div>
                <div>
                  <div class="label">Submission Date</div>
                  <div class="value">${myData.undertaking_signed_date}</div>
                </div>
                <div>
                  <div class="label">Verification Status</div>
                  <div class="value" style="color: #10b981;">Verified Record</div>
                </div>
              </div>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  const renderNotifications = () => (
    <div style={{ position: 'relative' }}>
      <button className="btn btn-outline" style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setIsNotifOpen(!isNotifOpen)}>
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px' }}>
            {unreadCount}
          </span>
        )}
      </button>
      {isNotifOpen && (
        <div style={{ position: 'absolute', top: '45px', right: '0', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', width: '320px', zIndex: 100, overflow: 'hidden' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: 0 }}>Notifications</h3>
            {unreadCount > 0 && (
              <button 
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '12px', fontWeight: '600', cursor: 'pointer' }}
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {currentUser.red_flag && (
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'flex-start', background: '#fef2f2', position: 'relative' }}>
                <div style={{ width: '8px', height: '8px', background: '#e53e3e', borderRadius: '50%', marginTop: '5px', flexShrink: 0 }}></div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: '700', color: '#e53e3e', margin: '0 0 4px 0' }}>Alert</p>
                  <p style={{ fontSize: '12px', color: '#b91c1c', margin: 0 }}>You are red flagged by faculty.</p>
                </div>
              </div>
            )}
            {schedules.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                No upcoming events.
              </div>
            ) : (
              schedules.map(e => {
                const isRead = readScheduleIds.includes(e.id)
                return (
                  <div key={e.id} style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '12px', alignItems: 'flex-start', background: isRead ? 'transparent' : '#f8fafc', position: 'relative' }}>
                    {!isRead && (
                      <div style={{ width: '8px', height: '8px', background: '#2563eb', borderRadius: '50%', marginTop: '5px', flexShrink: 0 }}></div>
                    )}
                    <div style={{ flex: 1, paddingLeft: isRead ? '20px' : '0' }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#0f172a', margin: '0 0 4px 0' }}>{e.title || 'Event'}</p>
                      <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{e.date} at {e.time}</p>
                      <p style={{ fontSize: '11px', color: '#e53e3e', fontWeight: '700', marginTop: '4px' }}>
                        ⏳ Starts in: {getCountdown(e.date, e.time)}
                      </p>
                    </div>
                    {!isRead && (
                      <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '11px', cursor: 'pointer' }} onClick={() => markAsRead(e.id)}>
                        Read
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'student') {
      navigate('/login')
      return
    }
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/student/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        navigate('/login')
        return
      }
      const data = await res.json()
      if (res.ok) {
        setMyData(data.data || {})
        setSquadFaculty(data.squadFaculty || [])
        
        const mySquad = data.data?.squad;
        const studentId = currentUser?.id;
        if (mySquad && mySquad !== 'Not Assigned Yet' && studentId) {
          const key = `ltc_squad_revealed_${studentId}`;
          const alreadyRevealed = localStorage.getItem(key);
          if (alreadyRevealed !== 'true') {
            setShowReveal(true);
          }
        }
      }

      const schedRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/student/schedules`, { headers: { 'Authorization': `Bearer ${token}` } })
      const schedData = await schedRes.json()
      if (schedRes.ok) setSchedules(schedData.schedules || [])

      const attRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/student/attendance`, { headers: { 'Authorization': `Bearer ${token}` } })
      const attData = await attRes.json()
      if (attRes.ok) setAttendance(attData.attendance || [])

      const evalRes = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/student/evaluations`, { headers: { 'Authorization': `Bearer ${token}` } })
      const evalData = await evalRes.json()
      if (evalRes.ok) setEvaluations(evalData.evaluations || [])

    } catch (err) {
      console.error('Failed to fetch student data', err)
    }
  }

  const needsGate = myData.in_current_batch && (!myData.undertaking_submitted || !myData.insured);

  if (needsGate) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: 'sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '650px',
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          padding: '40px',
          color: '#ffffff'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', padding: '12px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '16px', marginBottom: '16px' }}>
              <ClipboardList size={32} style={{ color: '#6366f1' }} />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px', margin: 0 }}>LTC Onboarding Gate</h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px', lineHeight: '1.5', margin: '8px 0 0 0' }}>
              Congratulations! You have been selected for the active LTC batch. Before you can access your dashboard, you must submit your insurance details and sign the undertaking form.
            </p>
          </div>

          {/* Progress / Checklist */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div style={{ 
              background: myData.insured ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.05)', 
              border: myData.insured ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.1)',
              borderRadius: '16px', padding: '16px', textAlign: 'center'
            }}>
              <p style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 4px 0' }}>Insurance Status</p>
              <h4 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: myData.insured ? '#22c55e' : '#ef4444' }}>
                {myData.insured ? 'Completed ✓' : 'Pending Action'}
              </h4>
            </div>
            <div style={{ 
              background: myData.undertaking_submitted ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.05)', 
              border: myData.undertaking_submitted ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid rgba(239, 68, 68, 0.1)',
              borderRadius: '16px', padding: '16px', textAlign: 'center'
            }}>
              <p style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600', margin: '0 0 4px 0' }}>Undertaking Status</p>
              <h4 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: myData.undertaking_submitted ? '#22c55e' : '#ef4444' }}>
                {myData.undertaking_submitted ? 'Completed ✓' : 'Pending Action'}
              </h4>
            </div>
          </div>

          {/* Form 1: Insurance Details */}
          {!myData.insured ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                <span style={{ background: '#6366f1', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>1</span>
                Submit Insurance Details
              </h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const provider = e.target.elements.provider.value.trim();
                const policyNumber = e.target.elements.policyNumber.value.trim();
                if (!provider || !policyNumber) return alert('Please enter both Insurance Provider and Policy Number.');
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/student/submit-insurance`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ provider, policy_number: policyNumber })
                  });
                  if (res.ok) {
                    alert('Insurance details submitted successfully!');
                    fetchDashboardData();
                  } else {
                    const errD = await res.json();
                    alert(errD.message || 'Failed to submit insurance details.');
                  }
                } catch (err) {
                  alert('Error submitting insurance details.');
                }
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Insurance Provider</label>
                  <input type="text" name="provider" placeholder="e.g. Star Health / LIC / HDFC Ergo" required 
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Policy / Certificate Number</label>
                  <input type="text" name="policyNumber" placeholder="e.g. POL123456789" required
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} />
                </div>
                <button type="submit" className="btn" style={{ background: '#6366f1', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                  Save & Submit Insurance
                </button>
              </form>
            </div>
          ) : null}

          {/* Form 2: Undertaking */}
          {myData.insured && !myData.undertaking_submitted ? (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 16px 0' }}>
                <span style={{ background: '#6366f1', color: 'white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>2</span>
                Sign LTC Undertaking Form
              </h3>
              <div style={{ 
                maxHeight: '120px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '12px', 
                borderRadius: '8px', fontSize: '11px', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '16px', border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: '700' }}>UNDERTAKING & CODE OF CONDUCT FOR LTC</p>
                <p style={{ margin: 0 }}>
                  I hereby solemnly declare and undertake that I will adhere to all the rules, guidelines, and disciplinary standard practices set forth by the LTC program coordinators. I acknowledge that I am solely responsible for my conduct, health, and belongings during the LTC batch. Any acts of insubordination or violation of rules will lead to immediate expulsion from the course and red flagging in the student database.
                </p>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const signedName = e.target.elements.signedName.value.trim();
                const agreed = e.target.elements.agreed.checked;
                if (!agreed) return alert('You must check the box to agree to the terms.');
                if (!signedName) return alert('Please enter your full name as signature.');
                
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/student/submit-undertaking`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ signedName, signedDate: new Date().toLocaleDateString() })
                  });
                  if (res.ok) {
                    alert('Undertaking signed and submitted successfully!');
                    fetchDashboardData();
                  } else {
                    const errD = await res.json();
                    alert(errD.message || 'Failed to submit undertaking.');
                  }
                } catch (err) {
                  alert('Error submitting undertaking.');
                }
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '16px' }}>
                  <input type="checkbox" name="agreed" id="agreed" required style={{ marginTop: '3px' }} />
                  <label htmlFor="agreed" style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.4' }}>
                    I agree to the LTC undertaking, rules, and code of conduct.
                  </label>
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>Full Name (Digital Signature)</label>
                  <input type="text" name="signedName" placeholder="Type your full name to sign" required
                    style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', outline: 'none' }} />
                </div>
                <button type="submit" className="btn" style={{ background: '#6366f1', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', fontWeight: '600', border: 'none', cursor: 'pointer' }}>
                  Sign & Submit Undertaking
                </button>
              </form>
            </div>
          ) : null}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <button className="btn btn-outline" style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#94a3b8', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }} onClick={handleLogout}>
              Logout
            </button>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Step {myData.insured ? '2 of 2' : '1 of 2'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-layout">
      {/* Sidebar Navigation */}
      {isMobile && isSidebarOpen && (
        <div 
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <div className="sidebar" style={{
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, left: 0, bottom: 0, zIndex: 1000,
        transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'none',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100vh',
        paddingTop: isMobile ? 'env(safe-area-inset-top)' : '0px',
        boxSizing: 'border-box'
      }}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand-container">
            <img src="/ltc.png" alt="LTC Logo" className="sidebar-brand-logo" />
          </div>
          {isMobile && (
            <button className="sidebar-close-btn" onClick={() => setIsSidebarOpen(false)} aria-label="Close Sidebar">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', padding: '8px 12px 0', display: 'block' }}>student</span>
          
          <p className="sidebar-section-label" style={{ paddingTop: '8px' }}>My Space</p>
          <button className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => { setActiveTab('dashboard'); if (isMobile) setIsSidebarOpen(false); }}>
            <span className="sidebar-item-content">
              <Flag size={16} />
              <span>My Overview</span>
            </span>
          </button>
          <button className={`sidebar-item ${activeTab === 'schedules' ? 'active' : ''}`} onClick={() => { setActiveTab('schedules'); if (isMobile) setIsSidebarOpen(false); }}>
            <span className="sidebar-item-content">
              <Calendar size={16} />
              <span>Activity Schedule</span>
            </span>
            {unreadCount > 0 && (
              <span className="sidebar-badge">{unreadCount}</span>
            )}
          </button>
          <button className={`sidebar-item ${activeTab === 'timetable' ? 'active' : ''}`} onClick={() => { setActiveTab('timetable'); if (isMobile) setIsSidebarOpen(false); }}>
            <span className="sidebar-item-content">
              <Clock size={16} />
              <span>Immersion Timetable</span>
            </span>
          </button>
          <button className={`sidebar-item ${activeTab === 'undertaking' ? 'active' : ''}`} onClick={() => { setActiveTab('undertaking'); if (isMobile) setIsSidebarOpen(false); }}>
            <span className="sidebar-item-content">
              <FileText size={16} />
              <span>Undertaking Form</span>
            </span>
            {!myData.undertaking_submitted && (
              <span className="sidebar-badge" style={{ background: '#ef4444', color: '#ffffff' }}>Pending</span>
            )}
          </button>

          <div className="sidebar-separator" />
          <p className="sidebar-section-label">Performance</p>
          <button className={`sidebar-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => { setActiveTab('attendance'); if (isMobile) setIsSidebarOpen(false); }}>
            <span className="sidebar-item-content">
              <ClipboardList size={16} />
              <span>My Attendance</span>
            </span>
          </button>
          <button className={`sidebar-item ${activeTab === 'evaluations' ? 'active' : ''}`} onClick={() => { setActiveTab('evaluations'); if (isMobile) setIsSidebarOpen(false); }}>
            <span className="sidebar-item-content">
              <PenTool size={16} />
              <span>Evaluations & Marks</span>
            </span>
          </button>

          <div className="sidebar-separator" />
          <p className="sidebar-section-label">Support</p>
          <button className={`sidebar-item ${activeTab === 'feedback' ? 'active' : ''}`} onClick={() => { setActiveTab('feedback'); if (isMobile) setIsSidebarOpen(false); }}>
            <span className="sidebar-item-content">
              <MessageSquare size={16} />
              <span>Submit Feedback</span>
            </span>
          </button>
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-info">
            <div className="sidebar-user-avatar">
              {currentUser?.name ? currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST'}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{currentUser?.name || 'Student'}</span>
              <span className="sidebar-user-role">Student</span>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Sign Out" aria-label="Sign Out">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content" style={{ flex: 1, padding: isMobile ? 'calc(10px + env(safe-area-inset-top)) 10px calc(10px + env(safe-area-inset-bottom))' : '30px' }}>
        {isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', background: 'white', padding: '10px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="btn btn-outline" style={{ padding: '8px' }} onClick={() => setIsSidebarOpen(true)}>
                <Menu size={20} />
              </button>
              <h1 style={{ fontSize: '18px', margin: 0 }}>Student Portal</h1>
            </div>
            {renderNotifications()}
          </div>
        )}
        <div className="dashboard-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ color: 'var(--text-muted)' }}>
              {currentUser.division ? `Division: ${currentUser.division} | ` : ''} 
              {currentUser.school ? `School: ${currentUser.school} | ` : ''} 
              Department: {currentUser.department}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <button className="btn btn-outline btn-sm" onClick={fetchDashboardData}>
              <RefreshCw size={14} style={{ marginRight: '6px' }} /> Refresh
            </button>
            {!isMobile && renderNotifications()}
          </div>
        </div>

        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
            {/* Overview Detail Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              
              {/* Student Profile Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Academic Profile</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>{currentUser.name}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #e2e8f0', paddingTop: '10px', marginTop: '6px', fontSize: '12.5px', color: '#0f172a', fontWeight: '600' }}>
                    <span>PRN: <span style={{ color: '#475569', fontWeight: '500', fontFamily: 'monospace' }}>{myData.prn || 'N/A'}</span></span>
                    <span>LTC ID: <span style={{ color: 'var(--primary)', fontWeight: '750' }}>{myData.prn ? String(myData.prn).slice(-4) : 'N/A'}</span></span>
                    <span>Semester: <span style={{ color: '#475569', fontWeight: '500' }}>{myData.semester || 'N/A'}</span></span>
                  </div>
                </div>
              </div>

              {/* Squad Details Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Allocated Squad</span>
                {myData.squad ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '18px', fontWeight: '800', color: SQUAD_COLORS[myData.squad] || '#0f172a' }}>{myData.squad}</span>
                    {myData.squad && myData.squad !== 'Not Assigned Yet' && (
                      <button 
                        onClick={() => { setRevealStep(1); setShowReveal(true); }} 
                        style={{ 
                          background: 'rgba(59, 130, 246, 0.06)', 
                          border: 'none', 
                          color: SQUAD_COLORS[myData.squad] || 'var(--primary)', 
                          fontSize: '11px', 
                          fontWeight: '750', 
                          cursor: 'pointer', 
                          alignSelf: 'flex-start',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          transition: 'background 0.2s',
                          marginTop: '6px'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = `rgba(59, 130, 246, 0.12)`;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = 'rgba(59, 130, 246, 0.06)';
                        }}
                        title="Replay reveal animation"
                      >
                        <RefreshCw size={11} style={{ marginRight: '4px' }} /> Replay Reveal
                      </button>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', fontWeight: '500' }}>No Squad allocated yet.</span>
                )}
              </div>

              {/* Squad Faculty Card */}
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Allocated Squad Faculty</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {squadFaculty.length > 0 ? (
                    squadFaculty.map((f, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary-dark) 100%)', color: '#ffffff', fontSize: '10px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {f.name ? f.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'FC'}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                          <span style={{ fontSize: '10.5px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.email}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic', fontWeight: '500', textAlign: 'center', display: 'block', paddingTop: '10px' }}>No Faculty assigned.</span>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'undertaking' && (
          <div className="glass-card animate-fade-in" style={{ maxWidth: '750px', margin: '0 auto', padding: isMobile ? '20px' : '40px', background: '#ffffff', borderRadius: '16px', boxShadow: 'var(--shadow-md)', border: '1px solid #e2e8f0' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #0f172a', paddingBottom: '20px' }}>
              <img src="/ltc.png" alt="LTC Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '12px' }} />
              <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>LTC Participant Undertaking</h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0 0 0', fontWeight: '500' }}>Official Immersion Honor Code & Agreement</p>
            </div>

            {myData.undertaking_submitted ? (
              // Submitted State
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', padding: '30px 20px', textAlign: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#d1fae5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)' }}>
                  ✓
                </div>
                <div>
                  <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '0 0 8px 0' }}>Undertaking Submitted Successfully</h3>
                  <p style={{ fontSize: '14px', color: '#64748b', maxWidth: '480px', margin: 0 }}>
                    You have digitally signed and recorded this undertaking on the LTC system. A copy has been shared with your Allocated Squad Faculty.
                  </p>
                </div>

                <div style={{ width: '100%', background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '20px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', textAlign: 'left', marginTop: '10px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Signed Signature</span>
                    <p style={{ fontSize: '15px', fontWeight: '800', color: '#0f172a', margin: '4px 0 0 0', fontFamily: 'serif', fontStyle: 'italic' }}>{myData.undertaking_signed_name}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Permanent Register Number (PRN)</span>
                    <p style={{ fontSize: '15px', fontWeight: '750', color: '#0f172a', margin: '4px 0 0 0', fontFamily: 'monospace' }}>{myData.prn}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Submission Date</span>
                    <p style={{ fontSize: '15px', fontWeight: '750', color: '#0f172a', margin: '4px 0 0 0' }}>{myData.undertaking_signed_date}</p>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Verification Status</span>
                    <p style={{ fontSize: '15px', fontWeight: '800', color: '#10b981', margin: '4px 0 0 0' }}>Verified Record</p>
                  </div>
                </div>
              </div>
            ) : (
              // Form State
              <form onSubmit={handleSubmitUndertaking} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ maxHeight: '300px', overflowY: 'auto', padding: '16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', color: '#334155', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontWeight: '700', color: '#0f172a' }}>LTC Honor Code & Conduct Policy</p>
                  <p style={{ margin: 0 }}>
                    As a student representing my institution and participating in the Life Transformation Centre (LTC) program, I solemnly declare that:
                  </p>
                  <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>I will maintain <strong>100% attendance</strong> across all schedules, timetable activities, and physical sessions unless officially excused.</li>
                    <li>I will actively engage and collaborate with my designated <strong>Squad Leader</strong> and <strong>Squad Faculty</strong> for all tasks and evaluation milestones.</li>
                    <li>I will adhere to the official guidelines, timings, and code of conduct set by the LTC administration. Any breach of discipline is subject to warning/red flag actions.</li>
                    <li>I understand that any violation of the code of conduct may lead to immediate disciplinary action, including suspension from the program.</li>
                  </ol>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                    <input type="checkbox" required style={{ marginTop: '3px' }} />
                    <span>I confirm that I have read and fully understand the LTC Honor Code and Conduct Policy guidelines.</span>
                  </label>
                  <label style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', cursor: 'pointer', fontSize: '13px', color: '#475569', fontWeight: '500' }}>
                    <input type="checkbox" required style={{ marginTop: '3px' }} />
                    <span>I agree to abide by the attendance, squad participation, and mark evaluation rules.</span>
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Full Name (Digital Signature)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Type your full name to sign..."
                      style={{ margin: 0 }}
                      value={undertakingForm.signedName}
                      onChange={(e) => setUndertakingForm({ ...undertakingForm, signedName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '6px', textTransform: 'uppercase' }}>Date of Signature</label>
                    <input
                      type="date"
                      className="input-field"
                      style={{ margin: 0 }}
                      value={undertakingForm.signedDate}
                      onChange={(e) => setUndertakingForm({ ...undertakingForm, signedDate: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="btn" 
                  disabled={submittingUndertaking}
                  style={{ background: '#0f172a', color: '#ffffff', padding: '12px 24px', fontSize: '14px', fontWeight: '700', borderRadius: '8px', alignSelf: 'flex-start', border: 'none', cursor: 'pointer' }}
                >
                  {submittingUndertaking ? 'Submitting...' : 'Sign & Submit Undertaking'}
                </button>
              </form>
            )}
          </div>
        )}

        {activeTab === 'timetable' && (
          <TimetablePanel />
        )}

        {activeTab === 'schedules' && (

          <div className="glass-card animate-fade-in">
             <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar className="text-primary" /> My Activity Schedule
            </h2>
            <table className="data-table">
              <thead><tr><th>Title</th><th>Date</th><th>Time</th></tr></thead>
              <tbody>
                {filteredSchedules.map(s => (
                  <tr key={s.id}><td>{s.title}</td><td>{s.date}</td><td>{s.time}</td></tr>
                ))}
                {schedules.length === 0 && <tr><td colSpan="3" style={{textAlign:'center'}}>No activities scheduled.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'attendance' && (
          <div className="glass-card animate-fade-in">
             <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ClipboardList className="text-secondary" /> Attendance Records
            </h2>
            <table className="data-table">
              <thead><tr><th>Activity Title</th><th>Date</th><th>Status</th></tr></thead>
              <tbody>
                {attendance.map((a, i) => (
                  <tr key={i}>
                    <td>{a.title}</td>
                    <td>{a.date}</td>
                    <td>
                      <span className={`badge ${a.status === 'Present' ? 'badge-student' : 'badge-admin'}`}>{a.status}</span>
                    </td>
                  </tr>
                ))}
                {attendance.length === 0 && <tr><td colSpan="3" style={{textAlign:'center'}}>No attendance recorded.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'evaluations' && (
          <div className="glass-card animate-fade-in">
             <h2 style={{ fontSize: '20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <PenTool className="text-primary" /> My Evaluations / Rubric Results
            </h2>
            <table className="data-table">
              <thead><tr><th>Activity</th><th>Marks (0-100)</th><th>Remarks / Feedback</th><th>Report File</th><th>Photo Evidence</th></tr></thead>
              <tbody>
                {evaluations.map(e => (
                  <tr key={e.id}>
                    <td><strong>{e.activity_title || 'N/A'}</strong></td>
                    <td><strong>{e.marks}</strong></td>
                    <td>{e.remarks}</td>
                    <td>{e.report_url ? <a href={e.report_url} target="_blank" rel="noreferrer" style={{color:'var(--primary)'}}>View Report</a> : 'No Report'}</td>
                    <td>{e.photo_url ? <a href={e.photo_url} target="_blank" rel="noreferrer" style={{color:'var(--primary)'}}>View Photo</a> : 'No Photo'}</td>
                  </tr>
                ))}
                {evaluations.length === 0 && <tr><td colSpan="5" style={{textAlign:'center'}}>No evaluations found.</td></tr>}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="glass-card animate-fade-in" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <MessageSquare className="text-primary" size={28} /> Share Your Feedback
            </h2>
            <p style={{ color: '#64748b', marginBottom: '32px', fontSize: '14px' }}>
              Your feedback is valuable and helps us improve the platform.
            </p>
            
            <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Category</label>
                <div style={{ position: 'relative' }}>
                  <select 
                    className="input-field" 
                    value={feedbackCategory}
                    onChange={(e) => setFeedbackCategory(e.target.value)}
                    style={{ paddingLeft: '40px', marginBottom: 0 }}
                  >
                    <option value="General">General Feedback</option>
                    <option value="Academics">Academic Programs</option>
                    <option value="Facilities">Campus Facilities</option>
                    <option value="Support">Student Support</option>
                  </select>
                  <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Message</label>
                <textarea 
                  className="input-field" 
                  style={{ minHeight: '160px', borderRadius: '12px', padding: '16px', marginBottom: 0 }}
                  placeholder="Tell us what you think, suggest improvements, or report issues..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Additional Notes</label>
                <input 
                  type="text"
                  className="input-field" 
                  style={{ marginBottom: 0 }}
                  placeholder="Any extra details or quick notes..."
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                />
              </div>

              <button type="submit" className="btn" style={{ padding: '12px 24px', fontSize: '14px', fontWeight: '600', alignSelf: 'flex-start', background: '#0A082C', color: 'white' }}>
                Submit Feedback
              </button>
            </form>
          </div>
        )}

      </div>

      {showReveal && myData.squad && myData.squad !== 'Not Assigned Yet' && (
        <div 
          className="squad-reveal-overlay" 
          style={{ backgroundColor: revealStep === 1 ? '#15803d' : '#eb8213' }}
        >
          {/* Top spacer for justify-content space-between */}
          <div style={{ height: '10px' }} />

          {revealStep === 1 ? (
            /* Slide 1: Welcome & Intro */
            <div className="squad-reveal-content-wrapper" key="step-1">
              <div className="squad-reveal-icon-container">
                <Rocket size={40} color="#ffffff" />
              </div>
              
              <h1 className="squad-reveal-title">
                Welcome, {currentUser.name}.
              </h1>

              <p className="squad-reveal-description">
                Your onboarding is complete. Ready to discover your assigned squad and team details?
              </p>

              <button 
                className="squad-reveal-btn-pill" 
                onClick={() => setRevealStep(2)}
              >
                FIND MY SQUAD <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            /* Slide 2: Squad Reveal */
            <div className="squad-reveal-content-wrapper" key="step-2">
              <div className="squad-reveal-icon-container">
                <Sun size={40} color="#ffffff" />
              </div>
              
              <h1 className="squad-reveal-title">
                Your squad is {myData.squad}.
              </h1>

              <p className="squad-reveal-description">
                You have been allocated to squad {myData.squad}. Get ready to collaborate with your team for the 5-day LTC Immersion Phase!
              </p>

              <button 
                className="squad-reveal-btn-pill" 
                onClick={() => {
                  setShowReveal(false);
                  localStorage.setItem(`ltc_squad_revealed_${currentUser.id}`, 'true');
                }}
              >
                ENTER DASHBOARD <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Indicators at the bottom */}
          <div className="squad-reveal-indicators">
            <div className={`indicator ${revealStep === 1 ? 'active' : ''}`} />
            <div className={`indicator ${revealStep === 2 ? 'active' : ''}`} />
          </div>
        </div>
      )}

      <ScrollToTop />
    </div>
  )
}
