const { config } = require('../config');
const Logger = require('../utils/Logger');

class RateLimiter {
    constructor() {
        this.logger = new Logger('RateLimiter');
        
        // Estruturas de dados para rate limiting
        this.requestCounts = new Map(); // userId -> { minute: count, hour: count, lastReset: timestamp }
        this.blockedUsers = new Map();  // userId -> unblockTime
        this.cooldowns = new Map();     // userId -> lastRequestTime
        
        // Limpar dados antigos a cada minuto
        setInterval(() => this.cleanup(), 60000);
    }

    async checkLimit(userId, message = '') {
        const now = Date.now();
        
        // Verificar se usuário está bloqueado
        if (this.isBlocked(userId, now)) {
            const unblockTime = this.blockedUsers.get(userId);
            const remainingTime = Math.ceil((unblockTime - now) / 1000);
            
            this.logger.rateLimitHit(userId);
            return {
                allowed: false,
                reason: 'blocked',
                remainingTime,
                message: `Você está temporariamente bloqueado. Tente novamente em ${remainingTime} segundos.`
            };
        }

        // Verificar cooldown entre mensagens
        if (!this.checkCooldown(userId, now)) {
            return {
                allowed: false,
                reason: 'cooldown',
                message: `Aguarde alguns segundos antes de enviar outra mensagem.`
            };
        }

        // Verificar limits por minuto e hora
        const limits = this.checkRateLimits(userId, now);
        if (!limits.allowed) {
            // Bloquear usuário se excedeu muito os limites
            if (limits.hourlyExceeded) {
                this.blockUser(userId, now + (60 * 60 * 1000)); // Bloquear por 1 hora
                this.logger.warn(`Usuário ${userId} bloqueado por exceder limite horário`);
            }
            
            return limits;
        }

        // Incrementar contadores
        this.incrementCounters(userId, now);
        this.cooldowns.set(userId, now);

        this.logger.debug(`Rate limit OK para ${userId}`, this.getUserStats(userId));
        
        return { allowed: true };
    }

    isBlocked(userId, now) {
        const unblockTime = this.blockedUsers.get(userId);
        if (!unblockTime) return false;
        
        if (now >= unblockTime) {
            this.blockedUsers.delete(userId);
            return false;
        }
        
        return true;
    }

    checkCooldown(userId, now) {
        const lastRequest = this.cooldowns.get(userId);
        if (!lastRequest) return true;
        
        return (now - lastRequest) >= config.rateLimit.cooldownMs;
    }

    checkRateLimits(userId, now) {
        const userStats = this.getUserStats(userId);
        const currentMinute = Math.floor(now / 60000);
        const currentHour = Math.floor(now / 3600000);

        // Reset contadores se necessário
        if (userStats.lastMinute !== currentMinute) {
            userStats.minuteCount = 0;
            userStats.lastMinute = currentMinute;
        }
        
        if (userStats.lastHour !== currentHour) {
            userStats.hourCount = 0;
            userStats.lastHour = currentHour;
        }

        // Verificar limites
        const minuteExceeded = userStats.minuteCount >= config.rateLimit.maxRequestsPerMinute;
        const hourExceeded = userStats.hourCount >= config.rateLimit.maxRequestsPerHour;

        if (minuteExceeded) {
            return {
                allowed: false,
                reason: 'minute_limit',
                minuteExceeded: true,
                message: `Muitas mensagens por minuto. Limite: ${config.rateLimit.maxRequestsPerMinute}/min`
            };
        }

        if (hourExceeded) {
            return {
                allowed: false,
                reason: 'hour_limit',
                hourlyExceeded: true,
                message: `Limite horário excedido. Limite: ${config.rateLimit.maxRequestsPerHour}/hora`
            };
        }

        return { allowed: true };
    }

    incrementCounters(userId, now) {
        const userStats = this.getUserStats(userId);
        userStats.minuteCount++;
        userStats.hourCount++;
        userStats.totalRequests++;
        userStats.lastRequest = now;
    }

    getUserStats(userId) {
        if (!this.requestCounts.has(userId)) {
            const now = Date.now();
            this.requestCounts.set(userId, {
                minuteCount: 0,
                hourCount: 0,
                totalRequests: 0,
                lastMinute: Math.floor(now / 60000),
                lastHour: Math.floor(now / 3600000),
                lastRequest: 0,
                firstRequest: now
            });
        }
        return this.requestCounts.get(userId);
    }

    blockUser(userId, unblockTime) {
        this.blockedUsers.set(userId, unblockTime);
        this.logger.warn(`Usuário ${userId} bloqueado até ${new Date(unblockTime).toISOString()}`);
    }

    unblockUser(userId) {
        this.blockedUsers.delete(userId);
        this.logger.info(`Usuário ${userId} desbloqueado manualmente`);
    }

    cleanup() {
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        
        // Remover usuários inativos há mais de 1 hora
        for (const [userId, stats] of this.requestCounts.entries()) {
            if (stats.lastRequest < hourAgo) {
                this.requestCounts.delete(userId);
                this.cooldowns.delete(userId);
            }
        }

        // Remover bloqueios expirados
        for (const [userId, unblockTime] of this.blockedUsers.entries()) {
            if (now >= unblockTime) {
                this.blockedUsers.delete(userId);
            }
        }

        this.logger.debug(`Cleanup concluído. Usuários ativos: ${this.requestCounts.size}`);
    }

    getGlobalStats() {
        return {
            activeUsers: this.requestCounts.size,
            blockedUsers: this.blockedUsers.size,
            totalRequests: Array.from(this.requestCounts.values())
                .reduce((sum, stats) => sum + stats.totalRequests, 0)
        };
    }

    getUserDetailedStats(userId) {
        const stats = this.getUserStats(userId);
        const now = Date.now();
        const isBlocked = this.isBlocked(userId, now);
        
        return {
            ...stats,
            isBlocked,
            unblockTime: this.blockedUsers.get(userId),
            lastCooldown: this.cooldowns.get(userId),
            canSendMessage: !isBlocked && this.checkCooldown(userId, now)
        };
    }
}

module.exports = RateLimiter;