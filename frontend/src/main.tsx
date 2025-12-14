import React from 'react'
import {createRoot} from 'react-dom/client'
import './style.css'
import App from './App'
import { I18nProvider } from '@/lib/i18n'

const container = document.getElementById('root')

const root = createRoot(container!)

root.render(
    <React.StrictMode>
        <I18nProvider>
            <App/>
        </I18nProvider>
    </React.StrictMode>
)
