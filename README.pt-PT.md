<p align="center">
  <img src="icons/icon128.png" width="96" height="96" alt="Plainly" />
</p>

<h1 align="center">Plainly</h1>

<p align="center">
  <strong>Texto codificado → texto simples que consegues ler.</strong><br />
  Funciona no Reddit de imediato. Podes adicionar outros sites no menu.
</p>

<p align="center">
  <a href="./README.md">English</a>
  ·
  <a href="https://github.com/27mfp/plainly">GitHub</a>
</p>

<p align="center">
  <img src="docs/demo-v2.png" alt="Linhas codificadas e texto simples (Google, YouTube, este projeto)" width="720" />
</p>

---

## O que faz

Alguns posts escondem links ou mensagens em códigos longos. O **Plainly** encontra-os e mostra a versão legível ao lado.

- Funciona sozinho no Reddit  
- Podes acrescentar mais sites, ou usar **Paste sites** para páginas de listas (rentry, pastebin, FMHY, …)  
- Se o texto for um link, podes abri-lo  
- Copiar com um clique  
- Códigos em camadas são desfeitos quando faz sentido  
- Nada é enviado para servidores — ver [PRIVACY.md](./PRIVACY.md)

## Exemplo

O endereço deste projeto, em código:

```text
aHR0cHM6Ly9naXRodWIuY29tLzI3bWZwL3BsYWlubHk=
```

O Plainly mostra: `https://github.com/27mfp/plainly`

## Instalar

Primeiro descarrega ou clona o projeto: [github.com/27mfp/plainly](https://github.com/27mfp/plainly)  
(Usa a pasta raiz — a que contém o [`manifest.json`](./manifest.json).)

### Chrome / Edge / Brave

1. Abre `chrome://extensions` (ou `edge://extensions`)  
2. Liga o **Modo de programador**  
3. Clica em **Carregar expandida** e escolhe **a pasta do projeto** (a que tem o [`manifest.json`](./manifest.json) dentro — não uma subpasta)  
4. Abre o Reddit (ou um site que tenhas adicionado) e **atualiza** o separador  

Podes fixar o Plainly no menu do puzzle das extensões.

### Firefox

1. Abre `about:debugging#/runtime/this-firefox`  
2. Clica em **Carregar complemento temporário…**  
3. Escolhe o ficheiro **[`manifest.json`](./manifest.json)** na raiz do projeto (não uses pastas `dist` / `dist-firefox`)  
4. Abre o Reddit (ou um site que tenhas adicionado) e **atualiza** o separador  

Complementos temporários são removidos quando o Firefox reinicia. Para instalação permanente: `npm run package:firefox` e usa o zip, ou instala em [addons.mozilla.org](https://addons.mozilla.org) quando publicado.

**Código:** [github.com/27mfp/plainly](https://github.com/27mfp/plainly) · **Ficheiro de configuração:** [`manifest.json`](./manifest.json)

## Como usar

| Queres… | Faz isto |
| --- | --- |
| Ler o texto simples | Procura a etiqueta cinzenta ao lado do código |
| Abrir um link | Clica no endereço na etiqueta |
| Copiar | Clica no ícone de copiar |
| Usar o site em que estás | Menu → **This page** → **Add** → permitir → **atualizar** |
| Listas tipo FMHY / pastes | Menu → **Paste sites** → **Add these** → permitir → **atualizar** |
| Adicionar outro site | Menu → **Your sites** → escreve `example.com` → **Add** → permitir → **atualizar** |
| Remover um site | Menu → **×** ao lado do nome |
| Desligar | Menu → interruptor **On** |
| Testar texto à mão | Menu → abre **Try text** → cola |

## Para programadores

```bash
npm test
npm run icons
```

Como contribuir: [CONTRIBUTING.md](./CONTRIBUTING.md)  
README em inglês: [README.md](./README.md)

## Privacidade e segurança

- Sem tracking, sem contas, sem servidores remotos  
- O Reddit vem incluído; outros sites só depois de autorizares  
- Guarda só: ligado/desligado e a lista de sites  

[Privacidade](./PRIVACY.md) · [Segurança](./SECURITY.md) · [Licença (MIT)](./LICENSE)
