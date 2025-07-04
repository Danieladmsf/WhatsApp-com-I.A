const { config } = require('../config');
const Logger = require('../utils/Logger');

class ClaudeHandler {
    constructor() {
        this.claudeQuery = null;
        this.isInitialized = false;
        this.logger = new Logger('ClaudeHandler');
        this.sessionCache = new Map();
        this.lastRequestTime = new Map();
        
        this.init();
    }

    async init() {
        try {
            const { query } = await import('@anthropic-ai/claude-code');
            this.claudeQuery = query;
            this.isInitialized = true;
            this.logger.info('Claude Code SDK inicializado com sucesso');
        } catch (error) {
            this.logger.error('Erro ao inicializar Claude Code SDK:', error);
            throw error;
        }
    }

    async processMessage(senderId, message) {
        if (!this.isInitialized) {
            throw new Error('Claude Handler não está inicializado');
        }

        // Rate limiting por usuário
        if (!this.checkRateLimit(senderId)) {
            this.logger.warn(`Rate limit excedido para usuário: ${senderId}`);
            return "Muitas mensagens enviadas. Aguarde um momento antes de enviar novamente.";
        }

        try {
            this.logger.info(`Processando mensagem de ${senderId}: "${message}"`);
            
            const startTime = Date.now();
            
            // Configurar contexto personalizado
            const claudeResponse = this.claudeQuery({
                prompt: this.buildPrompt(senderId, message),
                options: {
                    cwd: config.claude.cwd,
                    timeout: config.claude.timeoutMs
                }
            });

            let replyText = '';
            let chunkCount = 0;
            
            // Processar resposta streaming
            for await (const chunk of claudeResponse) {
                chunkCount++;
                
                if (config.claude.debugMode) {
                    this.logger.debug(`Chunk ${chunkCount} recebido:`, chunk);
                }
                
                if (chunk.type === 'result' && chunk.result) {
                    replyText = chunk.result;
                    
                    // Salvar métricas
                    this.saveMetrics(senderId, chunk, Date.now() - startTime);
                    break;
                }
            }

            // Validar e truncar resposta se necessário
            replyText = this.validateResponse(replyText);
            
            this.logger.info(`Resposta gerada para ${senderId}: "${replyText.substring(0, 100)}..."`);
            return replyText;

        } catch (error) {
            this.logger.error(`Erro ao processar mensagem de ${senderId}:`, error);
            return "Desculpe, não consegui processar sua mensagem no momento. Tente novamente em alguns instantes.";
        }
    }

    buildPrompt(senderId, message) {
        // Buscar contexto da sessão
        const sessionContext = this.sessionCache.get(senderId) || '';
        
        let prompt = message;
        
        // Adicionar contexto se existir
        if (sessionContext) {
            prompt = `Contexto da conversa anterior: ${sessionContext}\n\nMensagem atual: ${message}`;
        }

        // Adicionar instrução de idioma se necessário
        if (this.shouldAddLanguageInstruction(message)) {
            prompt += '\n\nResponda sempre em português brasileiro.';
        }

        return prompt;
    }

    shouldAddLanguageInstruction(message) {
        const portugueseKeywords = ['português', 'portugues', 'brasil', 'br'];
        return portugueseKeywords.some(keyword => 
            message.toLowerCase().includes(keyword)
        );
    }

    validateResponse(response) {
        if (!response || typeof response !== 'string') {
            return "Desculpe, não consegui gerar uma resposta adequada.";
        }

        // Truncar se muito longo
        if (response.length > config.claude.maxResponseLength) {
            response = response.substring(0, config.claude.maxResponseLength) + '...';
            this.logger.warn('Resposta truncada por exceder limite de caracteres');
        }

        return response.trim();
    }

    checkRateLimit(senderId) {
        const now = Date.now();
        const lastRequest = this.lastRequestTime.get(senderId) || 0;
        
        if (now - lastRequest < config.rateLimit.cooldownMs) {
            return false;
        }
        
        this.lastRequestTime.set(senderId, now);
        return true;
    }

    saveMetrics(senderId, chunk, duration) {
        if (chunk.usage && chunk.total_cost_usd) {
            this.logger.info(`Métricas para ${senderId}:`, {
                duration_ms: duration,
                tokens_input: chunk.usage.input_tokens,
                tokens_output: chunk.usage.output_tokens,
                cost_usd: chunk.total_cost_usd
            });
        }
    }

    updateSessionContext(senderId, message, response) {
        // Manter contexto limitado da conversa
        const context = `User: ${message}\nAssistant: ${response}`;
        this.sessionCache.set(senderId, context.substring(0, 1000));
    }

    clearSessionContext(senderId) {
        this.sessionCache.delete(senderId);
        this.lastRequestTime.delete(senderId);
    }

    getStats() {
        return {
            initialized: this.isInitialized,
            activeSessions: this.sessionCache.size,
            rateLimitedUsers: this.lastRequestTime.size
        };
    }
}

module.exports = ClaudeHandler;