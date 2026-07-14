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
            { element: '#tour-prompt-editors', popover: { title: 'Prompt Editors', description: 'Prompt editors controlling the mediator\'s responses, should-respond logic, and information bank.' } },
            { element: '#tour-prompt-tab-response', popover: { title: 'Response Prompt Editor', description: 'Response controls what the mediator says. Each prompt block represents a specific type of input to the mediator.' } },
            { element: '#tour-prompt-tab-should-respond', popover: { title: 'Should Respond Editor', description: 'Should Respond decides when the mediator replies.' } },
            { element: '#tour-prompt-tab-preload', popover: { title: 'Information Bank Editor', description: 'Information Bank builds a private information / evidence bank at the beginning of the chat.' } },
            { element: '#tour-template', popover: { title: 'Template file', description: 'Download or upload the mediator template as YAML, and preview the full config.' } },
            { element: '#tour-create', popover: { title: 'Create experiments', description: 'Create an experiment in different modes to test your mediator.' } },
            { element: '#tour-simulate', popover: { title: 'Simulate', description: 'Run agent-agent simulations (with limited daily quota) and download the results once they are done.' } },
            { element: '#tour-show', popover: { title: 'Tour', description: 'Click here to show the tour again.' } },
        ],
    }).drive()
}
