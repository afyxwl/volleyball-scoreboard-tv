import { createRouter, createWebHistory } from 'vue-router'
import ScreenView from '../pages/ScreenView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/screens/:id',
      name: 'screen',
      component: ScreenView,
    },
  ],
})

export default router