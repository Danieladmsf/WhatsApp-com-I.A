const { config } = require('../config');

class Logger {
    constructor(module = 'System') {
        this.module = module;
        this.logLevel = config.logging.level;
        this.levels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
    }

    formatMessage(level, message, data = null) {
        const timestamp = new Date().toISOString();
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.module}]`;
        
        if (data) {
            return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
        }
        return `${prefix} ${message}`;
    }

    shouldLog(level) {
        return this.levels[level] <= this.levels[this.logLevel];
    }

    error(message, data = null) {
        if (!this.shouldLog('error')) return;
        
        const formattedMessage = this.formatMessage('error', message, data);
        console.error(`🔴 ${formattedMessage}`);
        
        if (config.logging.enableFirebase) {
            this.logToFirebase('error', message, data);
        }
    }

    warn(message, data = null) {
        if (!this.shouldLog('warn')) return;
        
        const formattedMessage = this.formatMessage('warn', message, data);
        console.warn(`🟡 ${formattedMessage}`);
        
        if (config.logging.enableFirebase) {
            this.logToFirebase('warn', message, data);
        }
    }

    info(message, data = null) {
        if (!this.shouldLog('info')) return;
        
        const formattedMessage = this.formatMessage('info', message, data);
        console.log(`✅ ${formattedMessage}`);
        
        if (config.logging.enableFirebase) {
            this.logToFirebase('info', message, data);
        }
    }

    debug(message, data = null) {
        if (!this.shouldLog('debug')) return;
        
        const formattedMessage = this.formatMessage('debug', message, data);
        console.log(`🔍 ${formattedMessage}`);
    }

    // Log estruturado para diferentes tipos de eventos
    whatsappMessage(direction, sender, message) {
        const emoji = direction === 'received' ? '📨' : '📤';
        this.info(`${emoji} WhatsApp ${direction}`, {
            sender,
            message: message.substring(0, 100),
            timestamp: new Date().toISOString()
        });
    }

    claudeProcessing(sender, message, duration = null) {
        if (duration) {
            this.info(`🤖 Claude processou mensagem em ${duration}ms`, {
                sender,
                messageLength: message.length
            });
        } else {
            this.info(`🤖 Claude processando mensagem`, { sender });
        }
    }

    firebaseOperation(operation, collection, result) {
        this.info(`🔥 Firebase ${operation}`, {
            collection,
            success: result === 'success'
        });
    }

    rateLimitHit(sender) {
        this.warn(`⏰ Rate limit atingido`, { sender });
    }

    systemEvent(event, data = null) {
        this.info(`⚙️ Sistema: ${event}`, data);
    }

    async logToFirebase(level, message, data = null) {
        // Implementação futura para logs no Firebase
        // Por enquanto, apenas preparar a estrutura
        try {
            // TODO: Implementar logging no Firebase Firestore
            // const logEntry = {
            //     level,
            //     module: this.module,
            //     message,
            //     data,
            //     timestamp: serverTimestamp()
            // };
        } catch (error) {
            console.error('Erro ao salvar log no Firebase:', error);
        }
    }

    // Método para criar logs de performance
    performance(operation, startTime, data = null) {
        const duration = Date.now() - startTime;
        this.info(`⚡ Performance: ${operation} completado em ${duration}ms`, data);
        return duration;
    }

    // Método para logs de métricas
    metrics(metric, value, unit = '') {
        this.info(`📊 Métrica: ${metric} = ${value}${unit}`);
    }
}

module.exports = Logger;