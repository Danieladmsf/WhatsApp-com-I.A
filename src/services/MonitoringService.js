const { config } = require('../config');
const Logger = require('../utils/Logger');

class MonitoringService {
    constructor() {
        this.logger = new Logger('Monitoring');
        this.metrics = {
            messages: {
                received: 0,
                processed: 0,
                failed: 0,
                totalResponseTime: 0
            },
            claude: {
                requests: 0,
                errors: 0,
                totalCost: 0,
                totalTokens: 0
            },
            system: {
                startTime: Date.now(),
                uptime: 0,
                memoryUsage: 0,
                cpuUsage: 0
            },
            users: {
                active: new Set(),
                blocked: 0,
                rateLimited: 0
            }
        };

        this.alerts = [];
        this.healthChecks = [];
        
        // Iniciar monitoramento automático
        this.startMonitoring();
    }

    startMonitoring() {
        // Atualizar métricas do sistema a cada 30 segundos
        setInterval(() => {
            this.updateSystemMetrics();
        }, 30000);

        // Verificar saúde do sistema a cada minuto
        setInterval(() => {
            this.performHealthChecks();
        }, 60000);

        // Log de estatísticas a cada 5 minutos
        setInterval(() => {
            this.logStatistics();
        }, 300000);

        this.logger.info('Sistema de monitoramento iniciado');
    }

    // Métricas de mensagens
    recordMessageReceived(senderId) {
        this.metrics.messages.received++;
        this.metrics.users.active.add(senderId);
        this.logger.whatsappMessage('received', senderId, 'message');
    }

    recordMessageProcessed(senderId, responseTime) {
        this.metrics.messages.processed++;
        this.metrics.messages.totalResponseTime += responseTime;
        this.logger.claudeProcessing(senderId, '', responseTime);
    }

    recordMessageFailed(senderId, error) {
        this.metrics.messages.failed++;
        this.logger.error(`Falha ao processar mensagem de ${senderId}`, { error });
    }

    // Métricas do Claude
    recordClaudeRequest(cost, tokens) {
        this.metrics.claude.requests++;
        this.metrics.claude.totalCost += cost || 0;
        this.metrics.claude.totalTokens += tokens || 0;
    }

    recordClaudeError(error) {
        this.metrics.claude.errors++;
        this.logger.error('Erro no Claude Code', { error });
    }

    // Métricas de usuários
    recordUserBlocked(userId) {
        this.metrics.users.blocked++;
        this.logger.warn(`Usuário bloqueado`, { userId });
    }

    recordRateLimitHit(userId) {
        this.metrics.users.rateLimited++;
        this.logger.rateLimitHit(userId);
    }

    // Atualizar métricas do sistema
    updateSystemMetrics() {
        const now = Date.now();
        this.metrics.system.uptime = now - this.metrics.system.startTime;
        
        // Uso de memória
        const memUsage = process.memoryUsage();
        this.metrics.system.memoryUsage = memUsage.heapUsed;

        // Verificar alertas
        this.checkAlerts();
    }

    checkAlerts() {
        const alerts = [];

        // Alerta de alta taxa de erro
        const errorRate = this.getErrorRate();
        if (errorRate > 0.1) { // 10% de erro
            alerts.push({
                type: 'high_error_rate',
                severity: 'warning',
                message: `Taxa de erro alta: ${(errorRate * 100).toFixed(2)}%`,
                value: errorRate
            });
        }

        // Alerta de resposta lenta
        const avgResponseTime = this.getAverageResponseTime();
        if (avgResponseTime > 10000) { // 10 segundos
            alerts.push({
                type: 'slow_response',
                severity: 'warning', 
                message: `Tempo de resposta alto: ${avgResponseTime}ms`,
                value: avgResponseTime
            });
        }

        // Alerta de alto uso de memória
        const memoryMB = this.metrics.system.memoryUsage / 1024 / 1024;
        if (memoryMB > 500) { // 500MB
            alerts.push({
                type: 'high_memory',
                severity: 'warning',
                message: `Alto uso de memória: ${memoryMB.toFixed(2)}MB`,
                value: memoryMB
            });
        }

        // Adicionar novos alertas
        const newAlerts = alerts.filter(alert => 
            !this.alerts.some(existing => 
                existing.type === alert.type && 
                Math.abs(existing.timestamp - Date.now()) < 300000 // 5 minutos
            )
        );

        newAlerts.forEach(alert => {
            alert.timestamp = Date.now();
            this.alerts.push(alert);
            this.logger.warn(`ALERTA: ${alert.message}`, alert);
        });

        // Limitar número de alertas armazenados
        if (this.alerts.length > 100) {
            this.alerts = this.alerts.slice(-50);
        }
    }

    performHealthChecks() {
        const checks = [];

        // Verificar se o sistema está respondendo
        checks.push({
            name: 'system_responsive',
            status: 'healthy',
            timestamp: Date.now()
        });

        // Verificar memória
        const memoryMB = this.metrics.system.memoryUsage / 1024 / 1024;
        checks.push({
            name: 'memory_usage',
            status: memoryMB < 1000 ? 'healthy' : 'warning',
            value: `${memoryMB.toFixed(2)}MB`,
            timestamp: Date.now()
        });

        // Verificar taxa de erro
        const errorRate = this.getErrorRate();
        checks.push({
            name: 'error_rate',
            status: errorRate < 0.05 ? 'healthy' : 'unhealthy',
            value: `${(errorRate * 100).toFixed(2)}%`,
            timestamp: Date.now()
        });

        this.healthChecks = checks;
        this.logger.debug('Health checks realizados', checks);
    }

    logStatistics() {
        const stats = this.getStatistics();
        this.logger.info('📊 Estatísticas do sistema:', stats);
    }

    // Getters para métricas calculadas
    getErrorRate() {
        const total = this.metrics.messages.processed + this.metrics.messages.failed;
        return total > 0 ? this.metrics.messages.failed / total : 0;
    }

    getAverageResponseTime() {
        return this.metrics.messages.processed > 0 
            ? this.metrics.messages.totalResponseTime / this.metrics.messages.processed 
            : 0;
    }

    getUptimeHours() {
        return this.metrics.system.uptime / (1000 * 60 * 60);
    }

    // Estatísticas completas
    getStatistics() {
        return {
            uptime_hours: this.getUptimeHours().toFixed(2),
            messages: {
                received: this.metrics.messages.received,
                processed: this.metrics.messages.processed,
                failed: this.metrics.messages.failed,
                success_rate: `${((1 - this.getErrorRate()) * 100).toFixed(2)}%`,
                avg_response_time: `${this.getAverageResponseTime().toFixed(0)}ms`
            },
            claude: {
                requests: this.metrics.claude.requests,
                errors: this.metrics.claude.errors,
                total_cost: `$${this.metrics.claude.totalCost.toFixed(4)}`,
                total_tokens: this.metrics.claude.totalTokens
            },
            users: {
                active_count: this.metrics.users.active.size,
                blocked_count: this.metrics.users.blocked,
                rate_limited_count: this.metrics.users.rateLimited
            },
            system: {
                memory_mb: (this.metrics.system.memoryUsage / 1024 / 1024).toFixed(2),
                uptime_ms: this.metrics.system.uptime
            }
        };
    }

    getHealthStatus() {
        const recentChecks = this.healthChecks.filter(check => 
            Date.now() - check.timestamp < 120000 // 2 minutos
        );

        const unhealthyChecks = recentChecks.filter(check => 
            check.status === 'unhealthy'
        );

        return {
            status: unhealthyChecks.length === 0 ? 'healthy' : 'unhealthy',
            checks: recentChecks,
            lastUpdate: Math.max(...recentChecks.map(c => c.timestamp))
        };
    }

    getRecentAlerts(minutes = 60) {
        const cutoff = Date.now() - (minutes * 60 * 1000);
        return this.alerts.filter(alert => alert.timestamp > cutoff);
    }

    reset() {
        this.metrics = {
            messages: { received: 0, processed: 0, failed: 0, totalResponseTime: 0 },
            claude: { requests: 0, errors: 0, totalCost: 0, totalTokens: 0 },
            system: { startTime: Date.now(), uptime: 0, memoryUsage: 0, cpuUsage: 0 },
            users: { active: new Set(), blocked: 0, rateLimited: 0 }
        };
        this.alerts = [];
        this.logger.info('Métricas resetadas');
    }
}

module.exports = MonitoringService;