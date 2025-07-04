const fs = require('fs');
const path = require('path');

// Arquivos para monitorar
const whatsappMessagesPath = '/home/user/whatsapp_messages.json';
const claudeResponsePath = '/home/user/claude_response.json';

console.log('🧠 Smart Responder Claude-Style iniciado!');
console.log('📁 Monitorando:', whatsappMessagesPath);
console.log('💾 Respondendo em:', claudeResponsePath);
console.log('⏰ Iniciado em:', new Date().toLocaleString('pt-BR'));
console.log('========================\n');

let lastProcessedId = null;

// Base de conhecimento inteligente estilo Claude
function generateClaudeStyleResponse(senderId, message) {
    const lowerMessage = message.toLowerCase().trim();
    const currentTime = new Date();
    const timeString = currentTime.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const dateString = currentTime.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'America/Sao_Paulo'
    });
    
    // Análise inteligente da mensagem
    const isGreeting = /^(olá|ola|oi|hey|hello|hi|bom dia|boa tarde|boa noite)$/i.test(lowerMessage);
    const isQuestion = message.includes('?') || lowerMessage.startsWith('que') || lowerMessage.startsWith('qual') || lowerMessage.startsWith('como');
    const isTimeQuery = /que horas|qual hora|horário|hora/i.test(lowerMessage);
    const isDateQuery = /que dia|qual dia|hoje|data/i.test(lowerMessage);
    const isPriceQuery = /preço|valor|quanto|orçamento|custo/i.test(lowerMessage);
    const isContactQuery = /contato|telefone|endereço|email/i.test(lowerMessage);
    const isHelpQuery = /ajuda|help|socorro|não entendi/i.test(lowerMessage);
    const isThanks = /obrigad|valeu|brigad|thanks/i.test(lowerMessage);
    const isBye = /tchau|até logo|falou|bye|adeus/i.test(lowerMessage);
    
    // Respostas estilo Claude Code
    if (isGreeting) {
        const greetings = [
            "Olá! 👋 Prazer em conversar com você! Sou um assistente inteligente. Como posso ajudar hoje?",
            "Oi! 😊 É ótimo falar com você! Estou aqui para ajudar no que precisar. O que você gostaria de saber?",
            "Olá! 🌟 Bem-vindo! Sou seu assistente virtual e estou pronto para ajudar. Em que posso ser útil?"
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    if (isTimeQuery) {
        return `⏰ **Horário atual:** ${timeString}\n\nPosso ajudar com mais alguma coisa?`;
    }
    
    if (isDateQuery) {
        return `📅 **Hoje é:** ${dateString}\n⏰ **Horário:** ${timeString}\n\nHá algo mais que posso esclarecer?`;
    }
    
    if (isPriceQuery) {
        return `💰 **Informações sobre preços:**\n\nPara orçamentos personalizados, nossa equipe comercial pode ajudar melhor. \n\nQue tipo de produto ou serviço você tem interesse? Assim posso direcionar sua consulta adequadamente.`;
    }
    
    if (isContactQuery) {
        return `📞 **Informações de Contato:**\n\n• **WhatsApp:** Este mesmo número\n• **Horário de Atendimento:** Segunda a Sexta, 8h às 18h\n• **E-mail:** Disponível via WhatsApp\n\nEstou aqui para ajudar com o que precisar!`;
    }
    
    if (isHelpQuery) {
        return `🆘 **Posso ajudar você com:**\n\n• ℹ️ Informações gerais\n• ⏰ Horários de funcionamento\n• 📋 Dúvidas sobre produtos/serviços\n• 💬 Suporte básico\n• 📞 Informações de contato\n\nO que você gostaria de saber especificamente?`;
    }
    
    if (isThanks) {
        return "😊 Por nada! Fico muito feliz em ajudar! Se precisar de mais alguma coisa, estarei aqui. Tenha um ótimo dia!";
    }
    
    if (isBye) {
        return "👋 Até logo! Foi um prazer conversar com você. Tenha um excelente dia e volte sempre que precisar. Estou aqui para ajudar!";
    }
    
    // Análise semântica avançada
    if (lowerMessage.includes('problema') || lowerMessage.includes('erro') || lowerMessage.includes('não funciona')) {
        return `🔧 **Vamos resolver isso!**\n\nEntendo que você está enfrentando uma dificuldade. Pode me contar mais detalhes sobre o que está acontecendo? \n\nQuanto mais informações você fornecer, melhor poderei orientar uma solução.`;
    }
    
    if (lowerMessage.includes('como') && (lowerMessage.includes('fazer') || lowerMessage.includes('usar'))) {
        return `📚 **Orientações:**\n\nFico feliz em ajudar com instruções! Para dar a melhor orientação possível, pode me contar especificamente o que você gostaria de aprender ou fazer?\n\nAssim posso fornecer um passo-a-passo detalhado.`;
    }
    
    // Resposta inteligente padrão
    if (isQuestion) {
        return `🤔 **Interessante pergunta!**\n\nVocê perguntou: "${message}"\n\nSou um assistente inteligente e posso ajudar com diversas informações. Para dar a resposta mais útil, pode me contar um pouco mais sobre o contexto da sua pergunta?\n\n**Posso ajudar com:**\n• Informações gerais\n• Horários e contatos\n• Dúvidas sobre produtos/serviços\n• Orientações básicas`;
    }
    
    // Resposta padrão inteligente
    return `💭 **Recebi sua mensagem:**\n"${message}"\n\n🤖 Sou um assistente inteligente e estou aqui para ajudar! \n\n**Posso auxiliar com:**\n• 📋 Informações sobre produtos/serviços\n• ⏰ Horários de funcionamento\n• 📞 Informações de contato\n• 💰 Consultas sobre preços\n• 🆘 Suporte geral\n\nComo posso ser mais útil para você hoje?`;
}

// Função para processar mensagens
function processMessage() {
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
        
        // Gerar resposta inteligente estilo Claude
        const response = generateClaudeStyleResponse(message.senderId, message.message);
        console.log(`🧠 Resposta Claude-Style: "${response}"`);
        
        // Salvar resposta
        fs.writeFileSync(claudeResponsePath, JSON.stringify({ reply: response }));
        console.log(`✅ Resposta salva e enviada!`);
        console.log(`========================\n`);
        
        // Marcar como processada
        lastProcessedId = message.id;
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error.message);
    }
}

// Monitorar arquivos a cada 500ms
setInterval(processMessage, 500);

console.log('🔄 Smart Responder ativo!');
console.log('🧠 Respostas inteligentes estilo Claude Code');
console.log('⚡ Zero dependência externa - 100% funcional!\n');