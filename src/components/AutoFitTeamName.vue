<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

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

let observer: ResizeObserver | null = null

function fitText() {
  const box = container.value
  const text = textElement.value

  if (!box || !text) return

  const name = props.name.trim()
  const isSingleWord = !/\s/.test(name)

  text.style.whiteSpace = isSingleWord ? 'nowrap' : 'normal'

  text.style.overflowWrap = 'normal'
  text.style.wordBreak = 'normal'

  let size = props.maxFontSize

  text.style.fontSize = `${size}px`

  const availableWidth = box.clientWidth

  if (availableWidth <= 0) return

  while (
    size > props.minFontSize &&
    (text.scrollWidth > availableWidth ||
      (isSingleWord && text.scrollHeight > text.clientHeight))
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
  () => props.name,
  updateSize
)

onMounted(async () => {
  await updateSize()

  if (container.value) {
    observer = new ResizeObserver(updateSize)
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
</style>