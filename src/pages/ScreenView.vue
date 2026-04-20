<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
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
    name: 'TEAM A',
    score: 0,
    timeoutsUsed: 0,
  },
  team2: {
    name: 'TEAM B',
    score: 0,
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

async function loadCurrentState() {
  try {
    loading.value = true
    error.value = ''
    noMatch.value = false

    const { data } = await api.get(`/screens/${screenId}/current`)

    scoreboard.value = {
      team1: {
        name: data.team1?.name ?? 'TEAM A',
        score: data.team1?.score ?? 0,
        timeoutsUsed: data.team1?.timeoutsUsed ?? 0,
      },
      team2: {
        name: data.team2?.name ?? 'TEAM B',
        score: data.team2?.score ?? 0,
        timeoutsUsed: data.team2?.timeoutsUsed ?? 0,
      },
      currentSet: data.currentSet ?? 1,
      status: data.status ?? 'draft',
      isActive: data.isActive ?? false,
      clock: {
        time: data.clock?.time ?? '00:00',
        isRunning: data.clock?.isRunning ?? false,
      },
    }
  } catch (err: any) {
    console.error('Помилка завантаження табло:', err)

    if (err.response?.status === 404) {
      noMatch.value = true
      error.value = ''
    } else if (err.response) {
      error.value = `Помилка ${err.response.status}: ${err.response.data?.message || err.response.statusText}`
    } else if (err.request) {
      error.value = 'Бекенд недоступний або запит блокується'
    } else {
      error.value = `Помилка: ${err.message}`
    }
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadCurrentState()

  socket.emit('screen:join', { screenId })

  socket.on('match:updated', (data: any) => {
    noMatch.value = false

    scoreboard.value = {
      team1: {
        name: data.team1?.name ?? scoreboard.value.team1.name,
        score: data.team1?.score ?? scoreboard.value.team1.score,
        timeoutsUsed: data.team1?.timeoutsUsed ?? scoreboard.value.team1.timeoutsUsed,
      },
      team2: {
        name: data.team2?.name ?? scoreboard.value.team2.name,
        score: data.team2?.score ?? scoreboard.value.team2.score,
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
  })
})

onBeforeUnmount(() => {
  socket.off('match:updated')
  socket.disconnect()
})
</script>

<template>
  <div class="screen">
    <div v-if="loading" class="message">Завантаження...</div>

    <div v-else-if="error" class="message error">
      {{ error }}
    </div>

    <div v-else-if="noMatch" class="empty-state">
      <div class="empty-title">Екран підключено</div>
      <div class="empty-subtitle">Немає активного матчу</div>
      <div class="empty-hint">Очікування запуску з адмінки...</div>
    </div>

    <div v-else class="scoreboard">
      <div class="team">
        <div class="team-name">{{ scoreboard.team1.name }}</div>
        <div class="team-score">{{ scoreboard.team1.score }}</div>
        <div class="team-timeouts">Timeouts: {{ scoreboard.team1.timeoutsUsed }}</div>
      </div>

      <div class="center-info">
        <div class="period">SET {{ scoreboard.currentSet }}</div>
        <div class="clock">{{ scoreboard.clock.time }}</div>
        <div class="status">{{ scoreboard.status }}</div>
      </div>

      <div class="team">
        <div class="team-name">{{ scoreboard.team2.name }}</div>
        <div class="team-score">{{ scoreboard.team2.score }}</div>
        <div class="team-timeouts">Timeouts: {{ scoreboard.team2.timeoutsUsed }}</div>
      </div>
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