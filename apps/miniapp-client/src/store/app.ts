import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
    const scrollLocked = ref(false)

    const setScrollLocked = (locked: boolean) => {
        scrollLocked.value = locked
    }

    return {
        scrollLocked,
        setScrollLocked,
    }
})
