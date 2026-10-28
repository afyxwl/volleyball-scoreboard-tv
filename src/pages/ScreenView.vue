<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { createSocket } from '../services/socket'
import ScoreboardDisplay from '../components/ScoreboardDisplay.vue'

const route = useRoute()
const screenId = route.params.id

const loading = ref(true)
const error = ref('')
const noMatch = ref(false)
const socket = createSocket()
updateDisplayedGameClock
function defaultScoreboard() {
  return {
    id: undefined,
    screenId: Number(screenId),
    sportType: 'volleyball',

    team1: {
      name: 'КОМАНДА 1',
      score: 0,
      fouls: 0,
      timeoutsUsed: 0,
    },

    team2: {
      name: 'КОМАНДА 2',
      score: 0,
      fouls: 0,
      timeoutsUsed: 0,
    },

    currentSet: 1,
    status: 'draft',
    isActive: false,

    clock: {
      time: '00:00',
      isRunning: false,
      startedAt: null as string | null,
    },

    shotClock: {
      seconds: 24,
      isRunning: false,
      defaultSeconds: 24,
      startedAt: null as string | null,
    },

    theme: {
      team1Color: '#67e8f9',
      team2Color: '#fda4af',
      fontFamily: 'system',
      boardStyle: 'neon',
    },

    setScores: {
      team1: [],
      team2: [],
    },
  }
}

const scoreboard = ref(defaultScoreboard())

const displayedClock = ref('00:00')
const serverTimeoutEnd = ref<number | null>(null)
const displayedShotClock = ref('24')

let tickerId: number | null = null
let serverOffsetMs = 0

// ==============================
// ТАЙМАУТ — 30 СЕКУНД
// ==============================

const TIMEOUT_SECONDS = 30

const timeoutEndMs = ref<number | null>(null)
const timeoutSavedClock = ref('00:00')

let timeoutMatchId: unknown = null
let lastTimeoutCounts: [number, number] | null = null

let localClockAnchor: {
  seconds: number
  atMs: number
  running: boolean
  sport: string
} | null = null

function resetTimeoutState() {
  timeoutEndMs.value = null
  lastTimeoutCounts = null
  localClockAnchor = null
}

function parseClock(value: string) {
  const [mm, ss] = (value || '00:00').split(':').map(Number)
  return (mm || 0) * 60 + (ss || 0)
}

function formatClock(total: number) {
  const safe = Math.max(0, Math.floor(total))
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function timeoutRemaining() {
  if (timeoutEndMs.value === null) return null

  return Math.max(
    0,
    Math.ceil((timeoutEndMs.value - Date.now()) / 1000)
  )
}

function startTimeout() {
  // Зберігаємо час матчу перед таймаутом.
  updateDisplayedGameClock()

  timeoutSavedClock.value = displayedClock.value

  // Запускаємо 30-секундний відлік.
  timeoutEndMs.value = Date.now() + TIMEOUT_SECONDS * 1000

  localClockAnchor = null

  startTicker()
}

function finishTimeout() {
  if (timeoutEndMs.value === null) return

  timeoutEndMs.value = null

  // Повертаємо час, який був до таймауту.
  localClockAnchor = {
    seconds: parseClock(timeoutSavedClock.value),
    atMs: Date.now(),
    running: Boolean(scoreboard.value.clock.isRunning),
    sport: scoreboard.value.sportType,
  }

  displayedClock.value = timeoutSavedClock.value
}

// ==============================
// ОСНОВНИЙ ТАЙМЕР МАТЧУ
// ==============================

function updateDisplayedGameClock() {
  if (serverTimeoutEnd.value !== null) {
  const now = Date.now() + serverOffsetMs

  const remaining = Math.max(
    0,
    Math.ceil((serverTimeoutEnd.value - now) / 1000)
  )

  if (remaining > 0) {
    displayedClock.value = formatClock(remaining)
    return
  }

  // Таймаут завершився.
  serverTimeoutEnd.value = null
}
  const remaining = timeoutRemaining()

  // Під час таймауту показуємо 00:30 ... 00:01.
  if (remaining !== null) {
    if (remaining > 0) {
      displayedClock.value = formatClock(remaining)
      return
    }

    finishTimeout()
    return
  }

  // Локальний час після завершення таймауту.
  if (localClockAnchor) {
    const anchor = localClockAnchor

    const elapsed = anchor.running
      ? Math.max(0, Math.floor((Date.now() - anchor.atMs) / 1000))
      : 0

    displayedClock.value = formatClock(
      anchor.sport === 'basketball'
        ? Math.max(0, anchor.seconds - elapsed)
        : anchor.seconds + elapsed
    )

    return
  }

  const clock = scoreboard.value.clock
  const base = parseClock(clock.time || '00:00')

  if (!clock.isRunning || !clock.startedAt) {
    displayedClock.value = formatClock(base)
    return
  }

  const now = Date.now() + serverOffsetMs
  const started = new Date(clock.startedAt).getTime()

  const elapsed = Math.max(
    0,
    Math.floor((now - started) / 1000)
  )

  displayedClock.value = formatClock(
    scoreboard.value.sportType === 'basketball'
      ? Math.max(0, base - elapsed)
      : base + elapsed
  )
}

// ==============================
// ТАЙМЕР АТАКИ
// ==============================

function formatShotClock(total: number) {
  return String(
    Math.max(0, Math.floor(total || 0))
  ).padStart(2, '0')
}

function updateDisplayedShotClock() {
  const shot = scoreboard.value.shotClock
  const base = Number(shot.seconds ?? 24)

  if (!shot.isRunning || !shot.startedAt) {
    displayedShotClock.value = formatShotClock(base)
    return
  }

  const now = Date.now() + serverOffsetMs
  const started = new Date(shot.startedAt).getTime()

  const elapsed = Math.max(
    0,
    Math.floor((now - started) / 1000)
  )

  displayedShotClock.value = formatShotClock(
    Math.max(0, base - elapsed)
  )
}

// ==============================
// ОНОВЛЕННЯ ТАЙМЕРІВ
// ==============================

function stopTicker() {
  if (tickerId !== null) {
    clearInterval(tickerId)
    tickerId = null
  }
}

function startTicker() {
  stopTicker()

  const update = () => {
    updateDisplayedGameClock()
    updateDisplayedShotClock()
  }

  update()

  const gameRunning =
    scoreboard.value.clock.isRunning &&
    scoreboard.value.clock.startedAt

  const shotRunning =
    scoreboard.value.shotClock.isRunning &&
    scoreboard.value.shotClock.startedAt

  if (
    gameRunning ||
    shotRunning ||
    timeoutEndMs.value !== null ||
    localClockAnchor?.running
  ) {
    tickerId = window.setInterval(update, 100)
  }
}

// ==============================
// ОТРИМАННЯ ДАНИХ ІЗ СЕРВЕРА
// ==============================

function applyScoreboard(payload: any) {
  const data = payload?.data ?? payload
  if (data.timeout !== undefined) {
    serverTimeoutEnd.value =
      data.timeout?.isActive && data.timeout?.endsAt
        ? new Date(data.timeout.endsAt).getTime()
        : null
  }
  if (data?.serverNow) {
    serverOffsetMs =
      new Date(data.serverNow).getTime() - Date.now()
  }

  noMatch.value = false

  const incomingMatchId = data.id ?? scoreboard.value.id

  if (timeoutMatchId !== incomingMatchId) {
    resetTimeoutState()
    timeoutMatchId = incomingMatchId
  }

  const newCounts: [number, number] = [
    Number(
      data.team1?.timeoutsUsed ??
      scoreboard.value.team1.timeoutsUsed ??
      0
    ),
    Number(
      data.team2?.timeoutsUsed ??
      scoreboard.value.team2.timeoutsUsed ??
      0
    ),
  ]

  // Визначаємо натискання кнопки «Таймаут +1».
  const timeoutWasAdded =
    lastTimeoutCounts !== null &&
    (
      newCounts[0] > lastTimeoutCounts[0] ||
      newCounts[1] > lastTimeoutCounts[1]
    )

  lastTimeoutCounts = newCounts

  // Якщо організатор вручну змінює таймер,
  // скидаємо локальну синхронізацію.
  const clockChanged = data.clock && (
    (
      data.clock.time !== undefined &&
      data.clock.time !== scoreboard.value.clock.time
    ) ||
    (
      data.clock.startedAt !== undefined &&
      data.clock.startedAt !== scoreboard.value.clock.startedAt
    ) ||
    (
      data.clock.isRunning !== undefined &&
      data.clock.isRunning !== scoreboard.value.clock.isRunning
    )
  )

  if (
    clockChanged &&
    !timeoutWasAdded &&
    timeoutEndMs.value === null
  ) {
    localClockAnchor = null
  }

  scoreboard.value = {
    id: data.id ?? scoreboard.value.id,

    screenId:
      data.screenId ?? scoreboard.value.screenId,

    team1: {
      name:
        data.team1?.name ??
        scoreboard.value.team1.name,

      score:
        data.team1?.score ??
        scoreboard.value.team1.score,

      fouls:
        data.team1?.fouls ??
        scoreboard.value.team1.fouls,

      timeoutsUsed:
        data.team1?.timeoutsUsed ??
        scoreboard.value.team1.timeoutsUsed,
    },

    team2: {
      name:
        data.team2?.name ??
        scoreboard.value.team2.name,

      score:
        data.team2?.score ??
        scoreboard.value.team2.score,

      fouls:
        data.team2?.fouls ??
        scoreboard.value.team2.fouls,

      timeoutsUsed:
        data.team2?.timeoutsUsed ??
        scoreboard.value.team2.timeoutsUsed,
    },

    currentSet:
      data.currentSet ?? scoreboard.value.currentSet,

    status:
      data.status ?? scoreboard.value.status,

    isActive:
      data.isActive ?? scoreboard.value.isActive,

    sportType:
      data.sportType ?? scoreboard.value.sportType,

    clock: {
      time:
        data.clock?.time ??
        scoreboard.value.clock.time,

      isRunning:
        data.clock?.isRunning ??
        scoreboard.value.clock.isRunning,

      startedAt:
        data.clock?.startedAt ??
        scoreboard.value.clock.startedAt,
    },

    shotClock: {
      seconds:
        data.shotClock?.seconds ??
        scoreboard.value.shotClock.seconds,

      isRunning:
        data.shotClock?.isRunning ??
        scoreboard.value.shotClock.isRunning,

      defaultSeconds:
        data.shotClock?.defaultSeconds ??
        scoreboard.value.shotClock.defaultSeconds,

      startedAt:
        data.shotClock?.startedAt ??
        scoreboard.value.shotClock.startedAt,
    },

    theme: {
      team1Color:
        data.theme?.team1Color ??
        scoreboard.value.theme.team1Color,

      team2Color:
        data.theme?.team2Color ??
        scoreboard.value.theme.team2Color,

      fontFamily:
        data.theme?.fontFamily ??
        scoreboard.value.theme.fontFamily,

      boardStyle:
        data.theme?.boardStyle ??
        scoreboard.value.theme.boardStyle,
    },

    setScores: {
      team1: Array.isArray(data.setScores?.team1)
        ? data.setScores.team1
        : scoreboard.value.setScores.team1,

      team2: Array.isArray(data.setScores?.team2)
        ? data.setScores.team2
        : scoreboard.value.setScores.team2,
    },
  }

  // Запускаємо таймаут лише для волейболу.
  if (
    timeoutWasAdded &&
    scoreboard.value.sportType === 'volleyball'
  ) {
    startTimeout()
  } else {
    startTicker()
  }
}

// ==============================
// ЗАВАНТАЖЕННЯ ТА SOCKET.IO
// ==============================

async function loadCurrentState() {
  try {
    loading.value = true
    error.value = ''
    noMatch.value = false

    const response = await api.get(
      `/screens/${screenId}/current`
    )

    applyScoreboard(response.data)
  } catch (err: any) {
    console.error('Помилка завантаження табло:', err)

    if (err.response?.status === 404) {
      noMatch.value = true
      error.value = ''
    } else if (err.response) {
      error.value = `Помилка ${err.response.status}: ${
        err.response.data?.message || err.response.statusText
      }`
    } else {
      error.value = 'Не вдалося підключити табло'
    }
  } finally {
    loading.value = false
  }
}

const handleUpdated = (payload: any) => {
  applyScoreboard(payload)
}

onMounted(async () => {
  await loadCurrentState()

  socket.emit('screen:join', { screenId })
  socket.emit('screen:join', Number(screenId))

  socket.on('match:updated', handleUpdated)
  socket.on('match.updated', handleUpdated)
})

onBeforeUnmount(() => {
  stopTicker()

  socket.off('match:updated', handleUpdated)
  socket.off('match.updated', handleUpdated)

  socket.disconnect()
})
</script>

<template>
  <div class="screen-view">
    <div v-if="loading" class="message">
      Завантаження табло...
    </div>

    <div v-else-if="error" class="message error">
      {{ error }}
    </div>

    <div v-else-if="noMatch" class="empty-state">
      <div class="empty-title">
        Екран підключено
      </div>

      <div class="empty-subtitle">
        Немає активного матчу
      </div>

      <div class="empty-hint">
        Очікування запуску з адмінки...
      </div>
    </div>

    <ScoreboardDisplay
      v-else
      :scoreboard="scoreboard"
      :displayed-clock="displayedClock"
      :displayed-shot-clock="displayedShotClock"
    />
  </div>
</template>

<style scoped>
.screen-view {
  width: 100vw;
  height: 100dvh;
  overflow: hidden;
  background: #03050a;
  color: #f8fafc;
}

.message,
.empty-state {
  width: 100vw;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: #03050a;
  color: #f8fafc;
}

.message {
  font-size: clamp(26px, 4vw, 58px);
  font-weight: 900;
}

.empty-title {
  font-size: clamp(34px, 5vw, 70px);
  font-weight: 1000;
}

.empty-subtitle {
  font-size: clamp(24px, 3vw, 42px);
  margin-top: 12px;
}

.empty-hint {
  font-size: clamp(18px, 2vw, 28px);
  color: #94a3b8;
  margin-top: 12px;
}

.error {
  color: #fb7185;
}
</style>