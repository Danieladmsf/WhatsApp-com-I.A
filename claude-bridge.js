const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

app.use(express.json());

// Arquivos para comunicação com Claude
const pendingMessages = path.join(__dirname, 'pending_messages.json');
const responses = path.join(__dirname, 'claude_responses.json');
const conversationLog = path.join(__dirname, 'conversation_log.json');

// Função para inicializar arquivos
function initializeFiles() {
    if (!fs.existsSync(pendingMessages)) {
        fs.writeFileSync(pendingMessages, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(responses)) {
        fs.writeFileSync(responses, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(conversationLog)) {
        fs.writeFileSync(conversationLog, JSON.stringify({}, null, 2));
    }
}

// Função para adicionar mensagem à fila
function addPendingMessage(senderId, message) {
    const pending = JSON.parse(fs.readFileSync(pendingMessages, 'utf8'));
    const messageData = {
        id: Date.now().toString(),
        senderId,
        message,
        timestamp: new Date().toISOString(),
        status: 'pending'
    };
    pending.push(messageData);
    fs.writeFileSync(pendingMessages, JSON.stringify(pending, null, 2));
    return messageData.id;
}

// Função para buscar resposta do Claude
function getClaudeResponse(messageId) {
    try {
        const responses = JSON.parse(fs.readFileSync(responses, 'utf8'));
        return responses[messageId] || null;
    } catch (error) {
        return null;
    }
}

// Função para marcar mensagem como respondida
function markAsAnswered(messageId) {
    const pending = JSON.parse(fs.readFileSync(pendingMessages, 'utf8'));
    const updated = pending.map(msg => 
        msg.id === messageId ? { ...msg, status: 'answered' } : msg
    );
    fs.writeFileSync(pendingMessages, JSON.stringify(updated, null, 2));
}

// Função para salvar no log de conversas
function saveToConversationLog(senderId, message, reply) {
    let conversations = JSON.parse(fs.readFileSync(conversationLog, 'utf8'));
    
    if (!conversations[senderId]) {
        conversations[senderId] = [];
    }
    
    conversations[senderId].push({
        timestamp: new Date().toISOString(),
        message,
        reply
    });
    
    fs.writeFileSync(conversationLog, JSON.stringify(conversations, null, 2));
}

// Endpoint principal para receber mensagens do WhatsApp
app.post('/api/whatsapp-chat', async (req, res) => {
    const { senderId, message } = req.body;
    
    console.log(`\n🔔 NOVA MENSAGEM RECEBIDA`);
    console.log(`📱 De: ${senderId}`);
    console.log(`💬 Mensagem: "${message}"`);
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
    
    // Criar arquivo de mensagem diretamente no sistema
    const messageId = Date.now().toString();
    const messageFile = path.join(__dirname, `message_${messageId}.txt`);
    const responseFile = path.join(__dirname, `response_${messageId}.txt`);
    
    // Escrever mensagem no arquivo para Claude ver
    const messageContent = `=== MENSAGEM WHATSAPP ===
ID: ${messageId}
De: ${senderId}
Horário: ${new Date().toLocaleString('pt-BR')}
Mensagem: "${message}"

=== INSTRUÇÕES PARA CLAUDE ===
Por favor, responda esta mensagem do WhatsApp.
Sua resposta deve ser natural e útil.
Quando terminar, salve sua resposta no arquivo: response_${messageId}.txt

=== CONTEXTO ===
Esta é uma mensagem real de um usuário do WhatsApp.
Responda como se fosse um assistente inteligente.`;

    fs.writeFileSync(messageFile, messageContent);
    console.log(`📄 Mensagem salva em: ${messageFile}`);
    console.log(`⏳ Aguardando Claude responder em: response_${messageId}.txt`);
    
    // Aguardar resposta do Claude no arquivo
    let attempts = 0;
    const maxAttempts = 60; // 60 segundos
    
    const waitForResponse = () => {
        return new Promise((resolve) => {
            const checkResponse = () => {
                if (fs.existsSync(responseFile)) {
                    const response = fs.readFileSync(responseFile, 'utf8').trim();
                    console.log(`✅ Claude respondeu: "${response}"`);
                    
                    // Limpar arquivos temporários
                    fs.unlinkSync(messageFile);
                    fs.unlinkSync(responseFile);
                    
                    saveToConversationLog(senderId, message, response);
                    resolve(response);
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(checkResponse, 1000);
                } else {
                    console.log(`⏰ Timeout - enviando resposta padrão`);
                    const defaultResponse = "Desculpe, não consegui processar sua mensagem no momento. Tente novamente em alguns instantes.";
                    
                    // Limpar arquivo de mensagem
                    if (fs.existsSync(messageFile)) {
                        fs.unlinkSync(messageFile);
                    }
                    
                    saveToConversationLog(senderId, message, defaultResponse);
                    resolve(defaultResponse);
                }
            };
            checkResponse();
        });
    };
    
    const reply = await waitForResponse();
    console.log(`📤 Enviando resposta para WhatsApp\n`);
    
    res.json({ reply });
});

// Endpoint para Claude ver mensagens pendentes
app.get('/api/pending-messages', (req, res) => {
    const pending = JSON.parse(fs.readFileSync(pendingMessages, 'utf8'));
    const pendingOnly = pending.filter(msg => msg.status === 'pending');
    res.json(pendingOnly);
});

// Endpoint para Claude enviar respostas
app.post('/api/claude-response', (req, res) => {
    const { messageId, response } = req.body;
    
    const responses = JSON.parse(fs.readFileSync(responses, 'utf8'));
    responses[messageId] = response;
    fs.writeFileSync(responses, JSON.stringify(responses, null, 2));
    
    console.log(`📝 Claude respondeu mensagem ${messageId}: "${response}"`);
    res.json({ success: true });
});

// Endpoint para ver conversas
app.get('/api/conversations', (req, res) => {
    const conversations = JSON.parse(fs.readFileSync(conversationLog, 'utf8'));
    res.json(conversations);
});

// Endpoint de teste
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'Sistema Claude Bridge ativo!',
        timestamp: new Date().toISOString(),
        message: 'Pronto para receber mensagens do WhatsApp e processar com Claude' 
    });
});

// Inicializar arquivos e servidor
initializeFiles();

app.listen(port, () => {
    console.log(`🤖 Sistema Claude Bridge iniciado na porta ${port}`);
    console.log(`🌐 Teste: http://localhost:${port}/api/test`);
    console.log(`📥 Mensagens pendentes: http://localhost:${port}/api/pending-messages`);
    console.log(`💬 Conversas: http://localhost:${port}/api/conversations`);
    console.log(`📋 INSTRUÇÕES PARA CLAUDE:`);
    console.log(`   1. Monitore: http://localhost:${port}/api/pending-messages`);
    console.log(`   2. Responda via: POST /api/claude-response`);
    console.log(`   3. Formato: {messageId: "123", response: "sua resposta"}`);
    console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}\n`);
});