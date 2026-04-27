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
  width: 100vw;
  background:
    radial-gradient(circle at 25% 20%, rgba(34, 211, 238, 0.12), transparent 30%),
    radial-gradient(circle at 80% 25%, rgba(251, 113, 133, 0.12), transparent 30%),
    #03050a;
  color: #f8fafc;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  overflow: hidden;
}

.scoreboard {
  width: 100%;
  max-width: 1700px;
  display: grid;
  grid-template-columns: minmax(360px, 1fr) 300px minmax(360px, 1fr);
  gap: 42px;
  align-items: center;
}

.team,
.center-info {
  background: rgba(3, 7, 18, 0.92);
  border-radius: 34px;
  min-height: 420px;
  padding: 42px;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.75);
}

.left-team {
  border: 3px solid #22d3ee;
  box-shadow: 0 0 38px rgba(34, 211, 238, 0.18);
}

.right-team {
  border: 3px solid #fb7185;
  box-shadow: 0 0 38px rgba(251, 113, 133, 0.18);
}

.team {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.team-label {
  font-size: 22px;
  letter-spacing: 0.2em;
  color: #94a3b8;
  margin-bottom: 10px;
}

.team-name {
  font-size: clamp(44px, 5vw, 86px);
  font-weight: 1000;
  text-transform: uppercase;
  text-align: center;
  line-height: 1;
  margin-bottom: 28px;
}

.left-team .team-name,
.left-team .team-score {
  color: #67e8f9;
  text-shadow: 0 0 22px rgba(34, 211, 238, 0.45);
}

.right-team .team-name,
.right-team .team-score {
  color: #fda4af;
  text-shadow: 0 0 22px rgba(251, 113, 133, 0.45);
}

.team-score {
  font-size: clamp(150px, 15vw, 280px);
  font-weight: 1000;
  line-height: 0.85;
  letter-spacing: 4px;
}

.team-meta {
  margin-top: 30px;
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 28px;
  font-weight: 700;
  color: #e2e8f0;
}

.center-info {
  min-height: 320px;
  border: 2px solid rgba(148, 163, 184, 0.3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.period {
  font-size: 48px;
  font-weight: 1000;
  color: #e2e8f0;
}

.clock {
  font-size: 82px;
  font-weight: 1000;
  line-height: 1;
  margin: 18px 0;
  letter-spacing: 2px;
}

.status {
  font-size: 30px;
  color: #94a3b8;
  text-transform: uppercase;
}

.message,
.empty-state {
  text-align: center;
}

.empty-title {
  font-size: 58px;
  font-weight: 1000;
}

.empty-subtitle {
  font-size: 34px;
  margin-top: 10px;
}

.empty-hint {
  font-size: 22px;
  color: #94a3b8;
  margin-top: 10px;
}

.error {
  color: #fb7185;
}

@media (max-width: 1100px) {
  .screen {
    padding: 24px;
  }

  .scoreboard {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .center-info {
    order: -1;
    min-height: auto;
  }

  .team {
    min-height: 300px;
  }

  .team-score {
    font-size: 140px;
  }
}
</style>