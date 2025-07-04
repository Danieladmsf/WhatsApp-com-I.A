#!/usr/bin/env python3
"""
Claude Bridge Simple - Ponte Python entre WhatsApp e Claude Code
Versão simplificada usando apenas bibliotecas nativas do Python
"""

import json
import time
import os
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
import threading
import urllib.parse

# Configuração
WHATSAPP_MESSAGES_PATH = '/home/user/whatsapp_messages.json'
CLAUDE_RESPONSE_PATH = '/home/user/claude_response.json'
CLAUDE_CONFIG_PATH = '/home/user/.claude.json'

class ClaudeBridge:
    def __init__(self):
        self.last_processed_id = None
        self.running = True
        print("🐍 Claude Bridge Python (Simple) iniciado!")
        print(f"📱 Monitorando: {WHATSAPP_MESSAGES_PATH}")
        print(f"🧠 Injetando em: {CLAUDE_CONFIG_PATH}")
        print(f"⏰ Iniciado em: {datetime.now().strftime('%d/%m/%Y, %H:%M:%S')}")
        print("========================\n")

    def inject_message_to_claude_history(self, sender_id, message, message_id):
        """Injeta mensagem no histórico do Claude Config"""
        try:
            # Ler configuração atual do Claude
            with open(CLAUDE_CONFIG_PATH, 'r', encoding='utf-8') as f:
                claude_config = json.load(f)
            
            # Preparar mensagem formatada para o Claude ver
            whatsapp_message = f"""🔔 MENSAGEM WHATSAPP RECEBIDA!

📱 **De:** {sender_id}
💬 **Mensagem:** "{message}"
🆔 **ID:** {message_id}
⏰ **Horário:** {datetime.now().strftime('%d/%m/%Y, %H:%M:%S')}

🎯 **AÇÃO NECESSÁRIA:**
Claude, por favor responda esta mensagem do WhatsApp usando Write tool para salvar em:
`{CLAUDE_RESPONSE_PATH}`

Formato: `{{"reply": "sua resposta aqui"}}`

Esta é uma mensagem REAL de um usuário do WhatsApp aguardando sua resposta!"""

            # Criar entrada no histórico como se o usuário tivesse digitado
            history_entry = {
                "display": whatsapp_message,
                "pastedContents": {}
            }
            
            # Verificar se o projeto existe no config
            if 'projects' not in claude_config:
                claude_config['projects'] = {}
            
            project_path = '/home/user'
            if project_path not in claude_config['projects']:
                claude_config['projects'][project_path] = {
                    "allowedTools": [],
                    "history": [],
                    "mcpContextUris": [],
                    "mcpServers": {},
                    "enabledMcpjsonServers": [],
                    "disabledMcpjsonServers": [],
                    "hasTrustDialogAccepted": False,
                    "projectOnboardingSeenCount": 1,
                    "hasClaudeMdExternalIncludesApproved": False,
                    "hasClaudeMdExternalIncludesWarningShown": False,
                    "lastTotalWebSearchRequests": 0
                }
            
            # Adicionar no INÍCIO do histórico (mais recente primeiro)
            claude_config['projects'][project_path]['history'].insert(0, history_entry)
            
            # Manter apenas os últimos 100 itens para performance
            if len(claude_config['projects'][project_path]['history']) > 100:
                claude_config['projects'][project_path]['history'] = \
                    claude_config['projects'][project_path]['history'][:100]
            
            # Salvar configuração atualizada
            with open(CLAUDE_CONFIG_PATH, 'w', encoding='utf-8') as f:
                json.dump(claude_config, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Mensagem INJETADA no Claude Config!")
            print(f"🎯 Claude deve ver automaticamente na próxima atualização")
            
            return True
            
        except Exception as error:
            print(f"❌ Erro ao injetar no Claude Config: {error}")
            return False

    def wait_for_claude_response(self, message_id, max_attempts=120):
        """Aguarda resposta do Claude por até 2 minutos"""
        attempts = 0
        
        while attempts < max_attempts and self.running:
            try:
                if os.path.exists(CLAUDE_RESPONSE_PATH):
                    with open(CLAUDE_RESPONSE_PATH, 'r', encoding='utf-8') as f:
                        response_data = json.load(f)
                    
                    if 'reply' in response_data and response_data['reply']:
                        print(f"🎉 CLAUDE RESPONDEU: \"{response_data['reply']}\"")
                        
                        # Limpar arquivo de resposta
                        os.remove(CLAUDE_RESPONSE_PATH)
                        
                        return response_data['reply']
                
                attempts += 1
                time.sleep(1)
                
            except Exception as error:
                print(f"❌ Erro ao verificar resposta: {error}")
                attempts += 1
                time.sleep(1)
        
        print(f"⏰ Timeout - Claude não respondeu em {max_attempts} segundos")
        return None

    def monitor_whatsapp_messages(self):
        """Monitora mensagens do WhatsApp em loop"""
        while self.running:
            try:
                # Verificar se existe arquivo de mensagem
                if not os.path.exists(WHATSAPP_MESSAGES_PATH):
                    time.sleep(2)
                    continue
                
                # Ler mensagem
                with open(WHATSAPP_MESSAGES_PATH, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                message = data.get('currentMessage')
                
                # Verificar se é uma nova mensagem
                if not message or message.get('id') == self.last_processed_id:
                    time.sleep(2)
                    continue
                
                print(f"🔔 NOVA MENSAGEM WHATSAPP DETECTADA!")
                print(f"📱 De: {message['senderId']}")
                print(f"💬 Mensagem: \"{message['message']}\"")
                print(f"⏰ Timestamp: {message['timestamp']}")
                
                # Injetar no histórico do Claude
                success = self.inject_message_to_claude_history(
                    message['senderId'], 
                    message['message'], 
                    message['id']
                )
                
                if success:
                    print(f"💉 MENSAGEM INJETADA COM SUCESSO!")
                    print(f"🤖 Claude deve ver automaticamente agora!")
                    print(f"⏳ Aguardando resposta do Claude...")
                    
                    # Aguardar resposta em thread separada para não bloquear
                    response_thread = threading.Thread(
                        target=self.wait_for_claude_response,
                        args=(message['id'],)
                    )
                    response_thread.start()
                
                print(f"========================\n")
                
                # Marcar como processada
                self.last_processed_id = message['id']
                
            except Exception as error:
                print(f"❌ Erro ao processar mensagem WhatsApp: {error}")
                time.sleep(2)

class WhatsAppHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests"""
        if self.path == '/api/whatsapp-chat':
            try:
                # Ler dados do POST
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                data = json.loads(post_data.decode('utf-8'))
                
                sender_id = data.get('senderId')
                message = data.get('message')
                
                print(f"\n🔔 NOVA MENSAGEM VIA API!")
                print(f"📱 De: {sender_id}")
                print(f"💬 Mensagem: \"{message}\"")
                print(f"⏰ Horário: {datetime.now().strftime('%d/%m/%Y, %H:%M:%S')}")
                
                # Processar mensagem diretamente
                message_id = str(int(time.time() * 1000))
                
                # Injetar no histórico do Claude
                success = bridge.inject_message_to_claude_history(sender_id, message, message_id)
                
                if success:
                    print(f"💉 Mensagem injetada! Aguardando Claude...")
                    
                    # Aguardar resposta do Claude
                    reply = bridge.wait_for_claude_response(message_id)
                    
                    if reply:
                        print(f"📤 Enviando resposta para WhatsApp: \"{reply}\"")
                        response = {"reply": reply}
                    else:
                        response = {"reply": "Desculpe, não consegui processar sua mensagem no momento. Tente novamente."}
                else:
                    response = {"reply": "Erro interno do servidor. Tente novamente."}
                
                # Enviar resposta
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
                
            except Exception as error:
                print(f"❌ Erro na API: {error}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"reply": "Erro interno do servidor."}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/test':
            response = {
                "status": "Claude Bridge Python (Simple) ativo!",
                "timestamp": datetime.now().isoformat(),
                "claude_config_exists": os.path.exists(CLAUDE_CONFIG_PATH),
                "message": "Sistema pronto para integração com Claude Code"
            }
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(response, ensure_ascii=False).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Suprimir logs automáticos do servidor"""
        return

# Criar instância global
bridge = ClaudeBridge()

def start_monitoring():
    """Inicia monitoramento em thread separada"""
    monitor_thread = threading.Thread(target=bridge.monitor_whatsapp_messages)
    monitor_thread.daemon = True
    monitor_thread.start()
    return monitor_thread

def start_server():
    """Inicia servidor HTTP"""
    server = HTTPServer(('0.0.0.0', 3001), WhatsAppHandler)
    print(f"🌐 Servidor HTTP iniciado na porta 3001")
    print(f"📋 Endpoints disponíveis:")
    print(f"   • POST /api/whatsapp-chat - Receber mensagens")
    print(f"   • GET /api/test - Teste do sistema")
    print(f"✍️ Claude deve usar Write tool para responder!\n")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Parando servidor...")
        bridge.running = False
        server.shutdown()

if __name__ == '__main__':
    print("🔄 Iniciando monitoramento automático...")
    start_monitoring()
    
    print("🚀 Claude Bridge Python (Simple) completo ativo!")
    start_server()