const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const port = 3001;

app.use(express.json());

// Arquivo para log de conversas
const conversationLog = path.join(__dirname, 'conversation_log.json');

// Função para salvar conversa
function saveConversation(senderId, message, reply) {
    let conversations = {};
    if (fs.existsSync(conversationLog)) {
        conversations = JSON.parse(fs.readFileSync(conversationLog, 'utf8'));
    }
    
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

// Função para processar mensagens
function processMessage(senderId, message) {
    const lowerMessage = message.toLowerCase();
    
    // Respostas inteligentes baseadas no contexto
    if (lowerMessage.includes('olá') || lowerMessage.includes('oi') || lowerMessage.includes('ola') || lowerMessage.includes('bom dia') || lowerMessage.includes('boa tarde') || lowerMessage.includes('boa noite')) {
        return `Olá! 👋 Sou um assistente inteligente. Como posso ajudar você hoje?`;
    }
    
    // Informações de data e hora
    if (lowerMessage.includes('que dia') || lowerMessage.includes('qual dia') || lowerMessage.includes('hoje') || lowerMessage.includes('data')) {
        const hoje = new Date();
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        const diaSemana = diasSemana[hoje.getDay()];
        const dia = hoje.getDate();
        const mes = meses[hoje.getMonth()];
        const ano = hoje.getFullYear();
        const hora = hoje.toLocaleTimeString('pt-BR');
        
        return `📅 Hoje é ${diaSemana}, ${dia} de ${mes} de ${ano}\n⏰ Horário atual: ${hora}`;
    }
    
    // Informações sobre horário
    if (lowerMessage.includes('que horas') || lowerMessage.includes('qual hora') || lowerMessage.includes('horário')) {
        const agora = new Date();
        const hora = agora.toLocaleTimeString('pt-BR');
        return `⏰ Agora são ${hora}`;
    }
    
    if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('quanto custa')) {
        return `Para informações sobre preços, entre em contato com nossa equipe comercial. Que tipo de serviço você está procurando?`;
    }
    
    if (lowerMessage.includes('horário') || lowerMessage.includes('funcionamento') || lowerMessage.includes('atendimento')) {
        return `Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Posso ajudar com alguma informação específica?`;
    }
    
    if (lowerMessage.includes('produto') || lowerMessage.includes('serviço')) {
        return `Temos diversos produtos e serviços disponíveis. Poderia me contar mais sobre o que você está procurando?`;
    }
    
    if (lowerMessage.includes('contato') || lowerMessage.includes('telefone') || lowerMessage.includes('email')) {
        return `Para contato direto:
📞 Telefone: (16) 99999-9999
📧 Email: contato@empresa.com
📍 Endereço: [Seu endereço]`;
    }
    
    if (lowerMessage.includes('ajuda') || lowerMessage.includes('help') || lowerMessage.includes('não entendi')) {
        return `Estou aqui para ajudar! Você pode me perguntar sobre:
• Preços e orçamentos
• Produtos e serviços
• Horários de atendimento
• Informações de contato
• Dúvidas gerais

O que você gostaria de saber?`;
    }
    
    if (lowerMessage.includes('obrigado') || lowerMessage.includes('obrigada') || lowerMessage.includes('valeu')) {
        return `Por nada! 😊 Fico feliz em ajudar. Se precisar de mais alguma coisa, é só falar!`;
    }
    
    if (lowerMessage.includes('tchau') || lowerMessage.includes('até logo') || lowerMessage.includes('falou')) {
        return `Até logo! 👋 Tenha um ótimo dia e volte sempre que precisar!`;
    }
    
    // Resposta padrão para mensagens não reconhecidas
    return `Interessante! Recebi sua mensagem: "${message}"
    
Sou um assistente inteligente e estou aqui para ajudar. Posso responder sobre:
• Informações da empresa
• Produtos e serviços
• Preços e orçamentos
• Horários de atendimento

Como posso ajudar você melhor?`;
}

// Endpoint principal para receber mensagens do WhatsApp
app.post('/api/whatsapp-chat', (req, res) => {
    const { senderId, message } = req.body;
    
    console.log(`\n=== NOVA MENSAGEM ===`);
    console.log(`📱 De: ${senderId}`);
    console.log(`💬 Mensagem: "${message}"`);
    console.log(`⏰ Horário: ${new Date().toLocaleString('pt-BR')}`);
    
    // Processar a mensagem
    const reply = processMessage(senderId, message);
    
    // Salvar no log
    saveConversation(senderId, message, reply);
    
    console.log(`🤖 Resposta: "${reply}"`);
    console.log(`========================\n`);
    
    // Retornar resposta
    res.json({ reply });
});

// Endpoint para ver conversas
app.get('/api/conversations', (req, res) => {
    if (fs.existsSync(conversationLog)) {
        const conversations = JSON.parse(fs.readFileSync(conversationLog, 'utf8'));
        res.json(conversations);
    } else {
        res.json({});
    }
});

// Endpoint para ver conversa específica
app.get('/api/conversations/:senderId', (req, res) => {
    const { senderId } = req.params;
    if (fs.existsSync(conversationLog)) {
        const conversations = JSON.parse(fs.readFileSync(conversationLog, 'utf8'));
        res.json(conversations[senderId] || []);
    } else {
        res.json([]);
    }
});

// Endpoint de teste
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'API funcionando!',
        timestamp: new Date().toISOString(),
        message: 'Servidor de atendimento WhatsApp ativo' 
    });
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`🚀 Servidor API iniciado na porta ${port}`);
    console.log(`🌐 Acesse: http://localhost:${port}/api/test`);
    console.log(`📝 Endpoint WhatsApp: http://localhost:${port}/api/whatsapp-chat`);
    console.log(`💬 Ver conversas: http://localhost:${port}/api/conversations`);
    console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
});