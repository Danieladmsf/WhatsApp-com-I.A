const fs = require('fs');
const path = require('path');

// Arquivos importantes
const whatsappMessagesPath = '/home/user/whatsapp_messages.json';
const claudeResponsePath = '/home/user/claude_response.json';
const claudeConfigPath = '/home/user/.claude.json';

console.log('🔗 Claude History Bridge iniciado!');
console.log('📱 Monitorando WhatsApp:', whatsappMessagesPath);
console.log('🧠 Integrando com Claude Config:', claudeConfigPath);
console.log('⏰ Iniciado em:', new Date().toLocaleString('pt-BR'));
console.log('========================\n');

let lastProcessedId = null;
let responseTimeout = null;

// Função para adicionar mensagem ao histórico do Claude
function addToClaudeHistory(senderId, message, messageId) {
    try {
        // Ler configuração atual do Claude
        const claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
        
        // Preparar entrada no histórico
        const whatsappEntry = {
            display: `📱 MENSAGEM WHATSAPP [ID: ${messageId}] De: ${senderId} - "${message}" - RESPONDA USANDO Write tool em ${claudeResponsePath} com formato {"reply": "sua resposta"}`,
            pastedContents: {}
        };
        
        // Adicionar ao histórico do projeto atual
        if (claudeConfig.projects && claudeConfig.projects['/home/user']) {
            claudeConfig.projects['/home/user'].history.unshift(whatsappEntry);
            
            // Manter apenas os últimos 50 itens para performance
            if (claudeConfig.projects['/home/user'].history.length > 50) {
                claudeConfig.projects['/home/user'].history = claudeConfig.projects['/home/user'].history.slice(0, 50);
            }
        }
        
        // Salvar configuração atualizada
        fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
        
        console.log(`📝 Mensagem adicionada ao histórico do Claude Code!`);
        console.log(`🎯 Claude deve ver a mensagem na próxima interação`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao adicionar ao histórico:', error.message);
        return false;
    }
}

// Função para aguardar resposta do Claude
function waitForClaudeResponse(messageId) {
    let attempts = 0;
    const maxAttempts = 120; // 2 minutos
    
    const checkResponse = () => {
        try {
            if (fs.existsSync(claudeResponsePath)) {
                const responseData = JSON.parse(fs.readFileSync(claudeResponsePath, 'utf8'));
                if (responseData.reply) {
                    console.log(`✅ Claude respondeu: "${responseData.reply}"`);
                    
                    // Limpar arquivo de resposta
                    fs.unlinkSync(claudeResponsePath);
                    
                    return responseData.reply;
                }
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                responseTimeout = setTimeout(checkResponse, 1000);
            } else {
                console.log(`⏰ Timeout - Claude não respondeu em ${maxAttempts} segundos`);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar resposta:', error.message);
            return null;
        }
    };
    
    responseTimeout = setTimeout(checkResponse, 1000);
}

// Função para monitorar mensagens do WhatsApp
function monitorWhatsAppMessages() {
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
        
        console.log(`🔔 NOVA MENSAGEM DO WHATSAPP!`);
        console.log(`📱 De: ${message.senderId}`);
        console.log(`💬 Mensagem: "${message.message}"`);
        console.log(`⏰ Timestamp: ${message.timestamp}`);
        
        // Adicionar ao histórico do Claude
        const success = addToClaudeHistory(message.senderId, message.message, message.id);
        
        if (success) {
            console.log(`🎯 ATENÇÃO: Mensagem inserida no Claude Code!`);
            console.log(`📋 Claude deve usar Write tool para responder em: ${claudeResponsePath}`);
            console.log(`⏳ Aguardando resposta do Claude...`);
            
            // Aguardar resposta
            waitForClaudeResponse(message.id);
        }
        
        console.log(`========================\n`);
        
        // Marcar como processada
        lastProcessedId = message.id;
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagem WhatsApp:', error.message);
    }
}

// Monitorar mensagens a cada 2 segundos
setInterval(monitorWhatsAppMessages, 2000);

console.log('🔄 Monitoramento ativo!');
console.log('📱 Aguardando mensagens do WhatsApp...');
console.log('🧠 Integrando com Claude Code automaticamente...');
console.log('✍️ Claude deve usar Write tool para responder!\n');