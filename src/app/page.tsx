'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { toast } from 'react-toastify'
import styles from './page.module.css'

interface Reservation {
  id: number
  date: string
  timeSlot: string
  supervisor: string
  students: string
}
interface DisabledDate { id: number; date: string; reason: string | null }
type MonthType = 'prev' | 'current' | 'next'
type DayState =
  | 'otherMonth'
  | 'otherView'
  | 'past'
  | 'disabled'
  | 'fullyReserved'
  | 'available'
  | 'unavailable'
interface CalendarCell { day: number; monthType: MonthType; date: string }
interface FormState {
  timeSlot: '점심' | '저녁'
  students: string[]
  pin: string
}

function getFirstStudent(studentsJson: string): string {
  try {
    const arr = JSON.parse(studentsJson)
    return Array.isArray(arr) && arr.length > 0 ? arr[0] : ''
  } catch { return '' }
}

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

const TEST_MODE = true // 테스트 중: 신청 기간 제한 무시

function isApplicationPeriod(): boolean {
  if (TEST_MODE) return true
  const now = new Date()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return now.getDate() >= lastDay - 6
}

function getTargetMonth() {
  const now = new Date()
  let year = now.getFullYear()
  let month = now.getMonth() + 1
  if (month > 11) { month = 0; year += 1 }
  return { year, month }
}

function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getTodayStr(): string {
  const now = new Date()
  return formatDate(now.getFullYear(), now.getMonth(), now.getDate())
}

export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [disabledDates, setDisabledDates] = useState<DisabledDate[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showNoticeModal, setShowNoticeModal] = useState(false)
  const [showFormModal, setShowFormModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelInput, setCancelInput] = useState('')
  const [cancelPin, setCancelPin] = useState('')
  const [form, setForm] = useState<FormState>({
    timeSlot: '점심',
    students: [''],
    pin: '',
  })
  const calendarRef = useRef<HTMLDivElement>(null)

  const inPeriod = isApplicationPeriod()
  const { year: targetYear, month: targetMonth } = getTargetMonth()
  const todayStr = getTodayStr()

  const [viewYear, setViewYear] = useState(targetYear)
  const [viewMonth, setViewMonth] = useState(targetMonth)

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
    setIsLoaded(true)
    fetchData()
    const id = setInterval(fetchData, 5000)
    return () => clearInterval(id)
  }, [fetchData])

  // Build 6-week grid (42 cells)
  const daysInViewMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const prevMonYear = viewMonth === 0 ? viewYear - 1 : viewYear
  const prevMonIndex = viewMonth === 0 ? 11 : viewMonth - 1
  const daysInPrevMonth = new Date(prevMonYear, prevMonIndex + 1, 0).getDate()
  const nextMonYear = viewMonth === 11 ? viewYear + 1 : viewYear
  const nextMonIndex = viewMonth === 11 ? 0 : viewMonth + 1

  const cells: CalendarCell[] = []
  for (let i = firstDow - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    cells.push({ day: d, monthType: 'prev', date: formatDate(prevMonYear, prevMonIndex, d) })
  }
  for (let d = 1; d <= daysInViewMonth; d++) {
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
  const isTargetMonth = viewYear === targetYear && viewMonth === targetMonth

  function isFriday(date: string): boolean {
    return new Date(date).getDay() === 5
  }

  function getDayState(date: string, monthType: MonthType): DayState {
    if (monthType !== 'current') return 'otherMonth'
    if (!isTargetMonth) return 'otherView'
    if (date < todayStr) return 'past'
    if (disabledMap.has(date)) return 'disabled'
    if (lunchByDate.has(date) && dinnerByDate.has(date)) return 'fullyReserved'
    if (isFriday(date) && lunchByDate.has(date)) return 'fullyReserved'
    if (!inPeriod) return 'unavailable'
    return 'available'
  }

  function handleDayClick(cell: CalendarCell) {
    const state = getDayState(cell.date, cell.monthType)
    if (
      state === 'otherMonth' ||
      state === 'otherView' ||
      state === 'past' ||
      state === 'disabled' ||
      state === 'fullyReserved'
    ) return
    if (state === 'unavailable') { setShowNoticeModal(true); return }
    setSelectedDate(cell.date)
    const lunchTaken = lunchByDate.has(cell.date)
    const defaultSlot: '점심' | '저녁' = lunchTaken ? '저녁' : '점심'
    setForm({ timeSlot: defaultSlot, students: [''], pin: '' })
    setShowFormModal(true)
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  function addStudent() {
    setForm(f => (f.students.length >= 6 ? f : { ...f, students: [...f.students, ''] }))
  }
  function removeStudent(i: number) {
    setForm(f => {
      if (f.students.length <= 1) return f
      const next = f.students.slice()
      next.splice(i, 1)
      return { ...f, students: next }
    })
  }
  function updateStudent(i: number, val: string) {
    setForm(f => {
      const next = f.students.slice()
      next[i] = val
      return { ...f, students: next }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDate) return
    const validStudents = form.students.map(s => s.trim()).filter(s => s.length > 0)
    if (validStudents.length === 0) {
      toast.error('학생을 최소 1명 이상 입력해주세요.')
      return
    }
    const formatRe = /^\d{4}[가-힣]{2,}$/
    const invalid = validStudents.find(s => !formatRe.test(s))
    if (invalid) {
      toast.error(`'${invalid}' — 형식이 올바르지 않습니다. 숫자 4자리 + 이름을 붙여서 입력해주세요. (예: 3214양선민)`)
      return
    }
    if (!/^\d{4}$/.test(form.pin)) {
      toast.error('취소용 PIN을 숫자 4자리로 입력해주세요.')
      return
    }
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          timeSlot: form.timeSlot,
          supervisor: '',
          students: validStudents,
          pin: form.pin,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('예약이 완료되었습니다!')
      setShowFormModal(false)
      fetchData()
      calendarRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } catch {
      toast.error('예약 중 오류가 발생했습니다.')
    }
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault()
    if (!cancelInput.trim()) {
      toast.error('학생 정보를 입력해주세요.')
      return
    }
    if (!/^\d{4}$/.test(cancelPin)) {
      toast.error('PIN을 숫자 4자리로 입력해주세요.')
      return
    }
    try {
      const res = await fetch('/api/reservations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentInfo: cancelInput, pin: cancelPin }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success(`예약이 취소되었습니다. (${data.cancelled}건)`)
      setShowCancelModal(false)
      setCancelInput('')
      setCancelPin('')
      fetchData()
    } catch {
      toast.error('취소 중 오류가 발생했습니다.')
    }
  }

  const selectedLabel = selectedDate
    ? `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8))}일`
    : ''

  const lunchTakenForSelected = selectedDate ? lunchByDate.has(selectedDate) : false
  const dinnerTakenForSelected = selectedDate ? (dinnerByDate.has(selectedDate) || isFriday(selectedDate)) : false

  return (
    <main className={styles.container}>
      <div className={`${styles.hero} ${isLoaded ? styles.fadeIn : ''}`}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="로고" height={100} />
        </div>
        <h1>경소노래방 신청</h1>
        <p className={styles.monthText}>{targetMonth + 1}월 경소노래방 신청</p>
        {inPeriod
          ? <p className={styles.applicationPeriod}>현재 신청 기간입니다!</p>
          : <p className={styles.notApplicationPeriod}>아직 신청 기간이 아닙니다.</p>
        }
      </div>

      <div className={styles.calendarContainer} ref={calendarRef}>
        <div className={styles.calendarHeader}>
          <button className={styles.navBtn} onClick={prevMonth}>‹</button>
          <span className={styles.monthLabel}>{viewYear}년 {MONTH_NAMES[viewMonth]}</span>
          <button className={styles.navBtn} onClick={nextMonth}>›</button>
          <button type="button" className={styles.cancelLink} onClick={() => setShowCancelModal(true)}>
            내 예약 취소
          </button>
        </div>

        <div className={styles.weekRow}>
          {['일','월','화','수','목','금','토'].map(d => (
            <div key={d} className={styles.weekLabel}>{d}</div>
          ))}
        </div>

        <div className={styles.grid}>
          {cells.map(cell => {
            const state = getDayState(cell.date, cell.monthType)
            const isActive =
              (state === 'available' || state === 'unavailable' || state === 'fullyReserved') &&
              cell.monthType === 'current' &&
              isTargetMonth
            const isToday = cell.date === todayStr
            const lunch = lunchByDate.get(cell.date)
            const dinner = dinnerByDate.get(cell.date)
            const disabledInfo = disabledMap.get(cell.date)
            return (
              <button
                key={`${cell.monthType}-${cell.date}`}
                className={[
                  styles.day,
                  styles[state],
                  isActive ? styles.activeCell : '',
                  isToday ? styles.today : '',
                ].join(' ')}
                onClick={() => handleDayClick(cell)}
              >
                <span className={styles.dayNum}>{cell.day}</span>
                {state === 'disabled' && disabledInfo?.reason && (
                  <span className={styles.disabledReason}>{disabledInfo.reason}</span>
                )}
                {state === 'fullyReserved' ? (
                  <>
                    <span className={styles.reservedBadge}>예약됨</span>
                    <span className={styles.notAvailableLabel}>예약 불가</span>
                  </>
                ) : (
                  <div className={styles.slotChips}>
                    {lunch && (
                      <span className={`${styles.slotChip} ${styles.lunchChip}`}>
                        점심 - {getFirstStudent(lunch.students)}
                      </span>
                    )}
                    {dinner && (
                      <span className={`${styles.slotChip} ${styles.dinnerChip}`}>
                        저녁 - {getFirstStudent(dinner.students)}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {showNoticeModal && (
        <div className={styles.backdrop} onClick={() => setShowNoticeModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>신청 기간이 아닙니다</h2>
              <button className={styles.closeBtn} onClick={() => setShowNoticeModal(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.noticeContent}>
                <svg viewBox="0 0 24 24" width="48" height="48" fill="#ef4444">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <p>노래방 신청은 매월 마지막 주에만 가능합니다.</p>
                <button className={styles.modalBtn} onClick={() => setShowNoticeModal(false)}>확인</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className={styles.backdrop} onClick={() => setShowFormModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>경소노래방 신청</h2>
              <button className={styles.closeBtn} onClick={() => setShowFormModal(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleSubmit} className={styles.form}>
                <p className={styles.selectedDateLabel}>{selectedLabel} 신청</p>

                <div className={styles.slotToggleRow}>
                  <button
                    type="button"
                    className={`${styles.slotToggleBtn} ${form.timeSlot === '점심' ? styles.slotToggleActive : ''}`}
                    disabled={lunchTakenForSelected}
                    onClick={() => setForm(f => ({ ...f, timeSlot: '점심' }))}
                  >
                    점심
                  </button>
                  <button
                    type="button"
                    className={`${styles.slotToggleBtn} ${form.timeSlot === '저녁' ? styles.slotToggleActive : ''}`}
                    disabled={dinnerTakenForSelected}
                    onClick={() => setForm(f => ({ ...f, timeSlot: '저녁' }))}
                  >
                    저녁
                  </button>
                </div>

                <div className={styles.studentsHeader}>
                  <span>학생 정보</span>
                  {form.students.length < 6 && (
                    <button type="button" className={styles.addStudentBtn} onClick={addStudent}>
                      + 학생 추가
                    </button>
                  )}
                </div>

                {form.students.map((s, i) => (
                  <div key={i} className={styles.studentRow}>
                    <input
                      type="text"
                      value={s}
                      onChange={e => updateStudent(i, e.target.value)}
                      placeholder="학년반번호이름 (예: 3214양선민)"
                      autoFocus={i === 0}
                    />
                    {form.students.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeStudentBtn}
                        onClick={() => removeStudent(i)}
                      >
                        —
                      </button>
                    )}
                  </div>
                ))}

                <div className={styles.studentsHeader} style={{ marginTop: 16 }}>
                  <span>취소용 PIN</span>
                </div>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.pin}
                  onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                  placeholder="숫자 4자리 (나중에 취소 시 필요)"
                  className={styles.cancelInput}
                />

                <div className={styles.formBtns}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowFormModal(false)}
                  >
                    취소
                  </button>
                  <button type="submit" className={styles.modalBtn}>✓ 신청하기</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <div className={styles.backdrop} onClick={() => { setShowCancelModal(false); setCancelInput(''); setCancelPin('') }}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>예약 취소</h2>
              <button className={styles.closeBtn} onClick={() => { setShowCancelModal(false); setCancelInput(''); setCancelPin('') }}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <form onSubmit={handleCancel} className={styles.form}>
                <p className={styles.selectedDateLabel}>학년반번호이름을 입력하세요</p>
                <input
                  type="text"
                  value={cancelInput}
                  onChange={e => setCancelInput(e.target.value)}
                  placeholder="예: 3214양선민"
                  autoFocus
                  className={styles.cancelInput}
                />
                <p className={styles.selectedDateLabel} style={{ marginTop: 14 }}>PIN 4자리</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={cancelPin}
                  onChange={e => setCancelPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="예약 시 설정한 PIN"
                  className={styles.cancelInput}
                />
                <div className={styles.formBtns}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => { setShowCancelModal(false); setCancelInput(''); setCancelPin('') }}
                  >
                    닫기
                  </button>
                  <button type="submit" className={styles.modalBtn}>예약 취소</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
