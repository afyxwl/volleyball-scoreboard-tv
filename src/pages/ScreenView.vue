<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '../services/api'
import { createSocket } from '../services/socket'

const route = useRoute()
const screenId = route.params.id

const loading = ref(true)
const error = ref('')
const noMatch = ref(false)
const socket = createSocket()

const scoreboard = ref({
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
  },
})

const displayedClock = ref('00:00')
let timerId: number | null = null

function parseClock(value: string) {
  const [mm, ss] = (value || '00:00').split(':').map(Number)
  return (mm || 0) * 60 + (ss || 0)
}

function formatClock(total: number) {
  const safe = Math.max(0, total)
  const mm = String(Math.floor(safe / 60)).padStart(2, '0')
  const ss = String(safe % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

function stopTicker() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

function startTicker() {
  stopTicker()

  let seconds = parseClock(scoreboard.value.clock.time || '00:00')
  displayedClock.value = formatClock(seconds)

  if (scoreboard.value.status !== 'live') return

  timerId = window.setInterval(() => {
    seconds += 1
    displayedClock.value = formatClock(seconds)
  }, 1000)
}

watch(
  () => [scoreboard.value.clock.time, scoreboard.value.status],
  () => startTicker(),
  { immediate: true }
)

function mapStatus(status: string) {
  if (status === 'live') return 'Триває'
  if (status === 'paused') return 'Пауза'
  if (status === 'finished') return 'Завершено'
  return 'Чернетка'
}

function applyScoreboard(payload: any) {
  const data = payload?.data ?? payload
  noMatch.value = false

  scoreboard.value = {
    team1: {
      name: data.team1?.name ?? scoreboard.value.team1.name,
      score: data.team1?.score ?? scoreboard.value.team1.score,
      fouls: data.team1?.fouls ?? scoreboard.value.team1.fouls,
      timeoutsUsed: data.team1?.timeoutsUsed ?? scoreboard.value.team1.timeoutsUsed,
    },
    team2: {
      name: data.team2?.name ?? scoreboard.value.team2.name,
      score: data.team2?.score ?? scoreboard.value.team2.score,
      fouls: data.team2?.fouls ?? scoreboard.value.team2.fouls,
      timeoutsUsed: data.team2?.timeoutsUsed ?? scoreboard.value.team2.timeoutsUsed,
    },
    currentSet: data.currentSet ?? scoreboard.value.currentSet,
    status: data.status ?? scoreboard.value.status,
    isActive: data.isActive ?? scoreboard.value.isActive,
    clock: {
      time: data.clock?.time ?? scoreboard.value.clock.time,
      isRunning: data.clock?.isRunning ?? scoreboard.value.clock.isRunning,
    },
  }
}

async function loadCurrentState() {
  try {
    loading.value = true
    error.value = ''
    noMatch.value = false

    const response = await api.get(`/screens/${screenId}/current`)
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
  <div class="screen">
    <div v-if="loading" class="message">Завантаження табло...</div>

    <div v-else-if="error" class="message error">
      {{ error }}
    </div>

    <div v-else-if="noMatch" class="empty-state">
      <div class="empty-title">Екран підключено</div>
      <div class="empty-subtitle">Немає активного матчу</div>
      <div class="empty-hint">Очікування запуску з адмінки...</div>
    </div>

    <div v-else class="scoreboard">
      <section class="team left-team">
        <div class="team-label">ГОСПОДАРІ</div>
        <div class="team-name">{{ scoreboard.team1.name }}</div>
        <div class="team-score">{{ scoreboard.team1.score }}</div>
        <div class="team-meta">
          <span>Таймаути: {{ scoreboard.team1.timeoutsUsed }}</span>
          <span>Фоли: {{ scoreboard.team1.fouls }}</span>
        </div>
      </section>

      <section class="center-info">
        <div class="period">СЕТ {{ scoreboard.currentSet }}</div>
        <div class="clock">{{ displayedClock }}</div>
        <div class="status">{{ mapStatus(scoreboard.status) }}</div>
      </section>

      <section class="team right-team">
        <div class="team-label">ГОСТІ</div>
        <div class="team-name">{{ scoreboard.team2.name }}</div>
        <div class="team-score">{{ scoreboard.team2.score }}</div>
        <div class="team-meta">
          <span>Таймаути: {{ scoreboard.team2.timeoutsUsed }}</span>
          <span>Фоли: {{ scoreboard.team2.fouls }}</span>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.screen {
  min-height: 100vh;
  background: #0f1115;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.message,
.empty-state {
  text-align: center;
}
.error {
  color: #f87171;
}
.empty-title {
  font-size: 48px;
  font-weight: 800;
  margin-bottom: 12px;
}
.empty-subtitle {
  font-size: 28px;
  margin-bottom: 10px;
}
.empty-hint {
  font-size: 18px;
  opacity: 0.75;
}
.scoreboard {
  width: 100%;
  max-width: 1500px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 32px;
  align-items: center;
}
.team {
  text-align: center;
}
.team-name {
  font-size: 46px;
  font-weight: 700;
  margin-bottom: 18px;
}
.team-score {
  font-size: 150px;
  font-weight: 900;
  line-height: 1;
}
.team-timeouts {
  margin-top: 18px;
  font-size: 28px;
}
.center-info {
  text-align: center;
}
.period {
  font-size: 40px;
  margin-bottom: 16px;
}
.clock {
  font-size: 72px;
  font-weight: 800;
  margin-bottom: 16px;
}
.status {
  font-size: 24px;
  opacity: 0.8;
}
</style>