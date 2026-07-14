import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function startTour() {
    driver({
        showProgress: true,
        steps: [
            { element: '#tour-template-name', popover: { title: 'Templates', description: 'Template name.' } },
            { element: '#tour-save', popover: { title: 'Templates', description: 'Save the mediator template.' } },
            { element: '#tour-load-default', popover: { title: 'Templates', description: 'Restore the starting template.' } },
            { element: '#tour-chat-settings', popover: { title: 'Chat Settings', description: 'Typing speed, response gate, temperature, and the initial message the mediator sends.' } },
            { element: '#tour-prompt-editors', popover: { title: 'Prompt Editors', description: 'Prompt editors controlling the mediator\'s interventions, should-intervene logic, and initialization results.' } },
            { element: '#tour-prompt-tab-response', popover: { title: 'Intervention Prompt Editor', description: 'Intervention Prompt controls what the mediator says. Each prompt block represents a specific type of input to the mediator.' } },
            { element: '#tour-prompt-tab-should-respond', popover: { title: 'Should Intervene Editor', description: 'Should Intervene decides when the mediator intervenes.' } },
            { element: '#tour-prompt-tab-preload', popover: { title: 'Initialization Prompt Editor', description: 'Initialization Prompt builds private information at the beginning of the chat.' } },
            { element: '#tour-template', popover: { title: 'Template file', description: 'Download or upload the mediator template as YAML, and preview the full config.' } },
            { element: '#tour-create', popover: { title: 'Create experiments', description: 'Create an experiment in different modes to test your mediator.' } },
            { element: '#tour-simulate', popover: { title: 'Simulate', description: 'Run agent-agent simulations (with limited daily quota) and download the results once they are done.' } },
            { element: '#tour-show', popover: { title: 'Tour', description: 'Click here to show the tour again.' } },
        ],
    }).drive()
}
