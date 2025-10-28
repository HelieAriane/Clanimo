// src/composables/useToast.ts
import { toastController } from '@ionic/vue'

type ToastOpts = {
  message: string
  color?: 'success' | 'warning' | 'danger' | 'medium' | 'primary' | 'tertiary'
  duration?: number
  icon?: string // e.g. "checkmark-circle-outline"
}

export function useToast() {
  async function show({
    message,
    color = 'medium',
    duration = 2200,
    icon
  }: ToastOpts) {
    const t = await toastController.create({
      message,
      duration,
      color,
      position: 'bottom',
      icon
    })
    await t.present()
  }

  return {
    success: (msg: string) => show({ message: msg, color: 'success', icon: 'checkmark-circle-outline' }),
    warn: (msg: string) => show({ message: msg, color: 'warning', icon: 'alert-circle-outline' }),
    error: (msg: string) => show({ message: msg, color: 'danger', icon: 'close-circle-outline' }),
    info: (msg: string) => show({ message: msg, color: 'medium' })
  }
}
