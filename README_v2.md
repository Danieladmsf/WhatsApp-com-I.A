# WhatsApp Claude Bridge v2.0

Uma ponte escalável e robusta entre WhatsApp e Claude Code, com arquitetura modular, rate limiting, monitoramento em tempo real e logging estruturado.

## 🚀 Características

### Versão 2.0 (Nova Arquitetura)
- ✅ **Arquitetura Modular** - Código organizado em módulos separados
- ✅ **Rate Limiting Inteligente** - Controle de spam por usuário
- ✅ **Monitoramento em Tempo Real** - Métricas, alertas e health checks
- ✅ **Logging Estruturado** - Logs organizados por categoria com níveis
- ✅ **Cache de Sessão** - Contexto de conversa por usuário
- ✅ **Graceful Shutdown** - Encerramento limpo do sistema
- ✅ **Tratamento de Erros Robusto** - Recovery automático de falhas
- ✅ **Integração Direta Claude Code** - Sem APIs externas

### Versão 1.0 (Legacy)
- ✅ **Funcionalidade Básica** - Scripts originais mantidos para compatibilidade

## 📁 Estrutura do Projeto

```
WHATSAPP/
├── src/                          # Nova arquitetura modular
│   ├── config/
│   │   └── index.js             # Configurações centralizadas
│   ├── handlers/
│   │   └── ClaudeHandler.js     # Integração com Claude Code
│   ├── middleware/
│   │   └── RateLimiter.js       # Rate limiting por usuário
│   ├── services/
│   │   └── MonitoringService.js # Monitoramento e métricas
│   ├── utils/
│   │   └── Logger.js            # Sistema de logging estruturado
│   └── index.js                 # Aplicação principal
├── script.js                    # Script original (legacy)
├── package.json                 # Dependências e scripts
└── README.md                    # Esta documentação
```

## ⚙️ Configuração

### 1. Instalação

```bash
cd /home/user/WHATSAPP
npm install
```

### 2. Variáveis de Ambiente

Crie/edite o arquivo `.env`:

```env
# Firebase (obrigatório)
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123def456

# Configurações opcionais
NODE_ENV=production
LOG_LEVEL=info
```

## 🚀 Execução

### Nova Arquitetura (Recomendado)

```bash
# Produção
npm start

# Desenvolvimento (com logs debug)
npm run dev
```

### Arquitetura Legacy

```bash
# Script original
npm run legacy
```

## 📊 Monitoramento

### Métricas Disponíveis

- **Mensagens**: Recebidas, processadas, falhadas, tempo de resposta
- **Claude**: Requests, erros, custo total, tokens utilizados  
- **Usuários**: Ativos, bloqueados, rate limited
- **Sistema**: Uptime, uso de memória, health checks

### Health Checks Automáticos

- ✅ Responsividade do sistema
- ✅ Uso de memória  
- ✅ Taxa de erro
- ✅ Tempo de resposta médio

### Alertas Automáticos

- 🟡 Taxa de erro > 10%
- 🟡 Tempo de resposta > 10s
- 🟡 Uso de memória > 500MB

## 🛡️ Rate Limiting

### Limites por Usuário

- **Por minuto**: 10 mensagens
- **Por hora**: 100 mensagens  
- **Cooldown**: 5 segundos entre mensagens
- **Bloqueio**: 1 hora se exceder limites

### Funcionalidades

- ✅ Controle individual por usuário
- ✅ Cleanup automático de dados antigos
- ✅ Desbloqueio automático após timeout
- ✅ Mensagens informativas para usuários

## 📝 Logging

### Níveis de Log

- `error` - Erros críticos
- `warn` - Alertas e problemas
- `info` - Informações importantes  
- `debug` - Detalhes para desenvolvimento

### Categorias

- 🔴 **Erros**: Falhas de sistema e processamento
- 🟡 **Avisos**: Rate limits, alertas de performance
- ✅ **Info**: Eventos normais, estatísticas
- 🔍 **Debug**: Detalhes internos, chunks do Claude

## 🔧 API de Monitoramento

A classe principal expõe métodos para monitoramento:

```javascript
const bridge = new WhatsAppClaudeBridge();

// Estatísticas completas
const stats = bridge.getSystemStats();

// Inclui:
// - stats.system: métricas gerais
// - stats.health: status de saúde
// - stats.alerts: alertas recentes
// - stats.claude: estatísticas do Claude
// - stats.rateLimiter: dados de rate limiting
```

## 🚦 Troubleshooting

### Problemas Comuns

1. **"Claude Handler não está inicializado"**
   - Aguarde a inicialização completa
   - Verifique logs de inicialização

2. **"Rate limit excedido"**
   - Normal para usuários enviando muitas mensagens
   - Bloqueio automático é removido após timeout

3. **"Firebase não configurado"**
   - Verifique variáveis de ambiente no `.env`
   - Confirme se o projeto Firebase existe

4. **QR Code não aparece**
   - Verifique logs do Firebase
   - QR é salvo automaticamente no Firestore

### Logs Úteis

```bash
# Monitorar logs em tempo real
npm run dev

# Filtrar apenas erros
npm start 2>&1 | grep "🔴"

# Ver métricas
npm start 2>&1 | grep "📊"
```

## 🔄 Migração da v1.0

A versão legacy continua disponível:

```bash
# Para usar a versão antiga
npm run legacy

# Nova versão (recomendada)
npm start
```

**Principais diferenças:**

| Aspecto | v1.0 (Legacy) | v2.0 (Nova) |
|---------|---------------|-------------|
| Arquitetura | Monolítica | Modular |
| Rate Limiting | ❌ | ✅ |
| Monitoramento | ❌ | ✅ |
| Logging | Básico | Estruturado |
| Error Recovery | ❌ | ✅ |
| Contexto de Sessão | ❌ | ✅ |

## 📈 Performance

### Otimizações v2.0

- **Cache de Sessão**: Contexto mantido por usuário
- **Rate Limiting**: Previne sobrecarga
- **Lazy Loading**: Módulos carregados sob demanda
- **Memory Management**: Cleanup automático de dados antigos
- **Error Recovery**: Sistema continua funcionando após falhas

### Benchmarks

- **Tempo de resposta**: ~2-5 segundos
- **Throughput**: ~100 mensagens/hora por usuário
- **Uso de memória**: ~50-200MB em operação normal
- **Uptime**: >99% com graceful recovery

## 🤝 Contribuição

Para melhorias ou correções:

1. Mantenha a compatibilidade com a versão legacy
2. Adicione logs apropriados para novas funcionalidades  
3. Inclua tratamento de erros robusto
4. Atualize esta documentação

## 📝 Changelog

### v2.0.0
- ✨ Arquitetura modular completa
- ✨ Rate limiting por usuário
- ✨ Sistema de monitoramento
- ✨ Logging estruturado
- ✨ Cache de sessão
- ✨ Graceful shutdown

### v1.0.0
- ✨ Integração básica WhatsApp + Claude Code
- ✨ Firebase para persistência
- ✨ Fila de mensagens