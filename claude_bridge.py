#!/usr/bin/env python3
"""
Claude Bridge - Ponte Python entre WhatsApp e Claude Code
Monitora mensagens e injeta no histórico do Claude automaticamente
"""

import json
import time
import os
from datetime import datetime
from flask import Flask, request, jsonify
import threading

# Configuração
WHATSAPP_MESSAGES_PATH = '/home/user/whatsapp_messages.json'
CLAUDE_RESPONSE_PATH = '/home/user/claude_response.json'
CLAUDE_CONFIG_PATH = '/home/user/.claude.json'

app = Flask(__name__)

class ClaudeBridge:
    def __init__(self):
        self.last_processed_id = None
        self.running = True
        print("🐍 Claude Bridge Python iniciado!")
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

    def start_monitoring(self):
        """Inicia monitoramento em thread separada"""
        monitor_thread = threading.Thread(target=self.monitor_whatsapp_messages)
        monitor_thread.daemon = True
        monitor_thread.start()
        return monitor_thread

# Criar instância global
bridge = ClaudeBridge()

@app.route('/api/whatsapp-chat', methods=['POST'])
def whatsapp_chat():
    """Endpoint para receber mensagens do WhatsApp"""
    try:
        data = request.get_json()
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
                return jsonify({"reply": reply})
            else:
                fallback_reply = "Desculpe, não consegui processar sua mensagem no momento. Tente novamente."
                return jsonify({"reply": fallback_reply})
        else:
            return jsonify({"reply": "Erro interno do servidor. Tente novamente."})
        
    except Exception as error:
        print(f"❌ Erro na API: {error}")
        return jsonify({"reply": "Erro interno do servidor."}), 500

@app.route('/api/test', methods=['GET'])
def test():
    """Endpoint de teste"""
    return jsonify({
        "status": "Claude Bridge Python ativo!",
        "timestamp": datetime.now().isoformat(),
        "claude_config_exists": os.path.exists(CLAUDE_CONFIG_PATH),
        "message": "Sistema pronto para integração com Claude Code"
    })

@app.route('/api/status', methods=['GET'])
def status():
    """Status do sistema"""
    return jsonify({
        "bridge_running": bridge.running,
        "last_processed_id": bridge.last_processed_id,
        "files_status": {
            "whatsapp_messages": os.path.exists(WHATSAPP_MESSAGES_PATH),
            "claude_config": os.path.exists(CLAUDE_CONFIG_PATH),
            "claude_response": os.path.exists(CLAUDE_RESPONSE_PATH)
        }
    })

if __name__ == '__main__':
    print("🔄 Iniciando monitoramento automático...")
    bridge.start_monitoring()
    
    print("🌐 Iniciando servidor Flask...")
    print("🚀 Claude Bridge Python completo ativo!")
    print("📋 Endpoints disponíveis:")
    print("   • POST /api/whatsapp-chat - Receber mensagens")
    print("   • GET /api/test - Teste do sistema")
    print("   • GET /api/status - Status detalhado")
    print("✍️ Claude deve usar Write tool para responder!\n")
    
    app.run(host='0.0.0.0', port=3001, debug=False)