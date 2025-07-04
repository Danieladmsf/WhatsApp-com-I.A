
// 1. Importação de Módulos
console.log('🔧 Iniciando importações...');
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, serverTimestamp, collection, query, where, onSnapshot, updateDoc } = require('firebase/firestore');
const qrcode = require('qrcode');
const axios = require('axios');
console.log('✅ Módulos importados.');


// 2. Configuração do Firebase
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.error('!!! ERRO CRÍTICO: As variáveis do Firebase não foram         !!!');
    console.error('!!! carregadas do arquivo .env. Verifique o arquivo.       !!!');
    console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const WHATSAPP_CONFIG_COLLECTION = 'whatsapp_config';
const WHATSAPP_STATUS_DOC = 'status';
const WHATSAPP_QUEUE_COLLECTION = 'whatsapp_queue';

console.log('🔥 Firebase inicializado para o projeto:', firebaseConfig.projectId);

// Função auxiliar para atualizar o status no Firestore
const updateStatusInFirestore = async (statusData) => {
    try {
        const statusDocRef = doc(db, WHATSAPP_CONFIG_COLLECTION, WHATSAPP_STATUS_DOC);
        console.log(`[Firestore] Preparando para escrever no documento: ${WHATSAPP_CONFIG_COLLECTION}/${WHATSAPP_STATUS_DOC}`);
        await setDoc(statusDocRef, { ...statusData, updatedAt: serverTimestamp() }, { merge: true });
        console.log(`[Firestore] Status atualizado com sucesso para: ${statusData.status}`);
    } catch (error) {
        console.error('[Firestore] ERRO CRÍTICO ao atualizar status:', error.message, error.stack);
    }
};


// 3. Inicialização do Cliente WhatsApp
console.log('📱 Criando cliente WhatsApp...');
const client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    }
});

// 4. Manipulação de Eventos do Cliente

// Evento: Geração de QR Code
client.on('qr', async (qr) => {
  console.log('[DEBUG] QR Code gerado no terminal.');
  
  try {
    console.log('[DEBUG] Convertendo QR Code para Data URI...');
    const qrDataUri = await qrcode.toDataURL(qr);
    console.log(`[DEBUG] Data URI gerado (tamanho: ${qrDataUri.length} caracteres).`);
    
    console.log('[DEBUG] Enviando status e QR Code para o Firestore...');
    await updateStatusInFirestore({
        status: 'needs_qr',
        qrDataUri: qrDataUri,
        generatedAt: serverTimestamp()
    });
    console.log('[QR Code] Sucesso! QR Code enviado para o Firestore.');

  } catch (err) {
      console.error(`❌ [FIRESTORE] Falha ao gerar ou salvar QR Code: ${err.name}`);
      console.error(`[DEBUG] Erro detalhado: ${err.message}`);
  }
});

// Evento: Autenticação bem-sucedida
client.on('authenticated', () => {
    console.log('✅ Autenticado com sucesso no WhatsApp!');
});

// Evento: Cliente pronto para operar
client.on('ready', async () => {
  console.log('\n==================================================');
  console.log('✅ CONEXÃO BEM-SUCEDIDA! O bot está pronto.');
  console.log('==================================================\n');
  await updateStatusInFirestore({ status: 'connected', qrDataUri: null, readyAt: serverTimestamp() });
  
  listenToMessageQueue();
});

// 5. Função para ouvir a fila de mensagens
function listenToMessageQueue() {
    console.log(`[Queue] Ouvindo a coleção '${WHATSAPP_QUEUE_COLLECTION}' por mensagens pendentes...`);
    
    const q = query(collection(db, WHATSAPP_QUEUE_COLLECTION), where("status", "==", "pending"));

    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            // This is a normal state, no need to log every time.
            // console.log("[Queue] Nenhuma mensagem pendente encontrada.");
            return;
        }
        
        console.log(`[Queue] ${snapshot.size} nova(s) mensagem(ns) pendente(s) encontrada(s).`);
        snapshot.docs.forEach(async (docSnapshot) => {
            const messageData = docSnapshot.data();
            const messageId = docSnapshot.id;
            const { phoneNumber, message } = messageData;
            
            const chatId = `${phoneNumber}@c.us`;
            console.log(`[Send] Preparando para enviar mensagem ID: ${messageId} para ${chatId}`);

            try {
                await client.sendMessage(chatId, message);
                console.log(`[Send] ✅ Mensagem para ${chatId} enviada com sucesso.`);
                
                const messageDocRef = doc(db, WHATSAPP_QUEUE_COLLECTION, messageId);
                await updateDoc(messageDocRef, {
                    status: 'sent',
                    processedAt: serverTimestamp()
                });
                console.log(`[Firestore] Status da mensagem ${messageId} atualizado para 'sent'.`);

            } catch (error) {
                console.error(`[Send] ❌ FALHA ao enviar mensagem para ${chatId}:`, error.message);
                
                const messageDocRef = doc(db, WHATSAPP_QUEUE_COLLECTION, messageId);
                await updateDoc(messageDocRef, {
                    status: 'failed',
                    error: error.message || 'Erro desconhecido',
                    processedAt: serverTimestamp()
                });
                 console.log(`[Firestore] Status da mensagem ${messageId} atualizado para 'failed'.`);
            }
        });
    }, (error) => {
        console.error("[Queue] ERRO CRÍTICO ao ouvir a fila de mensagens:", error);
    });
}

// Evento: Mensagem recebida
client.on('message', async (message) => {
    if (message.from.endsWith('@g.us') || message.fromMe || message.isStatus || message.from.endsWith('@newsletter')) {
        return;
    }
    const sender = message.from;
    const text = message.body;
    console.log(`[>>] Mensagem recebida de ${sender}: "${text}"`);
    
    // Validação da API_ENDPOINT_URL
    const API_ENDPOINT = process.env.API_ENDPOINT_URL;
    if (!API_ENDPOINT) {
        console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
        console.error('!!! ERRO CRÍTICO: A variável API_ENDPOINT_URL não está configurada. !!!');
        console.error('!!!                                                                      !!!');
        console.error('!!! 1. Verifique se você criou o arquivo `.env` na pasta `whatsapp-bridge`. !!!');
        console.error('!!! 2. Certifique-se de que a linha `API_ENDPOINT_URL=...` existe nele.    !!!');
        console.error('!!! 3. O valor deve ser a URL completa da sua aplicação + `/api/whatsapp-chat`. !!!');
        console.error('!!!                                                                      !!!');
        console.error('!!! Siga as instruções no arquivo `whatsapp-bridge/README.md` atentamente. !!!');
        console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');
        client.sendMessage(sender, "Desculpe, o assistente de IA não está configurado corretamente pelo administrador (API_ENDPOINT_URL não encontrada).");
        return;
    }

    try {
        console.log(`[API] Enviando para: ${API_ENDPOINT}`);
        const response = await axios.post(API_ENDPOINT, {
            senderId: sender.replace('@c.us', ''),
            message: text,
        });

        const replyText = response.data.reply;
        if (replyText) {
            console.log(`[API] Resposta da IA: "${replyText}"`);
            client.sendMessage(sender, replyText);
        } else {
            console.warn('[API] A API retornou uma resposta vazia.');
        }

    } catch (error) {
        let errorMessage = "Ocorreu um erro desconhecido.";
        if (axios.isAxiosError(error)) {
            errorMessage = error.response?.data?.details || error.response?.data?.error || error.message;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error('❌ ERRO AO CONTATAR A API:', errorMessage);
        client.sendMessage(sender, `Desculpe, não consegui processar sua solicitação no momento. (Erro: ${errorMessage})`);
    }
});

// Evento: Cliente desconectado
client.on('disconnected', async (reason) => {
    console.warn('🔌 Cliente desconectado. Razão:', reason);
    await updateStatusInFirestore({ status: 'disconnected', disconnectedAt: serverTimestamp() });
});

// 6. Inicialização do Processo
console.log('--- Inicializando cliente WhatsApp. Aguarde... ---');
updateStatusInFirestore({ status: 'initializing' });
client.initialize().catch(err => {
    console.error("!!!!!!!!!! FALHA NA INICIALIZAÇÃO DO CLIENTE !!!!!!!!!!!");
    console.error(err);
    updateStatusInFirestore({ status: 'disconnected', error: err.message });
});
