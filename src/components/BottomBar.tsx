import { Gear } from 'phosphor-solid'
import { useConfigStore } from '@/stores/ConfigStore'

export function BottomBar() {
  const conf = useConfigStore()
  return <div class="flex h-6 w-full flex-row items-center pl-2"></div>
}
