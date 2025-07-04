#!/usr/bin/env node

// WhatsApp + Claude Code Bridge - Versão Escalável
// Arquitetura modular com logging, rate limiting, monitoramento e cache

const { Client, LocalAuth } = require('whatsapp-web.js');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp, collection, query, where, onSnapshot, updateDoc } = require('firebase/firestore');
const qrcode = require('qrcode');

// Importar módulos customizados
const { config, validateConfig } = require('./config');
const ClaudeHandler = require('./handlers/ClaudeHandler');
const RateLimiter = require('./middleware/RateLimiter');
const MonitoringService = require('./services/MonitoringService');
const Logger = require('./utils/Logger');

class WhatsAppClaudeBridge {
    constructor() {
        this.logger = new Logger('WhatsAppBridge');
        this.client = null;
        this.db = null;
        this.claudeHandler = null;
        this.rateLimiter = null;
        this.monitoring = null;
        this.isInitialized = false;
    }

    async initialize() {
        try {
            this.logger.systemEvent('Iniciando WhatsApp Claude Bridge...');
            
            // Validar configurações
            validateConfig();
            this.logger.info('✅ Configurações validadas');

            // Inicializar serviços
            await this.initializeServices();
            
            // Inicializar Firebase
            await this.initializeFirebase();
            
            // Inicializar WhatsApp
            await this.initializeWhatsApp();
            
            // Marcar como inicializado
            this.isInitialized = true;
            
            this.logger.systemEvent('Sistema inicializado com sucesso');
            
        } catch (error) {
            this.logger.error('Erro crítico na inicialização:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            process.exit(1);
        }
    }

    async initializeServices() {
        // Inicializar monitoramento
        this.monitoring = new MonitoringService();
        this.logger.info('📊 Sistema de monitoramento iniciado');

        // Inicializar rate limiter
        this.rateLimiter = new RateLimiter();
        this.logger.info('⏰ Rate limiter iniciado');

        // Inicializar Claude handler
        this.claudeHandler = new ClaudeHandler();
        this.logger.info('🤖 Claude handler iniciado');
    }

    async initializeFirebase() {
        try {
            const app = initializeApp(config.firebase);
            this.db = getFirestore(app);
            
            this.logger.firebaseOperation('inicializado', config.firebase.projectId, 'success');
            
        } catch (error) {
            this.logger.error('Erro ao inicializar Firebase:', error);
            throw error;
        }
    }

    async initializeWhatsApp() {
        try {
            // Criar cliente WhatsApp
            this.client = new Client({
                authStrategy: new LocalAuth({ dataPath: config.whatsapp.authPath }),
                puppeteer: config.whatsapp.puppeteerOptions
            });

            // Configurar event listeners
            this.setupWhatsAppEvents();

            // Inicializar cliente
            await this.updateFirebaseStatus({ status: 'initializing' });
            await this.client.initialize();
            
        } catch (error) {
            await this.updateFirebaseStatus({ 
                status: 'disconnected', 
                error: error.message 
            });
            throw error;
        }
    }

    setupWhatsAppEvents() {
        // QR Code
        this.client.on('qr', async (qr) => {
            this.logger.systemEvent('QR Code gerado');
            
            try {
                const qrDataUri = await qrcode.toDataURL(qr);
                await this.updateFirebaseStatus({
                    status: 'needs_qr',
                    qrDataUri: qrDataUri,
                    generatedAt: serverTimestamp()
                });
                
                this.logger.info('📱 QR Code enviado para Firebase');
                
            } catch (error) {
                this.logger.error('Erro ao processar QR Code:', error);
            }
        });

        // Autenticação
        this.client.on('authenticated', () => {
            this.logger.systemEvent('WhatsApp autenticado');
        });

        // Cliente pronto
        this.client.on('ready', async () => {
            this.logger.systemEvent('WhatsApp conectado e pronto');
            
            await this.updateFirebaseStatus({ 
                status: 'connected', 
                qrDataUri: null, 
                readyAt: serverTimestamp() 
            });
            
            this.startMessageQueue();
        });

        // Mensagem recebida
        this.client.on('message', async (message) => {
            await this.handleIncomingMessage(message);
        });

        // Desconexão
        this.client.on('disconnected', async (reason) => {
            this.logger.warn(`WhatsApp desconectado: ${reason}`);
            
            await this.updateFirebaseStatus({ 
                status: 'disconnected', 
                disconnectedAt: serverTimestamp() 
            });
        });

        // Erros
        this.client.on('auth_failure', (message) => {
            this.logger.error('Falha de autenticação WhatsApp:', message);
        });
    }

    async handleIncomingMessage(message) {
        // Filtrar mensagens inválidas
        if (message.from.endsWith('@g.us') || 
            message.fromMe || 
            message.isStatus || 
            message.from.endsWith('@newsletter')) {
            return;
        }

        const senderId = message.from;
        const messageText = message.body;
        const startTime = Date.now();

        this.monitoring.recordMessageReceived(senderId);
        this.logger.whatsappMessage('received', senderId, messageText);

        try {
            // Verificar rate limiting
            const rateLimitResult = await this.rateLimiter.checkLimit(senderId, messageText);
            
            if (!rateLimitResult.allowed) {
                await this.client.sendMessage(senderId, rateLimitResult.message);
                this.monitoring.recordRateLimitHit(senderId);
                return;
            }

            // Processar com Claude
            const response = await this.claudeHandler.processMessage(senderId, messageText);
            
            // Enviar resposta
            if (response && response.trim()) {
                await this.client.sendMessage(senderId, response);
                
                const responseTime = Date.now() - startTime;
                this.monitoring.recordMessageProcessed(senderId, responseTime);
                
                this.logger.whatsappMessage('sent', senderId, response);
                
            } else {
                throw new Error('Resposta vazia do Claude');
            }

        } catch (error) {
            this.logger.error(`Erro ao processar mensagem de ${senderId}:`, error);
            this.monitoring.recordMessageFailed(senderId, error.message);
            
            // Enviar mensagem de erro amigável
            const errorMessage = "Desculpe, não consegui processar sua mensagem no momento. Tente novamente em alguns instantes.";
            await this.client.sendMessage(senderId, errorMessage);
        }
    }

    startMessageQueue() {
        this.logger.systemEvent('Iniciando listener da fila de mensagens');
        
        const q = query(
            collection(this.db, config.collections.whatsappQueue), 
            where("status", "==", "pending")
        );

        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) return;
            
            this.logger.info(`📬 ${snapshot.size} mensagem(ns) na fila`);
            
            snapshot.docs.forEach(async (docSnapshot) => {
                await this.processQueueMessage(docSnapshot);
            });
        }, (error) => {
            this.logger.error("Erro na fila de mensagens:", error);
        });
    }

    async processQueueMessage(docSnapshot) {
        const messageData = docSnapshot.data();
        const messageId = docSnapshot.id;
        const { phoneNumber, message } = messageData;
        
        const chatId = `${phoneNumber}@c.us`;
        
        try {
            this.logger.info(`📤 Enviando mensagem da fila: ${messageId}`);
            
            await this.client.sendMessage(chatId, message);
            
            // Marcar como enviada
            const messageDocRef = doc(this.db, config.collections.whatsappQueue, messageId);
            await updateDoc(messageDocRef, {
                status: 'sent',
                processedAt: serverTimestamp()
            });
            
            this.logger.info(`✅ Mensagem ${messageId} enviada com sucesso`);
            
        } catch (error) {
            this.logger.error(`❌ Erro ao enviar mensagem ${messageId}:`, error);
            
            // Marcar como falhou
            const messageDocRef = doc(this.db, config.collections.whatsappQueue, messageId);
            await updateDoc(messageDocRef, {
                status: 'failed',
                error: error.message || 'Erro desconhecido',
                processedAt: serverTimestamp()
            });
        }
    }

    async updateFirebaseStatus(statusData) {
        try {
            const statusDocRef = doc(this.db, config.collections.whatsappConfig, config.collections.statusDoc);
            await setDoc(statusDocRef, { 
                ...statusData, 
                updatedAt: serverTimestamp() 
            }, { merge: true });
            
            this.logger.firebaseOperation('status_update', config.collections.whatsappConfig, 'success');
            
        } catch (error) {
            this.logger.error('Erro ao atualizar status no Firebase:', error);
        }
    }

    // API para métricas e monitoramento
    getSystemStats() {
        if (!this.monitoring) return null;
        
        return {
            system: this.monitoring.getStatistics(),
            health: this.monitoring.getHealthStatus(),
            alerts: this.monitoring.getRecentAlerts(30),
            claude: this.claudeHandler?.getStats(),
            rateLimiter: this.rateLimiter?.getGlobalStats()
        };
    }

    // Graceful shutdown
    async shutdown() {
        this.logger.systemEvent('Iniciando shutdown graceful...');
        
        try {
            if (this.client) {
                await this.client.destroy();
            }
            
            await this.updateFirebaseStatus({ 
                status: 'disconnected',
                shutdownAt: serverTimestamp()
            });
            
            this.logger.systemEvent('Shutdown concluído');
            
        } catch (error) {
            this.logger.error('Erro durante shutdown:', error);
        }
        
        process.exit(0);
    }
}

// Inicializar aplicação
async function main() {
    const bridge = new WhatsAppClaudeBridge();
    
    // Handlers para shutdown graceful
    process.on('SIGINT', () => bridge.shutdown());
    process.on('SIGTERM', () => bridge.shutdown());
    process.on('uncaughtException', (error) => {
        console.error('Erro não capturado:', error);
        bridge.shutdown();
    });
    
    await bridge.initialize();
}

// Executar apenas se for o módulo principal
if (require.main === module) {
    main().catch(console.error);
}

module.exports = WhatsAppClaudeBridge;