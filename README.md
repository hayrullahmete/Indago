# Indago

Indago is a lightweight culture and arts news reader that brings stories from selected RSS feeds into one place. Its interface is available in Turkish and English.

## Features

- Aggregates recent stories from configurable RSS sources.
- Offers Turkish and English interface options, saved in the browser.
- Supports dark and light themes and adjustable text size.
- Creates an on-demand summary with either a local Ollama model or the OpenAI API. Summaries appear in a popup only after a user chooses a provider.
- Keeps the OpenAI API key and the local RSS source list out of Git commits.

## Requirements

- Node.js 18 or later.
- For local summaries: [Ollama](https://ollama.com/) with the `qwen3.8:latest` model available.
- For OpenAI summaries: an OpenAI API key.

## Setup

1. Clone the repository and open a terminal in the project directory.
2. Copy the example configuration files to their local filenames:

   **PowerShell**

   ```powershell
   Copy-Item sources.example.json sources.json
   Copy-Item local.config.example.json local.config.json
   ```

   **macOS / Linux**

   ```sh
   cp sources.example.json sources.json
   cp local.config.example.json local.config.json
   ```

3. Edit `sources.json` to choose the RSS feeds to display.
4. To enable OpenAI summaries, add your key to `openaiApiKey` in `local.config.json`. You can also set `openaiModel` there; it defaults to `gpt-4o-mini`.
5. Start the app:

   ```sh
   npm start
   ```

6. Open [http://localhost:50001](http://localhost:50001).

Local Ollama summaries use the `qwen3.8:latest` model by default. Optional environment variables can override the defaults:

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `50001` | Local web server port |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama server address |
| `OLLAMA_MODEL` | `qwen3.8:latest` | Local summary model |
| `OPENAI_API_KEY` | `local.config.json` value | OpenAI API key; environment variable takes precedence |
| `OPENAI_MODEL` | `local.config.json` value or `gpt-4o-mini` | OpenAI summary model |

## Local configuration and Git

`sources.json` and `local.config.json` are machine-specific and ignored by Git. The repository includes `sources.example.json` and `local.config.example.json` as safe templates. Never put a real API key in an example file or commit it to the repository.

The API key is read by the Node.js server and is not sent to the browser. Story content is sent to the selected summary provider only when its summary button is clicked. Local Ollama summaries stay on the local Ollama service; OpenAI summaries are sent to OpenAI's API.

## Technologies

- Node.js built-in HTTP server and `fetch`
- HTML, CSS and vanilla JavaScript
- RSS / Atom feeds
- Ollama and the OpenAI Responses API

---

# Indago (Türkçe)

Indago, seçilen RSS akışlarındaki kültür ve sanat haberlerini tek yerde toplayan hafif bir haber okuyucusudur. Arayüz Türkçe ve İngilizce kullanılabilir.

## Özellikler

- Yapılandırılabilir RSS kaynaklarından güncel haberleri listeler.
- Dil seçimini tarayıcıda hatırlar; koyu/açık tema ve yazı boyutu ayarları sunar.
- Haber özeti yalnızca kullanıcı ilgili sağlayıcıyı seçtiğinde oluşturulur ve popup’ta gösterilir. Yerel Ollama modeli veya OpenAI API kullanılabilir.
- OpenAI API anahtarı ve yerel RSS kaynak listesi Git’e eklenmez.

## Gereksinimler

- Node.js 18 veya üzeri.
- Yerel özet için: [Ollama](https://ollama.com/) ve kullanılabilir `qwen3.8:latest` modeli.
- OpenAI özeti için: OpenAI API anahtarı.

## Kurulum

Depoyu klonladıktan sonra proje klasöründe örnek dosyaları yerel dosya adlarına kopyalayın:

```powershell
Copy-Item sources.example.json sources.json
Copy-Item local.config.example.json local.config.json
```

`sources.json` içinde RSS kaynaklarını düzenleyin. OpenAI özetlerini etkinleştirmek için API anahtarınızı `local.config.json` dosyasındaki `openaiApiKey` alanına yazın. İsterseniz `openaiModel` alanıyla modeli değiştirebilirsiniz; varsayılan model `gpt-4o-mini`.

Uygulamayı başlatın ve [http://localhost:50001](http://localhost:50001) adresini açın:

```sh
npm start
```

Yerel Ollama modeli varsayılan olarak `qwen3.8:latest` kullanır. Model, sunucu adresi ve port ortam değişkenleriyle ayarlanabilir: `OLLAMA_MODEL`, `OLLAMA_URL`, `PORT`. `OPENAI_API_KEY` ve `OPENAI_MODEL` ortam değişkenleri yerel yapılandırma dosyasındaki değerlerin önüne geçer.

## Yerel yapılandırma ve Git

`sources.json` ile `local.config.json` makineye özeldir ve `.gitignore` içinde tutulur. GitHub’a gönderilebilecek örnekler `sources.example.json` ve `local.config.example.json` dosyalarıdır. Gerçek API anahtarınızı örnek dosyalara yazmayın veya depoya göndermeyin.

API anahtarı yalnızca Node.js sunucusunda okunur ve tarayıcıya aktarılmaz. Haber içeriği seçilen özet sağlayıcısına, yalnızca ilgili özet butonuna basıldığında gönderilir. Yerel özet Ollama servisinde kalır; OpenAI özeti OpenAI API’sine gönderilir.
