import { useHelpStore } from '../store/useHelpStore'
import { HELP_CONTENTS } from '../content/helpContents'
import HelpOverlay from './HelpOverlay'

/** Monté une seule fois dans App.tsx — affiche l'overlay d'aide de la page active. */
export default function HelpHost() {
  const { isOpen, page, close } = useHelpStore()
  if (!isOpen || !page) return null
  return <HelpOverlay content={HELP_CONTENTS[page]} onClose={close} />
}
