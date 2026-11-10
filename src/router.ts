import { createRouter, createWebHashHistory } from 'vue-router'

// Share links look like https://app/?e=<payload>. Route them to the event page.
const e = new URLSearchParams(location.search).get('e')
if (e) {
  history.replaceState(null, '', location.pathname + '#/e/' + e)
}


export const router = createRouter({
  // Hash history works on any static host (Netlify, Vercel, GitHub Pages) with no rewrites.
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: () => import('./views/Tickets.vue') },
    { path: '/host', component: () => import('./views/Host.vue') },
    { path: '/host/new', component: () => import('./views/CreateEvent.vue') },
    { path: '/host/:id', component: () => import('./views/Manage.vue'), props: true },
    { path: '/host/:id/door', component: () => import('./views/Door.vue'), props: true },
    { path: '/e/:payload', component: () => import('./views/EventPage.vue'), props: true },
    { path: '/t/:hash', component: () => import('./views/TicketView.vue'), props: true },
    { path: '/about', component: () => import('./views/About.vue') },
    { path: '/:p(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
