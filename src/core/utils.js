// src/core/utils.js
import { Platform } from "react-native"
import ProfileImage from '../assets/profile.png'
import { ADDRESS } from "./api"

function log() {
    // Much better console.log function that formats/indents
    // objects for better readability.
    for (let i = 0; i < arguments.length; i++) {
        let arg = arguments[i]
        // Stringify and indent object
        if (typeof arg === 'object') {
            arg = JSON.stringify(arg, null, 2)
        }
        console.log(`[${Platform.OS}]`,arg)
    }
}

function thumbnail(url) {    
    if (!url) {
        return ProfileImage
    }
    return {        
        uri: 'http://' + ADDRESS + url              
    }
    
}


function formatTime(date) {
    if (date === null) {
        return '-'
    }
    const now = new Date()
    const s = Math.abs(now - new Date(date)) / 1000
    // Seconds:
    if (s < 60) {
        return 'Now'
    }
    // Minutes:
    if (s < 60*60) {
        const m = Math.floor(s / 60)
        return `${m}m ago`
    }
    // Hours:
    if (s < 60*60*24) {
        const h = Math.floor(s / (60*60))
        return `${h}h ago`
    }
    // Days:
    if (s < 60*60*24*7) {
        const d = Math.floor(s / (60*60*24))
        return `${d}d ago`
    }
    // Weeks:
    if (s < 60*60*24*7*4) {
        const w = Math.floor(s / (60*60*24*7))
        return `${w}w ago`
    }
    // Months:
    if (s < 60*60*24*7*4*12) {
        const mns = Math.floor(s / (60*60*24*7*4))
        return `${mns}mns ago`
    }
    // Years:
    const y = Math.floor(s / (60*60*24*365))
    return `${y}y ago`
}

export default { log, thumbnail, formatTime }