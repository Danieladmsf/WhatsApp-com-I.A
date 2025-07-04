const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando sistema completo WhatsApp + API...\n');

// Iniciar Claude Bridge
console.log('🤖 Iniciando Claude Bridge...');
const apiServer = spawn('node', ['whatsapp-integration.js'], {
    cwd: __dirname,
    stdio: ['inherit', 'pipe', 'pipe']
});

apiServer.stdout.on('data', (data) => {
    console.log(`[Claude] ${data.toString().trim()}`);
});

apiServer.stderr.on('data', (data) => {
    console.error(`[Claude ERROR] ${data.toString().trim()}`);
});

// Aguardar 3 segundos para API inicializar
setTimeout(() => {
    console.log('\n📱 Iniciando WhatsApp Bridge...');
    
    // Iniciar WhatsApp Bridge
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

}, 3000);

apiServer.on('close', (code) => {
    console.log(`[Claude] Processo finalizado com código: ${code}`);
    process.exit(code);
});

// Capturar Ctrl+C para finalizar ambos os processos
process.on('SIGINT', () => {
    console.log('\n🛑 Finalizando sistema...');
    apiServer.kill();
    process.exit(0);
});

console.log('\n✅ Sistema iniciado! Use Ctrl+C para parar.');
console.log('📊 Logs aparecem com prefixos [Claude] e [WhatsApp]');