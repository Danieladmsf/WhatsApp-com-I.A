
# Guia Rápido - Ponte do WhatsApp com Firebase

Este guia mostra como rodar este bot na sua máquina local para que ele se conecte ao seu projeto Firebase e envie o QR Code para a página de administração.

## Passo 1: Configurar Credenciais

1.  **Copie o Exemplo:** No terminal, dentro desta pasta, execute:
    ```bash
    cp .env.example .env
    ```

2.  **Preencha as Credenciais:** Abra o novo arquivo `.env` e cole os valores de configuração do seu projeto Firebase. Você pode encontrá-los no **Console do Firebase > Configurações do Projeto > Geral > Seus apps > App da Web > Configuração do SDK**.

## Passo 2: Instalar as Dependências

Ainda no terminal, dentro desta pasta, execute o comando para instalar todas as bibliotecas necessárias:

```bash
npm install
```

## Passo 3: Executar o Bot

Após a instalação, inicie o bot:

```bash
npm start
```

-   Um QR Code pequeno aparecerá no seu terminal como um backup.
-   O QR Code principal será enviado para o Firestore e deverá aparecer na sua página "Painel de Controle do WhatsApp".

**Pronto!** Após escanear o QR Code (na página web ou no terminal), o bot estará conectado e o status na página será atualizado.
