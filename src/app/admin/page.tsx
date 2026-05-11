'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import styles from './page.module.css'

interface Reservation {
  id: number
  date: string
  timeSlot: string
  supervisor: string
  students: string
}

interface DisabledDate {
  id: number
  date: string
  reason: string | null
}

type MonthType = 'prev' | 'current' | 'next'
interface CalCell { day: number; monthType: MonthType; date: string }

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

function parseStudents(raw: string): string[] {
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : [raw]
  } catch { return [raw] }
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [disabledDates, setDisabledDates] = useState<DisabledDate[]>([])
  const [newDate, setNewDate] = useState('')
  const [newReason, setNewReason] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())

  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([
        fetch('/api/reservations').then(res => res.json()),
        fetch('/api/disabled-dates').then(res => res.json()),
      ])
      setReservations(r)
      setDisabledDates(d)
    } catch {
      toast.error('데이터를 불러오지 못했습니다.')
    }
  }, [])

  useEffect(() => {
    fetch('/api/admin/session')
      .then(r => r.json())
      .then(d => { if (d.valid) setAuthed(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (authed) fetchData()
  }, [authed, fetchData])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      setAuthed(true)
    } else {
      const data = await res.json()
      toast.error(data.error)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {}
    setAuthed(false)
  }

  async function deleteReservation(id: number) {
    await fetch(`/api/reservations/${id}`, { method: 'DELETE' })
    toast.success('예약이 삭제되었습니다.')
    fetchData()
  }

  async function addDisabledDate(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/disabled-dates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: newDate, reason: newReason }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error)
    } else {
      setNewDate('')
      setNewReason('')
      toast.success('날짜가 비활성화되었습니다.')
      fetchData()
    }
  }

  async function deleteDisabledDate(id: number) {
    await fetch(`/api/disabled-dates/${id}`, { method: 'DELETE' })
    toast.success('날짜가 삭제되었습니다.')
    fetchData()
  }

  // Build 42-cell calendar
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const prevMonYear = viewMonth === 0 ? viewYear - 1 : viewYear
  const prevMonIndex = viewMonth === 0 ? 11 : viewMonth - 1
  const daysInPrevMonth = new Date(prevMonYear, prevMonIndex + 1, 0).getDate()
  const nextMonYear = viewMonth === 11 ? viewYear + 1 : viewYear
  const nextMonIndex = viewMonth === 11 ? 0 : viewMonth + 1

  const cells: CalCell[] = []
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    cells.push({ day: d, monthType: 'prev', date: formatDate(prevMonYear, prevMonIndex, d) })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, monthType: 'current', date: formatDate(viewYear, viewMonth, d) })
  }
  for (let d = 1; d <= 42 - cells.length; d++) {
    cells.push({ day: d, monthType: 'next', date: formatDate(nextMonYear, nextMonIndex, d) })
  }

  const disabledMap = new Map<string, DisabledDate>()
  disabledDates.forEach(d => disabledMap.set(d.date, d))
  const lunchByDate = new Map<string, Reservation>()
  const dinnerByDate = new Map<string, Reservation>()
  reservations.forEach(r => {
    if (r.timeSlot === '점심') lunchByDate.set(r.date, r)
    else dinnerByDate.set(r.date, r)
  })

  // Stats: count of lunch/dinner reservations in current view month
  const viewYearMonth = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`
  const monthRes = reservations.filter(r => r.date.startsWith(viewYearMonth))
  const lunchCount = monthRes.filter(r => r.timeSlot === '점심').length
  const dinnerCount = monthRes.filter(r => r.timeSlot === '저녁').length

  // Search filter
  const trimmedQuery = searchQuery.trim()
  const filteredReservations = trimmedQuery
    ? reservations.filter(r => {
        const arr = parseStudents(r.students)
        return arr.some(s => s.includes(trimmedQuery))
      })
    : []

  function handleCellClick(cell: CalCell) {
    if (cell.monthType !== 'current') return
    const hasContent = lunchByDate.has(cell.date) || dinnerByDate.has(cell.date) || disabledMap.has(cell.date)
    if (!hasContent) return
    setSelectedDate(cell.date)
    setShowDetail(true)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const detailLunch = selectedDate ? lunchByDate.get(selectedDate) : undefined
  const detailDinner = selectedDate ? dinnerByDate.get(selectedDate) : undefined
  const detailDisabled = selectedDate ? disabledMap.get(selectedDate) : undefined
  const selectedLabel = selectedDate
    ? `${selectedDate.slice(0, 4)}년 ${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8))}일`
    : ''

  if (!authed) {
    return (
      <main className={styles.loginPage}>
        <div className={styles.loginBox}>
          <div className={styles.loginLogo}>
            <img src="/logo.png" alt="로고" height={72} />
          </div>
          <h1 className={styles.loginTitle}>관리자 로그인</h1>
          <form onSubmit={handleLogin} className={styles.loginForm}>
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="비밀번호"
                className={styles.input}
                autoFocus
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                )}
              </button>
            </div>
            <button type="submit" className={styles.loginBtn}>로그인</button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>관리자 — 경소노래방</h1>
        <div className={styles.headerActions}>
          <a href="/api/admin/export" className={styles.exportBtn}>CSV 내보내기</a>
          <a href="/api/admin/backup" className={styles.exportBtn}>DB 백업</a>
          <button className={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
        </div>
      </header>


      <div className={styles.content}>
        {/* 1. 날짜 비활성화 (맨 위) */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>날짜 비활성화</h2>
          <form onSubmit={addDisabledDate} className={styles.addForm}>
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className={styles.input} required />
            <input type="text" value={newReason} onChange={e => setNewReason(e.target.value)} placeholder="사유 (선택)" className={styles.input} />
            <button type="submit" className={styles.addBtn}>추가</button>
          </form>

          {disabledDates.length === 0 ? (
            <p className={styles.empty}>비활성화된 날짜가 없습니다.</p>
          ) : (
            <table className={styles.disabledTable}>
              <thead>
                <tr><th>날짜</th><th>사유</th><th></th></tr>
              </thead>
              <tbody>
                {disabledDates.map(d => (
                  <tr key={d.id}>
                    <td>{d.date}</td>
                    <td>{d.reason ?? '—'}</td>
                    <td><button className={styles.deleteBtn} onClick={() => deleteDisabledDate(d.id)}>삭제</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 2. 예약 달력 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>
            예약 달력
            <span className={styles.count}>| {viewMonth + 1}월: 점심 {lunchCount}건 / 저녁 {dinnerCount}건</span>
          </h2>

          <div className={styles.calHeader}>
            <button className={styles.calNavBtn} onClick={prevMonth}>‹</button>
            <span className={styles.calMonthLabel}>{viewYear}년 {MONTH_NAMES[viewMonth]}</span>
            <button className={styles.calNavBtn} onClick={nextMonth}>›</button>
          </div>

          <div className={styles.calWeekRow}>
            {['일','월','화','수','목','금','토'].map(d => (
              <div key={d} className={styles.calWeekLabel}>{d}</div>
            ))}
          </div>

          <div className={styles.calGrid}>
            {cells.map(cell => {
              const lunch = cell.monthType === 'current' ? lunchByDate.get(cell.date) : undefined
              const dinner = cell.monthType === 'current' ? dinnerByDate.get(cell.date) : undefined
              const disabled = cell.monthType === 'current' ? disabledMap.get(cell.date) : undefined
              const isOther = cell.monthType !== 'current'
              const isClickable = !isOther && (!!lunch || !!dinner || !!disabled)
              return (
                <button
                  key={`${cell.monthType}-${cell.date}`}
                  className={[
                    styles.calCell,
                    isOther ? styles.calOther : '',
                    disabled ? styles.calDisabled : '',
                    isClickable ? styles.calClickable : '',
                  ].join(' ')}
                  onClick={() => handleCellClick(cell)}
                >
                  <span className={styles.calDate}>{cell.day}</span>
                  {disabled && <span className={styles.calDisabledLabel}>금지</span>}
                  {lunch && (
                    <span className={styles.calLunchChip}>
                      점심 - {parseStudents(lunch.students)[0] ?? ''}
                    </span>
                  )}
                  {dinner && (
                    <span className={styles.calDinnerChip}>
                      저녁 - {parseStudents(dinner.students)[0] ?? ''}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* 3. 검색 */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>예약 검색</h2>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="학생 이름으로 검색..."
            className={styles.searchInput}
          />
          {trimmedQuery && (
            filteredReservations.length === 0 ? (
              <p className={styles.empty}>검색 결과가 없습니다.</p>
            ) : (
              <div className={styles.searchResults}>
                {filteredReservations.map(r => (
                  <div key={r.id} className={styles.searchResult}>
                    <div className={styles.searchResultInfo}>
                      <span className={styles.searchResultDate}>{r.date} · {r.timeSlot}</span>
                      <span className={styles.searchResultStudents}>
                        {parseStudents(r.students).join(' / ')}
                      </span>
                    </div>
                    <button className={styles.deleteBtn} onClick={() => deleteReservation(r.id)}>삭제</button>
                  </div>
                ))}
              </div>
            )
          )}
        </section>
      </div>

      {/* 상세 모달 */}
      {showDetail && selectedDate && (
        <div className={styles.backdrop} onClick={() => setShowDetail(false)}>
          <div className={styles.detailModal} onClick={e => e.stopPropagation()}>
            <div className={styles.detailHeader}>
              <h2>{selectedLabel} 상세</h2>
              <button className={styles.closeBtn} onClick={() => setShowDetail(false)}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className={styles.detailBody}>
              {detailDisabled && (
                <div className={styles.detailDisabledBox}>
                  <span>🚫 예약 불가 날짜</span>
                  {detailDisabled.reason && <span className={styles.detailDisabledReason}>{detailDisabled.reason}</span>}
                </div>
              )}

              {detailLunch && (
                <div className={styles.detailSlot}>
                  <div className={styles.detailSlotHeader}>
                    <span className={styles.lunchBadge}>점심</span>
                    <button className={styles.detailDeleteBtn} onClick={() => { deleteReservation(detailLunch.id); setShowDetail(false) }}>삭제</button>
                  </div>
                  <ul className={styles.studentList}>
                    {parseStudents(detailLunch.students).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {detailDinner && (
                <div className={styles.detailSlot}>
                  <div className={styles.detailSlotHeader}>
                    <span className={styles.dinnerBadge}>저녁</span>
                    <button className={styles.detailDeleteBtn} onClick={() => { deleteReservation(detailDinner.id); setShowDetail(false) }}>삭제</button>
                  </div>
                  <ul className={styles.studentList}>
                    {parseStudents(detailDinner.students).map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {!detailLunch && !detailDinner && !detailDisabled && (
                <p className={styles.detailEmpty}>예약 내역이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
