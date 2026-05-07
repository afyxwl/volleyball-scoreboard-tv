<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    scoreboard: any
    displayedClock?: string
    displayedShotClock?: string
    preview?: boolean
  }>(),
  {
    displayedClock: '00:00',
    displayedShotClock: '24',
    preview: false,
  }
)

const sportType = computed(() => props.scoreboard?.sportType ?? 'volleyball')
const theme = computed(() => props.scoreboard?.theme ?? {})

const setScores = computed(() => ({
  team1: Array.isArray(props.scoreboard?.setScores?.team1)
    ? props.scoreboard.setScores.team1
    : [],
  team2: Array.isArray(props.scoreboard?.setScores?.team2)
    ? props.scoreboard.setScores.team2
    : [],
}))

const fontMap: Record<string, string> = {
  system: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'Courier New', Consolas, monospace",
  display: "Impact, Haettenschweiler, 'Arial Black', sans-serif",
}

const themeVars = computed(() => ({
  '--team1-color': theme.value.team1Color ?? '#67e8f9',
  '--team2-color': theme.value.team2Color ?? '#fda4af',
  '--board-font': fontMap[theme.value.fontFamily ?? 'system'] ?? fontMap.system,
}))

function mapStatus(status: string) {
  if (status === 'live') return 'Триває'
  if (status === 'paused') return 'Пауза'
  if (status === 'finished') return 'Завершено'
  return 'Чернетка'
}

function setScore(team: 1 | 2, index: number) {
  const list = team === 1 ? setScores.value.team1 : setScores.value.team2
  return list[index] ?? '—'
}

function setWins(team: 1 | 2) {
  const own = team === 1 ? setScores.value.team1 : setScores.value.team2
  const other = team === 1 ? setScores.value.team2 : setScores.value.team1

  return own.reduce((total: number, value: number, index: number) => {
    const opponent = other[index]

    if (typeof value === 'number' && typeof opponent === 'number' && value !== opponent) {
      return total + (value > opponent ? 1 : 0)
    }

    return total
  }, 0)
}
</script>
<template>
  <div
    class="screen-display"
    :class="[
      preview ? 'is-preview' : '',
      sportType === 'basketball' ? 'basketball-mode' : 'volleyball-mode',
    ]"
    :style="themeVars"
  >
    <div v-if="sportType === 'basketball'" class="basketball-board">
      <section class="team-card left-team">
        <div class="team-label">ГОСПОДАРІ</div>
        <div class="team-name">{{ scoreboard.team1.name }}</div>
        <div class="team-score">{{ scoreboard.team1.score }}</div>

        <div class="team-meta">
          <span>Таймаути: {{ scoreboard.team1.timeoutsUsed }}</span>
          <span>Фоли: {{ scoreboard.team1.fouls }}</span>
        </div>
      </section>

      <section class="center-card basketball-center">
        <div class="period">ПЕРІОД {{ scoreboard.currentSet }}</div>
        <div class="clock">{{ displayedClock }}</div>

        <div class="shot-clock-box">
          <span>АТАКА</span>
          <strong>{{ displayedShotClock }}</strong>
        </div>

        <div class="status">{{ mapStatus(scoreboard.status) }}</div>
      </section>

      <section class="team-card right-team">
        <div class="team-label">ГОСТІ</div>
        <div class="team-name">{{ scoreboard.team2.name }}</div>
        <div class="team-score">{{ scoreboard.team2.score }}</div>

        <div class="team-meta">
          <span>Таймаути: {{ scoreboard.team2.timeoutsUsed }}</span>
          <span>Фоли: {{ scoreboard.team2.fouls }}</span>
        </div>
      </section>
    </div>

    <div v-else class="volleyball-board">
      <section class="volley-team left-team">
        <div class="team-label">КОМАНДА 1</div>
        <div class="team-name">{{ scoreboard.team1.name }}</div>

        <div class="match-score-title">РАХУНОК МАТЧУ</div>
        <div class="match-score">{{ setWins(1) }}</div>

        <div class="set-history">
          <div v-for="index in 4" :key="`t1-${index}`" class="set-cell">
            <span>Партія {{ index }}</span>
            <strong>{{ setScore(1, index - 1) }}</strong>
          </div>
        </div>

        <div class="volley-meta">Таймаути: {{ scoreboard.team1.timeoutsUsed }}</div>
      </section>

      <section class="center-card current-set-card">
        <div class="period">СЕТ {{ scoreboard.currentSet }}</div>

        <div class="current-score">
          <span class="current-score-left">{{ scoreboard.team1.score }}</span>
          <span class="score-divider">:</span>
          <span class="current-score-right">{{ scoreboard.team2.score }}</span>
        </div>

        <div class="clock">{{ displayedClock }}</div>
        <div class="match-summary">Матч {{ setWins(1) }} : {{ setWins(2) }}</div>
        <div class="status">{{ mapStatus(scoreboard.status) }}</div>
      </section>

      <section class="volley-team right-team">
        <div class="team-label">КОМАНДА 2</div>
        <div class="team-name">{{ scoreboard.team2.name }}</div>

        <div class="match-score-title">РАХУНОК МАТЧУ</div>
        <div class="match-score">{{ setWins(2) }}</div>

        <div class="set-history">
          <div v-for="index in 4" :key="`t2-${index}`" class="set-cell">
            <span>Партія {{ index }}</span>
            <strong>{{ setScore(2, index - 1) }}</strong>
          </div>
        </div>

        <div class="volley-meta">Таймаути: {{ scoreboard.team2.timeoutsUsed }}</div>
      </section>
    </div>
  </div>
</template>
<style scoped>
.scoreboard-root {
  width: 100vw;
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  background:
    radial-gradient(circle at 25% 20%, rgba(34, 211, 238, 0.12), transparent 30%),
    radial-gradient(circle at 80% 25%, rgba(251, 113, 133, 0.12), transparent 30%),
    #03050a;

  color: #f8fafc;
  box-sizing: border-box;
  padding: clamp(16px, 2vw, 36px);
}

.scoreboard {
  width: 100%;
  height: 100%;

  display: grid;
  grid-template-columns:
    minmax(320px, 1fr)
    clamp(220px, 18vw, 320px)
    minmax(320px, 1fr);

  gap: clamp(18px, 2vw, 40px);

  align-items: center;
}

.team {
  height: min(72vh, 680px);

  background: rgba(3, 7, 18, 0.92);

  border-radius: 34px;

  padding: clamp(20px, 2vw, 36px);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  position: relative;

  overflow: hidden;
}

.team-left {
  border: 3px solid v-bind('scoreboard.theme.team1Color');
  box-shadow: 0 0 38px color-mix(in srgb, v-bind('scoreboard.theme.team1Color') 35%, transparent);
}

.team-right {
  border: 3px solid v-bind('scoreboard.theme.team2Color');
  box-shadow: 0 0 38px color-mix(in srgb, v-bind('scoreboard.theme.team2Color') 35%, transparent);
}

.team-label {
  position: absolute;
  top: 12px;

  font-size: clamp(14px, 1vw, 22px);

  letter-spacing: 0.2em;

  color: #94a3b8;

  text-transform: uppercase;
}

.team-name {
  font-size: clamp(46px, 5vw, 92px);

  font-weight: 1000;

  line-height: 0.95;

  text-align: center;

  text-transform: uppercase;

  word-break: break-word;

  max-width: 100%;
}

.team-left .team-name,
.team-left .team-score {
  color: v-bind('scoreboard.theme.team1Color');

  text-shadow:
    0 0 14px color-mix(in srgb, v-bind('scoreboard.theme.team1Color') 60%, transparent),
    0 0 30px color-mix(in srgb, v-bind('scoreboard.theme.team1Color') 30%, transparent);
}

.team-right .team-name,
.team-right .team-score {
  color: v-bind('scoreboard.theme.team2Color');

  text-shadow:
    0 0 14px color-mix(in srgb, v-bind('scoreboard.theme.team2Color') 60%, transparent),
    0 0 30px color-mix(in srgb, v-bind('scoreboard.theme.team2Color') 30%, transparent);
}

.team-score {
  font-size: clamp(120px, 13vw, 240px);

  font-weight: 1000;

  line-height: 0.85;

  margin-top: clamp(12px, 1vw, 20px);
}

.team-meta {
  position: absolute;
  bottom: 18px;

  display: flex;
  gap: 20px;

  font-size: clamp(18px, 1.5vw, 28px);

  font-weight: 700;

  color: #f8fafc;
}

.center {
  height: min(52vh, 520px);

  background: rgba(3, 7, 18, 0.92);

  border-radius: 34px;

  border: 2px solid rgba(148, 163, 184, 0.2);

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  padding: clamp(16px, 2vw, 30px);
}

.period {
  font-size: clamp(34px, 3vw, 58px);

  font-weight: 1000;

  color: #f8fafc;
}

.clock {
  font-size: clamp(70px, 7vw, 120px);

  font-weight: 1000;

  line-height: 1;

  margin: 12px 0;
}

.status {
  font-size: clamp(20px, 2vw, 34px);

  color: #94a3b8;

  text-transform: uppercase;
}

.shot-clock {
  margin-top: 18px;

  min-width: 120px;

  padding: 10px 18px;

  border-radius: 18px;

  background: rgba(15, 23, 42, 0.95);

  border: 2px solid rgba(251, 191, 36, 0.5);

  text-align: center;
}

.shot-clock-label {
  font-size: 14px;
  color: #fbbf24;
  text-transform: uppercase;
}

.shot-clock-value {
  font-size: clamp(34px, 3vw, 56px);
  font-weight: 1000;
  color: #fde68a;
}

.set-history {
  position: absolute;

  top: 24px;

  display: flex;
  flex-direction: column;

  gap: 10px;
}

.set-history.left {
  left: 18px;
}

.set-history.right {
  right: 18px;
}

.set-box {
  width: 48px;
  height: 48px;

  border-radius: 12px;

  background: rgba(15, 23, 42, 0.92);

  border: 1px solid rgba(148, 163, 184, 0.25);

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 18px;
  font-weight: 900;
}

.preview-mode {
  transform: scale(0.75);
  transform-origin: center;
}
</style>