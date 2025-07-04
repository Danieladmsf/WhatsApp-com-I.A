// Configurações centralizadas do projeto
require('dotenv').config();

const config = {
    // Firebase
    firebase: {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    },

    // WhatsApp
    whatsapp: {
        authPath: './.wwebjs_auth',
        puppeteerOptions: {
            headless: true,
            executablePath: '/google/idx/builtins/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-web-security',
                '--disable-features=VizDisplayCompositor',
                '--single-process'
            ],
        }
    },

    // Claude Code
    claude: {
        cwd: '/home/user/WHATSAPP',
        maxRetries: 3,
        timeoutMs: 30000,
        maxResponseLength: 4096,
        debugMode: process.env.NODE_ENV === 'development'
    },

    // Firebase Collections
    collections: {
        whatsappConfig: 'whatsapp_config',
        whatsappQueue: 'whatsapp_queue',
        statusDoc: 'status'
    },

    // Rate Limiting
    rateLimit: {
        maxRequestsPerMinute: 10,
        maxRequestsPerHour: 100,
        cooldownMs: 5000
    },

    // Logging
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        enableFirebase: true,
        enableConsole: true
    }
};

// Validação de configurações obrigatórias
const validateConfig = () => {
    const required = [
        'firebase.projectId',
        'firebase.apiKey'
    ];

    for (const path of required) {
        const keys = path.split('.');
        let value = config;
        
        for (const key of keys) {
            value = value?.[key];
        }
        
        if (!value) {
            throw new Error(`Configuração obrigatória não encontrada: ${path}`);
        }
    }
};

module.exports = { config, validateConfig };