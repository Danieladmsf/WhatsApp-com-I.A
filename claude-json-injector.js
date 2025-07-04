const fs = require('fs');
const path = require('path');

// Arquivos importantes
const whatsappMessagesPath = '/home/user/whatsapp_messages.json';
const claudeResponsePath = '/home/user/claude_response.json';
const claudeConfigPath = '/home/user/.claude.json';

console.log('💉 Claude JSON Injector iniciado!');
console.log('📱 Monitorando WhatsApp:', whatsappMessagesPath);
console.log('🧠 Injetando em Claude Config:', claudeConfigPath);
console.log('⏰ Iniciado em:', new Date().toLocaleString('pt-BR'));
console.log('========================\n');

let lastProcessedId = null;

// Função para injetar mensagem no histórico do Claude
function injectMessageToClaudeHistory(senderId, message, messageId) {
    try {
        // Ler configuração atual do Claude
        const claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf8'));
        
        // Preparar mensagem formatada para o Claude ver
        const whatsappMessage = `🔔 MENSAGEM WHATSAPP RECEBIDA!

📱 **De:** ${senderId}
💬 **Mensagem:** "${message}"
🆔 **ID:** ${messageId}
⏰ **Horário:** ${new Date().toLocaleString('pt-BR')}

🎯 **AÇÃO NECESSÁRIA:**
Claude, por favor responda esta mensagem do WhatsApp usando Write tool para salvar em:
\`/home/user/claude_response.json\`

Formato: \`{"reply": "sua resposta aqui"}\`

Esta é uma mensagem REAL de um usuário do WhatsApp aguardando sua resposta!`;

        // Criar entrada no histórico como se o usuário tivesse digitado
        const historyEntry = {
            display: whatsappMessage,
            pastedContents: {}
        };
        
        // Verificar se o projeto existe no config
        if (!claudeConfig.projects) {
            claudeConfig.projects = {};
        }
        
        if (!claudeConfig.projects['/home/user']) {
            claudeConfig.projects['/home/user'] = {
                allowedTools: [],
                history: [],
                mcpContextUris: [],
                mcpServers: {},
                enabledMcpjsonServers: [],
                disabledMcpjsonServers: [],
                hasTrustDialogAccepted: false,
                projectOnboardingSeenCount: 1,
                hasClaudeMdExternalIncludesApproved: false,
                hasClaudeMdExternalIncludesWarningShown: false,
                lastTotalWebSearchRequests: 0
            };
        }
        
        // Adicionar no INÍCIO do histórico (mais recente primeiro)
        claudeConfig.projects['/home/user'].history.unshift(historyEntry);
        
        // Manter apenas os últimos 100 itens para performance
        if (claudeConfig.projects['/home/user'].history.length > 100) {
            claudeConfig.projects['/home/user'].history = claudeConfig.projects['/home/user'].history.slice(0, 100);
        }
        
        // Salvar configuração atualizada
        fs.writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));
        
        console.log(`✅ Mensagem INJETADA no Claude Config!`);
        console.log(`🎯 Claude deve ver automaticamente na próxima atualização`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao injetar no Claude Config:', error.message);
        return false;
    }
}

// Função para aguardar resposta do Claude
function waitForClaudeResponse(messageId) {
    let attempts = 0;
    const maxAttempts = 120; // 2 minutos
    
    const checkForResponse = () => {
        try {
            if (fs.existsSync(claudeResponsePath)) {
                const responseData = JSON.parse(fs.readFileSync(claudeResponsePath, 'utf8'));
                if (responseData.reply) {
                    console.log(`🎉 CLAUDE RESPONDEU: "${responseData.reply}"`);
                    
                    // Limpar arquivo de resposta
                    fs.unlinkSync(claudeResponsePath);
                    
                    return true;
                }
            }
            
            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(checkForResponse, 1000);
            } else {
                console.log(`⏰ Timeout - Claude não respondeu em ${maxAttempts} segundos`);
                return false;
            }
            
        } catch (error) {
            console.error('❌ Erro ao verificar resposta:', error.message);
            return false;
        }
    };
    
    checkForResponse();
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
        
        console.log(`🔔 NOVA MENSAGEM WHATSAPP DETECTADA!`);
        console.log(`📱 De: ${message.senderId}`);
        console.log(`💬 Mensagem: "${message.message}"`);
        console.log(`⏰ Timestamp: ${message.timestamp}`);
        
        // Injetar no histórico do Claude
        const success = injectMessageToClaudeHistory(message.senderId, message.message, message.id);
        
        if (success) {
            console.log(`💉 MENSAGEM INJETADA COM SUCESSO!`);
            console.log(`🤖 Claude deve ver automaticamente agora!`);
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
console.log('💉 Injetando mensagens WhatsApp no Claude Config');
console.log('🤖 Claude verá automaticamente as mensagens!');
console.log('✍️ Aguardando mensagens para injetar...\n');