const fs = require('fs');
const path = require('path');

// Arquivos para comunicação
const whatsappMessagesPath = '/home/user/whatsapp_messages.json';
const claudeResponsePath = '/home/user/claude_response.json';
const claudeInboxPath = '/home/user/CLAUDE_INBOX.md';

console.log('🤖 Claude Code Responder iniciado!');
console.log('📁 Monitorando:', whatsappMessagesPath);
console.log('📝 Criando inbox em:', claudeInboxPath);
console.log('⏰ Iniciado em:', new Date().toLocaleString('pt-BR'));
console.log('========================\n');

let lastProcessedId = null;

// Função para criar arquivo que Claude Code pode ver
function createClaudeInbox(senderId, message, messageId) {
    const inboxContent = `# 📱 MENSAGEM DO WHATSAPP PARA CLAUDE RESPONDER

## 📞 Informações da Mensagem
- **De:** ${senderId}
- **ID:** ${messageId}
- **Timestamp:** ${new Date().toLocaleString('pt-BR')}
- **Status:** AGUARDANDO RESPOSTA

## 💬 Mensagem Recebida
\`\`\`
${message}
\`\`\`

## 🎯 INSTRUÇÕES PARA CLAUDE CODE
**Claude, por favor responda esta mensagem do WhatsApp!**

1. Leia a mensagem acima
2. Responda de forma natural e útil
3. Use o comando Write para salvar sua resposta em: \`${claudeResponsePath}\`
4. Use o formato JSON: \`{"reply": "sua resposta aqui"}\`

**Contexto:** Esta é uma mensagem real de um usuário do WhatsApp. Seja profissional, útil e natural na sua resposta.

---
*Sistema automático WhatsApp + Claude Code*
*Arquivo criado em: ${new Date().toISOString()}*
`;

    fs.writeFileSync(claudeInboxPath, inboxContent);
    console.log(`📝 Arquivo criado para Claude Code: ${claudeInboxPath}`);
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
        
        // Criar arquivo para Claude Code ver e responder
        createClaudeInbox(message.senderId, message.message, message.id);
        
        console.log(`✅ Arquivo pronto para Claude Code responder!`);
        console.log(`📋 Claude Code deve usar Write tool para salvar resposta em: ${claudeResponsePath}`);
        console.log(`========================\n`);
        
        // Marcar como processada
        lastProcessedId = message.id;
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error.message);
    }
}

// Monitorar arquivos a cada 1 segundo
setInterval(monitorMessages, 1000);

console.log('🔄 Monitoramento ativo! Aguardando mensagens...');
console.log('📖 Claude Code deve ler:', claudeInboxPath);
console.log('✍️ Claude Code deve escrever em:', claudeResponsePath);
console.log('🎯 Use o comando Write tool para responder!\n');