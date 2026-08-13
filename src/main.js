import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Pinch-zoom is deliberately disabled (stage tool: an accidental pinch while
// grabbing the phone mid-song shouldn't leave the UI zoomed). Android/Chrome
// honors user-scalable=no in the viewport meta; iOS Safari ignores it, but
// does expose pinches as WebKit-proprietary gesture events whose default can
// be prevented. Double-tap zoom is covered by touch-action in style.css.
document.addEventListener('gesturestart', (event) => event.preventDefault())

createApp(App).mount('#app')
