import React, { useState } from 'react'
import { Calendar, MapPin, Clock, Compass, BookOpen, Shield, Target, Award, ChevronLeft, ChevronRight, ListTodo, CheckSquare, Map } from 'lucide-react'

export default function TimetablePanel() {
  const [activeDay, setActiveDay] = useState(1)

  const daysData = [
    {
      day: 1,
      phase: 'LTC Phase',
      segment: 'Orientation & Alignment',
      title: 'Orientation & Leadership Profiling',
      time: '09:00 AM - 05:00 PM',
      location: 'Main Seminar Complex',
      description: 'LTC orientation, safety briefing, leadership models profiling, squad formations, and alignment on curriculum objectives.',
      color: '#4f46e5', // Indigo
      bgColor: '#eef2ff',
      borderColor: '#c7d2fe',
      icon: Compass,
      agenda: [
        { time: '09:00 AM', event: 'Briefing & leadership curriculum orientation' },
        { time: '11:00 AM', event: 'LTC Profiling workshop & personality analysis' },
        { time: '02:00 PM', event: 'Squad formation alignment & dynamic goal setting' },
        { time: '04:00 PM', event: 'Icebreaking and group cohesion exercises' }
      ],
      deliverables: [
        'Complete self-assessment profiles',
        'Establish Squad charter policies',
        'Acquire camp kits and safety manuals'
      ]
    },
    {
      day: 2,
      phase: 'LTC Phase',
      segment: 'Public Policy Paradigm',
      title: 'Governance & Public Policy Workshop',
      time: '09:30 AM - 04:30 PM',
      location: 'Policy Research Auditorium',
      description: 'Engaging workshops with administrative architects regarding state governance, public policymaking, and policy design thinking sprints.',
      color: '#4f46e5',
      bgColor: '#eef2ff',
      borderColor: '#c7d2fe',
      icon: BookOpen,
      agenda: [
        { time: '09:30 AM', event: 'Seminar on governance paradigms & public policymaking' },
        { time: '11:30 AM', event: 'Fireside chat with senior Policy Directors' },
        { time: '01:30 PM', event: 'Public policy design thinking sprint workshop' },
        { time: '03:45 PM', event: 'Review on policymaking challenges' }
      ],
      deliverables: [
        'Draft state policy briefing paper',
        'Log reflections in leadership diary',
        'Complete team policy draft outline'
      ]
    },
    {
      day: 3,
      phase: 'LTC Phase',
      segment: 'Scale & Industry',
      title: 'Industrial Scaling & Tech Leadership',
      time: '09:00 AM - 05:30 PM',
      location: 'Innovation Park & Corporate Hub',
      description: 'Experiencing industrial scaling with tours of tech manufacturing centers, corporate offices, and panels at the Tech Leaders Summit.',
      color: '#4f46e5',
      bgColor: '#eef2ff',
      borderColor: '#c7d2fe',
      icon: Target,
      agenda: [
        { time: '09:00 AM', event: 'Guided tour of দিল্লির high-tech manufacturing plant' },
        { time: '11:30 AM', event: 'Fireside discussion on industrial operations scaling' },
        { time: '02:00 PM', event: 'Interactive panels at Tech Leaders Summit' },
        { time: '04:30 PM', event: 'Q&A session with tech co-founders' }
      ],
      deliverables: [
        'Submit corporate scale case study report',
        'Record tech leaders summit learnings',
        'Finalize capstone project outline slides'
      ]
    },
    {
      day: 4,
      phase: 'LTC Phase',
      segment: 'Socio-Cultural Legacy',
      title: 'Indian Heritage Tour & Cultural Analysis',
      time: '09:30 AM - 05:00 PM',
      location: 'National Heritage Sites & Museum',
      description: 'Exploration of national history and architectural structures to map heritage conservation models, cultural economics, and regional growth.',
      color: '#4f46e5',
      bgColor: '#eef2ff',
      borderColor: '#c7d2fe',
      icon: Shield,
      agenda: [
        { time: '09:30 AM', event: 'Guided study tour of historical architecture' },
        { time: '12:00 PM', event: 'Field session regarding cultural heritage economics' },
        { time: '02:30 PM', event: 'Archival research visit at the National Museum' },
        { time: '04:15 PM', event: 'Synthesis discussions on socio-cultural heritage' }
      ],
      deliverables: [
        'Draft cultural heritage synthesis memo',
        'Log historical administration principles',
        'Dry-run presentation checks'
      ]
    },
    {
      day: 5,
      phase: 'LTC Phase',
      segment: 'Capstone & Valedictory',
      title: 'Capstone Presentation & Graduation',
      time: '09:00 AM - 02:00 PM',
      location: 'Grand Ceremony Hall',
      description: 'The final camp milestone. Delivering squad capstone presentations to evaluators and administrative judges followed by graduation awards.',
      color: '#4f46e5',
      bgColor: '#eef2ff',
      borderColor: '#c7d2fe',
      icon: Award,
      agenda: [
        { time: '09:00 AM', event: 'Opening addresses & evaluation panels setup' },
        { time: '09:30 AM', event: 'Capstone project slide presentations & Q&A' },
        { time: '12:30 PM', event: 'Expert jury panel review comments' },
        { time: '01:15 PM', event: 'Valedictory awards and graduation certification' }
      ],
      deliverables: [
        'Deliver final capstone project slides',
        'Submit comprehensive camp feedback report',
        'Collect LTC Completion Certificate'
      ]
    }
  ]

  const activeDayData = daysData.find(d => d.day === activeDay)
  const ActiveIcon = activeDayData.icon

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
      
      {/* ─── Premium Storytelling Journey Tracker ─── */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '850', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} style={{ color: '#4f46e5' }} />
              LTC Immersion Curriculum
            </h3>
          </div>
          {/* Active Phase Badge */}
          <span style={{ 
            fontSize: '11px', 
            fontWeight: '800', 
            textTransform: 'uppercase',
            color: '#4f46e5', 
            background: '#eef2ff', 
            padding: '4px 10px', 
            borderRadius: '6px',
            border: '1px solid #c7d2fe'
          }}>
            LTC Phase: 5 Days
          </span>
        </div>

        {/* ─── Interactive Milestone Progress Line ─── */}
        <div style={{ position: 'relative', padding: '10px 0 20px 0', marginTop: '10px' }}>
          {/* Connective Line Track */}
          <div style={{
            position: 'absolute',
            left: '3%',
            right: '3%',
            top: '28px',
            height: '3px',
            background: '#cbd5e1',
            zIndex: 1
          }} />
          
          {/* Active progress tracking bar */}
          <div style={{
            position: 'absolute',
            left: '3%',
            width: `${((activeDay - 1) / 4) * 94}%`,
            top: '28px',
            height: '3px',
            background: activeDayData.color,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1
          }} />

          {/* Timeline Nodes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 2 }}>
            {daysData.map(item => {
              const isActive = item.day === activeDay
              const isPassed = item.day < activeDay
              return (
                <button
                  key={item.day}
                  onClick={() => setActiveDay(item.day)}
                  style={{
                    background: isActive ? '#ffffff' : (isPassed ? item.color : '#ffffff'),
                    border: `3px solid ${isActive ? '#0f172a' : (isPassed ? 'transparent' : '#cbd5e1')}`,
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '850',
                    color: isActive ? '#0f172a' : (isPassed ? '#ffffff' : '#64748b'),
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: isActive ? `0 0 0 4px ${item.bgColor}` : 'none'
                  }}
                  title={`Day ${item.day}: ${item.title}`}
                >
                  {item.day}
                </button>
              )
            })}
          </div>

          {/* Mini labels underneath nodes */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            {daysData.map(item => {
              const isActive = item.day === activeDay
              return (
                <span 
                  key={item.day}
                  style={{
                    fontSize: '10px',
                    fontWeight: isActive ? '800' : '600',
                    color: isActive ? '#0f172a' : '#64748b',
                    textAlign: 'center',
                    width: '60px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveDay(item.day)}
                >
                  {item.day === 1 && 'Orientation'}
                  {item.day === 2 && 'Policy'}
                  {item.day === 3 && 'Scale'}
                  {item.day === 4 && 'Heritage'}
                  {item.day === 5 && 'Capstone'}
                </span>
              )
            })}
          </div>
        </div>

      </div>

      {/* ─── Storytelling Details Dashboard Grid ─── */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'minmax(280px, 1.3fr) minmax(240px, 1fr)', 
        gap: '24px', 
        width: '100%',
        alignItems: 'start'
      }} className="timetable-split-layout">
        
        {/* Panel A: Journey Narrative Card */}
        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
          
          {/* Phase pill and controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: '11px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              background: activeDayData.bgColor,
              border: `1.5px solid ${activeDayData.color}33`,
              color: activeDayData.color,
              padding: '4px 12px',
              borderRadius: '100px'
            }}>
              {activeDayData.segment}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button 
                disabled={activeDay === 1}
                onClick={() => setActiveDay(p => p - 1)}
                style={{
                  padding: '6px',
                  borderRadius: '50%',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  cursor: activeDay === 1 ? 'not-allowed' : 'pointer',
                  opacity: activeDay === 1 ? 0.3 : 1
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                disabled={activeDay === 5}
                onClick={() => setActiveDay(p => p + 1)}
                style={{
                  padding: '6px',
                  borderRadius: '50%',
                  border: '1px solid #cbd5e1',
                  background: 'white',
                  cursor: activeDay === 5 ? 'not-allowed' : 'pointer',
                  opacity: activeDay === 5 ? 0.3 : 1
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Title & Large Icon */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div style={{ 
              background: activeDayData.bgColor, 
              border: `1.5px solid ${activeDayData.color}55`,
              padding: '12px', 
              borderRadius: '12px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: activeDayData.color
            }}>
              <ActiveIcon size={24} />
            </div>
            <div>
              <span style={{ fontSize: '12px', fontWeight: '850', color: '#64748b', textTransform: 'uppercase' }}>Day {activeDayData.day} Focus</span>
              <h4 style={{ fontSize: '18px', fontWeight: '850', color: '#0f172a', margin: '2px 0 0 0' }}>
                {activeDayData.title}
              </h4>
            </div>
          </div>

          {/* Key Logistics Metadata */}
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#334155' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={14} style={{ color: activeDayData.color }} />
              <span>{activeDayData.time}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={14} style={{ color: activeDayData.color }} />
              <span>{activeDayData.location}</span>
            </div>
          </div>

          {/* Story Narrative */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '14px', color: '#334155', margin: 0, lineHeight: '1.6' }}>
              {activeDayData.description}
            </p>
          </div>

        </div>

        {/* Panel B: Agenda Timeline & Deliverables list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Hourly Agenda Timeline */}
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '850', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={16} style={{ color: activeDayData.color }} />
              Day {activeDayData.day} Hourly Agenda
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', position: 'relative', paddingLeft: '14px', marginTop: '6px' }}>
              {/* Central micro line */}
              <div style={{ position: 'absolute', left: '3px', top: '4px', bottom: '4px', width: '2px', background: '#cbd5e1' }} />
              
              {activeDayData.agenda.map((ag, index) => (
                <div key={index} style={{ display: 'flex', gap: '14px', position: 'relative' }}>
                  {/* Micro node dot */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '-14px', 
                    top: '5px', 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: activeDayData.color, 
                    border: '2px solid white' 
                  }} />
                  <div style={{ width: '72px', fontSize: '11px', fontWeight: '800', color: activeDayData.color, fontFamily: 'monospace' }}>
                    {ag.time}
                  </div>
                  <div style={{ flex: 1, fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>
                    {ag.event}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Tasks & Deliverables Card */}
          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '20px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '850', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ListTodo size={16} style={{ color: activeDayData.color }} />
              Required Deliverables
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              {activeDayData.deliverables.map((dl, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <CheckSquare size={14} style={{ color: activeDayData.color, marginTop: '2px', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#334155', lineHeight: 1.4 }}>{dl}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
