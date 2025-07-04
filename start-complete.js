const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando sistema COMPLETO WhatsApp + Claude Auto-Responder...\n');

// 1. Iniciar WhatsApp Integration API
console.log('🔌 Iniciando WhatsApp Integration API...');
const apiServer = spawn('node', ['whatsapp-integration.js'], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe']
});

apiServer.stdout.on('data', (data) => {
    console.log(`[API] ${data.toString().trim()}`);
});

apiServer.stderr.on('data', (data) => {
    console.error(`[API ERROR] ${data.toString().trim()}`);
});

// 2. Aguardar 2 segundos e iniciar Auto-Responder
setTimeout(() => {
    console.log('\n🤖 Iniciando Claude Auto-Responder...');
    
    const autoResponder = spawn('node', ['auto-responder.js'], {
        cwd: __dirname,
        stdio: ['inherit', 'pipe', 'pipe']
    });

    autoResponder.stdout.on('data', (data) => {
        console.log(`[Claude] ${data.toString().trim()}`);
    });

    autoResponder.stderr.on('data', (data) => {
        console.error(`[Claude ERROR] ${data.toString().trim()}`);
    });

    autoResponder.on('close', (code) => {
        console.log(`[Claude] Auto-Responder finalizado com código: ${code}`);
    });

}, 2000);

// 3. Aguardar 5 segundos e iniciar WhatsApp Bridge
setTimeout(() => {
    console.log('\n📱 Iniciando WhatsApp Bridge...');
    
    const whatsappBridge = spawn('node', ['script.js'], {
        cwd: __dirname,
        stdio: ['inherit', 'pipe', 'pipe']
    });

    whatsappBridge.stdout.on('data', (data) => {
        console.log(`[WhatsApp] ${data.toString().trim()}`);
    });

    whatsappBridge.stderr.on('data', (data) => {
        console.error(`[WhatsApp ERROR] ${data.toString().trim()}`);
    });

    whatsappBridge.on('close', (code) => {
        console.log(`[WhatsApp] Processo finalizado com código: ${code}`);
        apiServer.kill();
        process.exit(code);
    });

}, 5000);

apiServer.on('close', (code) => {
    console.log(`[API] Processo finalizado com código: ${code}`);
    process.exit(code);
});

// Capturar Ctrl+C para finalizar todos os processos
process.on('SIGINT', () => {
    console.log('\n🛑 Finalizando sistema completo...');
    apiServer.kill();
    process.exit(0);
});

console.log('\n✅ Sistema completo iniciado! Use Ctrl+C para parar.');
console.log('📊 Logs aparecem com prefixos [API], [Claude] e [WhatsApp]');
console.log('🎯 Agora o Claude responde AUTOMATICAMENTE as mensagens!');
console.log('========================\n');