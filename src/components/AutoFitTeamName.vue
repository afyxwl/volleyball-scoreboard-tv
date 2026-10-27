<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  ref,
  watch,
} from 'vue'

const props = withDefaults(
  defineProps<{
    name: string
    maxFontSize?: number
    minFontSize?: number
  }>(),
  {
    maxFontSize: 92,
    minFontSize: 18,
  }
)

const container = ref<HTMLElement | null>(null)
const textElement = ref<HTMLElement | null>(null)

const fontSize = ref(props.maxFontSize)

const isSingleWord = computed(() => {
  return !/\s/.test(props.name.trim())
})

let observer: ResizeObserver | null = null

function fitText() {
  const box = container.value
  const text = textElement.value

  if (!box || !text) return

  const availableWidth = box.clientWidth

  if (availableWidth <= 0) return

  // Починаємо з максимального розміру.
  let size = props.maxFontSize

  text.style.fontSize = `${size}px`
  text.style.whiteSpace = isSingleWord.value ? 'nowrap' : 'normal'

  // Забороняємо переносити частини одного слова.
  text.style.wordBreak = 'normal'
  text.style.overflowWrap = 'normal'
  text.style.hyphens = 'none'

  // Перевіряємо тільки ширину тексту.
  // Не використовуємо scrollHeight/clientHeight.
  while (
    size > props.minFontSize &&
    text.scrollWidth > availableWidth
  ) {
    size -= 1
    text.style.fontSize = `${size}px`
  }

  fontSize.value = size
}

async function updateSize() {
  await nextTick()
  fitText()
}

watch(
  () => [props.name, props.maxFontSize, props.minFontSize],
  updateSize
)

onMounted(async () => {
  await updateSize()

  if (container.value) {
    observer = new ResizeObserver(() => {
      updateSize()
    })

    observer.observe(container.value)
  }

  if (document.fonts) {
    document.fonts.ready.then(updateSize)
  }
})

onBeforeUnmount(() => {
  observer?.disconnect()
})
</script>

<template>
  <div ref="container" class="team-name-container">
    <div
      ref="textElement"
      class="team-name-text"
      :class="{ 'single-word': isSingleWord }"
      :style="{ fontSize: `${fontSize}px` }"
    >
      {{ name }}
    </div>
  </div>
</template>

<style scoped>
.team-name-container {
  width: 100%;
  min-width: 0;
}

.team-name-text {
  width: 100%;

  font-family: 'Roboto Condensed', sans-serif;
  font-weight: 700;

  text-align: center;
  text-transform: uppercase;

  line-height: 1.05;
  letter-spacing: 0.01em;

  -webkit-text-stroke: 1.5px currentColor;

  white-space: normal;
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;
}

.team-name-text.single-word {
  white-space: nowrap;
}
</style>