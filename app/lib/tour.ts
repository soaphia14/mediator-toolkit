type TourStep = {
  element: string
  popover: { title: string; description: string }
}

const TOUR_STEPS: TourStep[] = [
  { element: '#tour-template-name', popover: { title: '', description: 'Your mediator\'s name.' } },
  { element: '#tour-save', popover: { title: '', description: 'Save the current version of your mediator. You can design multiple mediators.' } },
  { element: '#tour-load-default', popover: { title: '', description: 'Go back to the default Mediator template.' } },
  { element: '#tour-prompt-editors', popover: { title: 'Prompt Editors', description: 'Prompt editors: this is the soul of your Mediator, the prompts determine when and how it intervenes. Be creative!' } },
  { element: '#tour-prompt-tab-response', popover: { title: 'Intervention Prompt Editor', description: 'Intervention prompt editor: here you design how the Mediator intervenes. You can combine different prompt-blocks (such as the topic being discussed, the content of the chat, etc.).' } },
  { element: '#tour-prompt-tab-should-respond', popover: { title: 'Should Intervene Editor', description: 'Your mediator uses this prompt after each message in the discussion to decide whether this is a good time to intervene.' } },
  { element: '#tour-prompt-tab-initialization', popover: { title: 'Initialization Prompt Editor', description: 'A prompt that is run at the start of the conversation to gather information about the topic, participants, or anything else. This is information that can subsequently be accessed by your mediator during the conversation.' } },
  { element: '#tour-add-item', popover: { title: 'Add Item', description: 'Here you can add to your prompt any of the prompt blocks listed above, or a Freeform Text block. You can edit and reorder the sequence of blocks to obtain unique instructions for your Mediator.' } },
  { element: '#tour-chat-settings', popover: { title: 'Mediator Parameters', description: 'Mediator parameters: here you can change different parameters that dictate how your mediator behaves.' } },
  { element: '#tour-template-download', popover: { title: 'Export your Mediator', description: 'You will need this to submit it to the competition.' } },
  { element: '#tour-create', popover: { title: 'Test your mediators', description: 'You can test your mediator and see how the participants will experience it during the discussion. You can test it in a discussion between you and a friend, with an agent, or by seeing how two agents discuss with each other.' } },
  { element: '#tour-simulate', popover: { title: 'Simulate', description: 'You can optionally run multiple discussions with agents to see how your Mediator behaves across multiple scenarios. We provide a notebook to help you look at the results. (Note that the simulations are resource-intensive, so they will take some time to run and there is a limit of how many you can run each day.)' } },
  { element: '#tour-show', popover: { title: 'Tour', description: 'Click here to show the tour again.' } },
]

let currentTour: { overlay: HTMLDivElement; card: HTMLDivElement; cleanup: () => void } | null = null

function destroyTour() {
  if (!currentTour) return
  document.body.removeChild(currentTour.overlay)
  document.body.removeChild(currentTour.card)
  currentTour.cleanup()
  currentTour = null
}

export function startTour() {
  if (typeof window === 'undefined') return

  if (currentTour) {
    destroyTour()
  }

  const overlay = document.createElement('div')
  overlay.id = 'mediator-tour-overlay'
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'rgba(0, 0, 0, 0.65)'
  overlay.style.zIndex = '9998'
  overlay.style.cursor = 'pointer'

  const card = document.createElement('div')
  card.style.position = 'fixed'
  card.style.zIndex = '9999'
  card.style.maxWidth = '320px'
  card.style.width = 'min(320px, calc(100vw - 2rem))'
  card.style.padding = '1rem'
  card.style.borderRadius = '0.75rem'
  card.style.background = '#171717'
  card.style.border = '1px solid #404040'
  card.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.35)'
  card.style.color = '#f5f5f5'
  card.style.fontFamily = 'sans-serif'

  const spotlight = document.createElement('div')
  spotlight.style.position = 'fixed'
  spotlight.style.border = '3px solid #ffffff'
  spotlight.style.borderRadius = '0.75rem'
  spotlight.style.boxShadow = '0 0 0 9999px rgba(0, 0, 0, 0.65)'
  spotlight.style.pointerEvents = 'none'
  spotlight.style.zIndex = '9999'

  let stepIndex = 0

  const updateStep = () => {
    const step = TOUR_STEPS[stepIndex]
    const target = document.querySelector(step.element) as HTMLElement | null

    spotlight.style.display = 'none'
    card.innerHTML = ''

    if (target) {
      const rect = target.getBoundingClientRect()
      spotlight.style.display = 'block'
      spotlight.style.left = `${rect.left - 8}px`
      spotlight.style.top = `${rect.top - 8}px`
      spotlight.style.width = `${rect.width + 16}px`
      spotlight.style.height = `${rect.height + 16}px`

      const cardWidth = 320
      let left = rect.left + rect.width / 2 - cardWidth / 2
      let top = rect.bottom + 12

      if (left < 16) left = 16
      if (left + cardWidth > window.innerWidth - 16) left = window.innerWidth - cardWidth - 16
      if (top + 180 > window.innerHeight - 16) top = rect.top - 180

      card.style.left = `${Math.max(16, left)}px`
      card.style.top = `${Math.max(16, top)}px`
    } else {
      card.style.left = '50%'
      card.style.top = '50%'
      card.style.transform = 'translate(-50%, -50%)'
    }

    const title = step.popover.title
    const description = step.popover.description

    const heading = document.createElement('div')
    heading.style.fontSize = '1rem'
    heading.style.fontWeight = '600'
    heading.style.marginBottom = '0.5rem'
    heading.textContent = title || `Step ${stepIndex + 1}`

    const body = document.createElement('div')
    body.style.fontSize = '0.95rem'
    body.style.lineHeight = '1.5'
    body.style.color = '#d4d4d4'
    body.style.marginBottom = '0.75rem'
    body.textContent = description

    const footer = document.createElement('div')
    footer.style.display = 'flex'
    footer.style.justifyContent = 'space-between'
    footer.style.alignItems = 'center'
    footer.style.gap = '0.5rem'
    footer.style.marginTop = '0.5rem'

    const progress = document.createElement('div')
    progress.style.fontSize = '0.8rem'
    progress.style.color = '#a3a3a3'
    progress.textContent = `${stepIndex + 1}/${TOUR_STEPS.length}`

    const controls = document.createElement('div')
    controls.style.display = 'flex'
    controls.style.gap = '0.5rem'

    const prevButton = document.createElement('button')
    prevButton.textContent = 'Back'
    prevButton.style.padding = '0.4rem 0.7rem'
    prevButton.style.borderRadius = '0.45rem'
    prevButton.style.border = '1px solid #525252'
    prevButton.style.background = '#262626'
    prevButton.style.color = '#f5f5f5'
    prevButton.style.cursor = 'pointer'
    prevButton.addEventListener('click', () => {
      if (stepIndex > 0) {
        stepIndex -= 1
        updateStep()
      }
    })

    const nextButton = document.createElement('button')
    nextButton.textContent = stepIndex === TOUR_STEPS.length - 1 ? 'Done' : 'Next'
    nextButton.style.padding = '0.4rem 0.7rem'
    nextButton.style.borderRadius = '0.45rem'
    nextButton.style.border = '1px solid #525252'
    nextButton.style.background = '#2563eb'
    nextButton.style.color = '#ffffff'
    nextButton.style.cursor = 'pointer'
    nextButton.addEventListener('click', () => {
      if (stepIndex < TOUR_STEPS.length - 1) {
        stepIndex += 1
        updateStep()
      } else {
        destroyTour()
      }
    })

    controls.append(prevButton, nextButton)
    footer.append(progress, controls)

    card.append(heading, body, footer)
  }

  overlay.addEventListener('click', () => destroyTour())

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') destroyTour()
    if (event.key === 'ArrowRight' && stepIndex < TOUR_STEPS.length - 1) {
      stepIndex += 1
      updateStep()
    }
    if (event.key === 'ArrowLeft' && stepIndex > 0) {
      stepIndex -= 1
      updateStep()
    }
  }

  document.body.append(overlay, spotlight, card)
  window.addEventListener('resize', updateStep)
  document.addEventListener('keydown', onKeyDown)

  currentTour = {
    overlay,
    card,
    cleanup: () => {
      window.removeEventListener('resize', updateStep)
      document.removeEventListener('keydown', onKeyDown)
    },
  }

  updateStep()
}

