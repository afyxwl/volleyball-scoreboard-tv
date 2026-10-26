
import '@fontsource/roboto-condensed/latin-700.css'
import '@fontsource/roboto-condensed/cyrillic-700.css'

import '@fontsource/roboto-condensed/latin-500.css'
import '@fontsource/roboto-condensed/cyrillic-500.css'


import '@fontsource/roboto/latin-900.css'
import '@fontsource/roboto/cyrillic-900.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'
import './assets/main.css'

createApp(App).use(router).mount('#app')