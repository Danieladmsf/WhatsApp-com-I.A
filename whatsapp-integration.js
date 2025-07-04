const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

app.use(express.json());

// Arquivos do sistema Claude Code
const claudeConfigPath = '/home/user/.claude.json';
const whatsappMessagesPath = '/home/user/whatsapp_messages.json';
const claudeResponsePath = '/home/user/claude_response.json';

// Função para adicionar mensagem ao arquivo que Claude monitora
function addMessageToClaudeSystem(senderId, message) {
    const messageData = {
        id: Date.now().toString(),
        senderId,
        message,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    
    // Salvar no arquivo que Claude pode ver
    fs.writeFileSync(whatsappMessagesPath, JSON.stringify({
        currentMessage: messageData,
        instruction: `
🤖 MENSAGEM DO WHATSAPP PARA CLAUDE RESPONDER

De: ${senderId}
Mensagem: "${message}"
Timestamp: ${messageData.timestamp}

INSTRUÇÕES:
1. Leia esta mensagem do WhatsApp
2. Responda de forma natural e útil
3. Salve sua resposta no arquivo: ${claudeResponsePath}
4. Use o formato: {"reply": "sua resposta aqui"}

Esta é uma mensagem real de um usuário do WhatsApp.
Seja útil, natural e profissional na sua resposta.
        `.trim()
    }, null, 2));
    
    console.log(`📱 Mensagem salva para Claude processar: ${whatsappMessagesPath}`);
    return messageData.id;
}

// Função para aguardar resposta do Claude
function waitForClaudeResponse(messageId, maxWaitTime = 60000) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkForResponse = () => {
            try {
                if (fs.existsSync(claudeResponsePath)) {
                    const responseData = JSON.parse(fs.readFileSync(claudeResponsePath, 'utf8'));
                    if (responseData.reply) {
                        console.log(`✅ Claude respondeu: "${responseData.reply}"`);
                        
                        // Limpar arquivos após usar
                        fs.unlinkSync(claudeResponsePath);
                        fs.unlinkSync(whatsappMessagesPath);
                        
                        resolve(responseData.reply);
                        return;
                    }
                }
                
                // Verificar timeout
                if (Date.now() - startTime > maxWaitTime) {
                    console.log(`⏰ Timeout - Claude não respondeu em ${maxWaitTime/1000}s`);
                    
                    // Limpar arquivos
                    if (fs.existsSync(whatsappMessagesPath)) {
                        fs.unlinkSync(whatsappMessagesPath);
                    }
                    if (fs.existsSync(claudeResponsePath)) {
                        fs.unlinkSync(claudeResponsePath);
                    }
                    
                    resolve("Desculpe, não consegui processar sua mensagem no momento. Tente novamente.");
                    return;
                }
                
                // Tentar novamente em 1 segundo
                setTimeout(checkForResponse, 1000);
                
            } catch (error) {
                console.error('Erro ao verificar resposta:', error);
                setTimeout(checkForResponse, 1000);
            }
        };
        
        checkForResponse();
    });
}

// Endpoint principal para receber mensagens do WhatsApp
app.post('/api/whatsapp-chat', async (req, res) => {
    const { senderId, message } = req.body;
    
    console.log(`\n🔔 NOVA MENSAGEM DO WHATSAPP`);
    console.log(`📱 De: ${senderId}`);
    console.log(`💬 Mensagem: "${message}"`);
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
    
    try {
        // Adicionar mensagem ao sistema Claude
        const messageId = addMessageToClaudeSystem(senderId, message);
        console.log(`⏳ Aguardando Claude responder...`);
        
        // Aguardar resposta do Claude
        const reply = await waitForClaudeResponse(messageId);
        
        console.log(`📤 Enviando resposta para WhatsApp: "${reply}"`);
        console.log(`========================\n`);
        
        res.json({ reply });
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        res.json({ reply: "Erro interno do servidor. Tente novamente." });
    }
});

// Endpoint para Claude ver mensagens pendentes
app.get('/api/pending-messages', (req, res) => {
    try {
        if (fs.existsSync(whatsappMessagesPath)) {
            const data = JSON.parse(fs.readFileSync(whatsappMessagesPath, 'utf8'));
            res.json(data);
        } else {
            res.json({ message: "Nenhuma mensagem pendente" });
        }
    } catch (error) {
        res.json({ error: "Erro ao ler mensagens" });
    }
});

// Endpoint de teste
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'WhatsApp + Claude Integration ativa!',
        timestamp: new Date().toISOString(),
        claudeConfigExists: fs.existsSync(claudeConfigPath),
        message: 'Sistema pronto para integração com Claude Code'
    });
});

// Inicializar servidor
app.listen(port, () => {
    console.log(`🤖 WhatsApp + Claude Integration iniciada na porta ${port}`);
    console.log(`🌐 Teste: http://localhost:${port}/api/test`);
    console.log(`📥 Mensagens pendentes: http://localhost:${port}/api/pending-messages`);
    console.log(`📋 COMO FUNCIONA:`);
    console.log(`   1. WhatsApp envia mensagem para a API`);
    console.log(`   2. Sistema salva em: ${whatsappMessagesPath}`);
    console.log(`   3. Claude (você) lê o arquivo e responde`);
    console.log(`   4. Claude salva resposta em: ${claudeResponsePath}`);
    console.log(`   5. Sistema pega resposta e envia para WhatsApp`);
    console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}\n`);
});