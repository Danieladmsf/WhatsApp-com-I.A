const fs = require('fs');
const path = require('path');

// Arquivos para monitorar
const whatsappMessagesPath = '/home/user/whatsapp_messages.json';
const claudeResponsePath = '/home/user/claude_response.json';

console.log('🤖 Claude Auto-Responder iniciado!');
console.log('📁 Monitorando:', whatsappMessagesPath);
console.log('💾 Respondendo em:', claudeResponsePath);
console.log('⏰ Iniciado em:', new Date().toLocaleString('pt-BR'));
console.log('========================\n');

let lastProcessedId = null;

// Função para gerar resposta inteligente
function generateResponse(senderId, message) {
    const lowerMessage = message.toLowerCase().trim();
    
    // Saudações
    if (lowerMessage.match(/^(ola|olá|oi|hello|hi|bom dia|boa tarde|boa noite)/)) {
        return "Olá! 👋 Prazer em falar com você! Sou o Claude, assistente de IA. Como posso ajudar?";
    }
    
    // Perguntas sobre data/hora
    if (lowerMessage.includes('que dia') || lowerMessage.includes('qual dia') || lowerMessage.includes('hoje')) {
        const hoje = new Date();
        const opcoes = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            timeZone: 'America/Sao_Paulo'
        };
        const dataFormatada = hoje.toLocaleDateString('pt-BR', opcoes);
        const hora = hoje.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        return `📅 Hoje é ${dataFormatada}\n⏰ Horário atual: ${hora}`;
    }
    
    if (lowerMessage.includes('que horas') || lowerMessage.includes('qual hora')) {
        const agora = new Date();
        const hora = agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        return `⏰ Agora são ${hora}`;
    }
    
    // Perguntas sobre clima
    if (lowerMessage.includes('tempo') || lowerMessage.includes('clima')) {
        return "Não tenho acesso a informações meteorológicas em tempo real, mas posso ajudar com outras coisas! O que você gostaria de saber?";
    }
    
    // Perguntas sobre preços/orçamentos
    if (lowerMessage.includes('preço') || lowerMessage.includes('valor') || lowerMessage.includes('orçamento') || lowerMessage.includes('quanto')) {
        return "Para informações sobre preços e orçamentos, nossa equipe pode ajudar! Que tipo de serviço ou produto você está procurando?";
    }
    
    // Contato/informações
    if (lowerMessage.includes('contato') || lowerMessage.includes('telefone') || lowerMessage.includes('endereço')) {
        return `📞 **Informações de Contato:**\n• WhatsApp: Este mesmo número\n• Horário: Segunda a Sexta, 8h às 18h\n\nComo posso ajudar você especificamente?`;
    }
    
    // Ajuda
    if (lowerMessage.includes('ajuda') || lowerMessage.includes('help') || lowerMessage.includes('como')) {
        return `🆘 **Como posso ajudar:**\n• Informações gerais\n• Horários de funcionamento\n• Dúvidas sobre produtos/serviços\n• Suporte básico\n\nO que você precisa?`;
    }
    
    // Agradecimentos
    if (lowerMessage.includes('obrigad') || lowerMessage.includes('valeu') || lowerMessage.includes('brigad')) {
        return "Por nada! 😊 Fico feliz em ajudar. Se precisar de mais alguma coisa, é só falar!";
    }
    
    // Despedidas
    if (lowerMessage.includes('tchau') || lowerMessage.includes('até logo') || lowerMessage.includes('falou') || lowerMessage.includes('bye')) {
        return "Até logo! 👋 Tenha um ótimo dia e volte sempre que precisar. Estou aqui para ajudar!";
    }
    
    // Problemas técnicos
    if (lowerMessage.includes('erro') || lowerMessage.includes('problema') || lowerMessage.includes('não funciona')) {
        return "Entendo que você está com algum problema. Pode me contar mais detalhes sobre o que está acontecendo? Vou fazer o possível para ajudar!";
    }
    
    // Resposta padrão inteligente
    return `Recebi sua mensagem: "${message}"\n\n🤖 Sou o Claude, assistente de IA! Posso ajudar com:\n• Informações gerais\n• Dúvidas sobre horários\n• Suporte básico\n• Perguntas do dia a dia\n\nO que você gostaria de saber?`;
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
        
        // Gerar resposta
        const response = generateResponse(message.senderId, message.message);
        console.log(`🤖 Minha resposta: "${response}"`);
        
        // Salvar resposta
        fs.writeFileSync(claudeResponsePath, JSON.stringify({ reply: response }));
        console.log(`✅ Resposta salva em: ${claudeResponsePath}`);
        console.log(`========================\n`);
        
        // Marcar como processada
        lastProcessedId = message.id;
        
    } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error.message);
    }
}

// Monitorar arquivos a cada 500ms
setInterval(processMessage, 500);

console.log('🔄 Monitoramento ativo! Aguardando mensagens...\n');