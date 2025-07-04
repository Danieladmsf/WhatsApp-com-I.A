
# WhatsApp API Bridge

Este bot funciona como uma ponte entre um número de WhatsApp e sua aplicação principal. Ele encaminha as mensagens recebidas para uma API, que é responsável por processá-las com IA e retornar uma resposta.

## ⚙️ Checklist de Configuração Essencial
Siga **todos** estes passos na ordem para garantir que a ponte funcione corretamente.

---

### ✅ Passo 1: Instale as Dependências
No terminal, dentro da pasta `whatsapp-bridge`, execute:
```bash
npm install
```

---

### ✅ Passo 2: Faça o Deploy da sua Aplicação Web
Você precisa da URL pública da sua aplicação para o próximo passo.

1.  Navegue para a **pasta raiz do seu projeto** (a pasta que contém `firebase.json`).
2.  Execute o comando de deploy:
    ```bash
    firebase deploy
    ```
3.  Ao final, o terminal mostrará uma **"Hosting URL"**. Copie esta URL (ex: `https://seu-projeto.web.app`).

---

### ✅ Passo 3: Configure as Credenciais (`.env`)
Este é o passo mais importante.

1.  **Crie o arquivo:** Na pasta `whatsapp-bridge`, copie o arquivo `.env.example` para um novo arquivo chamado `.env`, caso ele não exista.
    ```bash
    # No Windows (CMD ou PowerShell)
    copy .env.example .env
    
    # No Linux ou MacOS
    cp .env.example .env
    ```
2.  **Abra o arquivo `.env`** que você acabou de criar.
3.  **Preencha as credenciais do Firebase:**
    *   Copie os valores do seu projeto no [Console do Firebase](https://console.firebase.google.com/) (Configurações do projeto -> Geral -> Seus apps -> Configuração do SDK) para as variáveis `NEXT_PUBLIC_FIREBASE_...`.
4.  **Preencha a URL da API (CRÍTICO):**
    *   Na variável `API_ENDPOINT_URL`, cole a "Hosting URL" que você copiou do Passo 2 e adicione `/api/whatsapp-chat` ao final.
    *   **Exemplo:** `API_ENDPOINT_URL=https://cotao-online.web.app/api/whatsapp-chat`

---

### ✅ Passo 4: Execute o Bot
Agora você pode iniciar a ponte. No terminal, dentro da pasta `whatsapp-bridge`:
```bash
npm start
```

Depois de iniciar, acesse a página "Painel de Controle do WhatsApp" na sua aplicação web para escanear o QR Code.

---

### **Solução de Problemas: O script trava em "Inicializando cliente"**

Se o script iniciar mas parar na mensagem "Inicializando cliente WhatsApp. Aguarde..." e não gerar o QR Code, siga estes passos para fazer uma reinstalação limpa na sua máquina local:

1.  **Pare o script** se ele estiver rodando (pressione `Ctrl + C` no terminal).

2.  **Delete as pastas de dependências e de sessão.** Abra o terminal **na pasta `whatsapp-bridge`** e execute o seguinte comando (funciona no PowerShell do Windows):
    ```powershell
    Remove-Item -Recurse -Force node_modules, .wwebjs_auth
    ```
    *(Este comando apaga a pasta `node_modules` e a pasta de sessão `.wwebjs_auth`)*

3.  **Limpe o cache do NPM** para garantir que não há pacotes corrompidos:
    ```bash
    npm cache clean --force
    ```

4.  **Reinstale tudo do zero:**
    ```bash
    npm install
    ```
    *(Este passo irá baixar novamente todas as bibliotecas, incluindo uma versão nova do navegador que o WhatsApp precisa.)*

5.  **Inicie o bot novamente:**
    ```bash
    npm start
    ```

Este processo resolve 99% dos problemas de inicialização travada.
