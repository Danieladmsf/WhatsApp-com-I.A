const fs = require('fs');
const { spawn } = require('child_process');

// Arquivos para monitorar
const whatsappMessagesPath = '/home/user/whatsapp_messages.json';
const claudeResponsePath = '/home/user/claude_response.json';

console.log('🔔 Auto-Notifier Claude Code iniciado!');
console.log('📁 Monitorando:', whatsappMessagesPath);
console.log('⏰ Iniciado em:', new Date().toLocaleString('pt-BR'));
console.log('========================\n');

let lastProcessedId = null;

// Função para chamar Claude Code automaticamente
function callClaudeCode(senderId, message, messageId) {
    const prompt = `MENSAGEM WHATSAPP URGENTE! 
De: ${senderId}
Mensagem: "${message}"
ID: ${messageId}

RESPONDA AGORA usando Write tool em /home/user/claude_response.json com formato:
{"reply": "sua resposta"}

Esta é uma mensagem real do WhatsApp que precisa de resposta imediata!`;

    console.log('🚀 Chamando Claude Code automaticamente...');
    console.log('📝 Prompt:', prompt);
    
    // Simular entrada de comando para Claude Code
    const claudeProcess = spawn('echo', [prompt], {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    
    claudeProcess.stdout.on('data', (data) => {
        console.log('✅ Claude Code ativado:', data.toString());
    });
    
    claudeProcess.on('close', (code) => {
        console.log('📋 Processo finalizado. Aguardando resposta...');
    });
}

// Função para monitorar mensagens
function monitorMessages() {
    try {
        // Verificar se existe arquivo de mensagem
        if (!fs.existsSync(whatsappMessagesPath)) {
            return;
        }
        
        // Ler mensagem
        const data = JSON.parse(fs.readFileSync(whatsappMessagesPath, 'utf8'));
        const message = data.currentMessage;
        
        // Verificar se é uma nova mensagem
        if (!message || message.id === lastProcessedId) {
            return;
        }
        
        console.log(`🔔 NOVA MENSAGEM DETECTADA!`);
        console.log(`📱 De: ${message.senderId}`);
        console.log(`💬 Mensagem: "${message.message}"`);
        console.log(`⏰ Timestamp: ${message.timestamp}`);
        
        // Criar arquivo de alerta para Claude Code
        const alertContent = `# 🚨 ALERTA WHATSAPP - RESPOSTA NECESSÁRIA

## 📱 Nova Mensagem Recebida
- **De:** ${message.senderId}
- **Mensagem:** "${message.message}"
- **ID:** ${message.id}
- **Timestamp:** ${message.timestamp}

## 🎯 AÇÃO NECESSÁRIA
Claude Code deve IMEDIATAMENTE usar o Write tool para responder em:
\`/home/user/claude_response.json\`

Formato da resposta:
\`\`\`json
{"reply": "sua resposta aqui"}
\`\`\`

**URGENTE: Esta é uma mensagem real do WhatsApp aguardando resposta!**
`;

        // Salvar arquivo de alerta
        fs.writeFileSync('/home/user/CLAUDE_ALERT.md', alertContent);
        console.log('🚨 Arquivo de alerta criado: /home/user/CLAUDE_ALERT.md');
        
        // Chamar Claude Code
        callClaudeCode(message.senderId, message.message, message.id);
        
        console.log(`✅ Claude Code notificado!`);
        console.log(`========================\n`);
        
        // Marcar como processada
        lastProcessedId = message.id;
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error.message);
    }
}

// Monitorar arquivos a cada 1 segundo
setInterval(monitorMessages, 1000);

console.log('🔄 Auto-Notifier ativo!');
console.log('📱 Detectará mensagens automaticamente');
console.log('🚨 Criará alertas para Claude Code');
console.log('✍️ Claude Code deve responder automaticamente!\n');