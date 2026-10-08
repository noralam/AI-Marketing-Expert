/**
 * AI Marketing Expert — Full-Document Automated Translation Engine (i18n)
 *
 * Automatically translates the ENTIRE documentation into localized subdirectories:
 *   docs/bn/index.html  (Bengali)
 *   docs/es/index.html  (Spanish)
 *   docs/de/index.html  (German)
 *   docs/fr/index.html  (French)
 *   docs/ja/index.html  (Japanese)
 *   docs/pt/index.html  (Portuguese)
 *   docs/ar/index.html  (Arabic - RTL)
 *
 * Complete Coverage:
 *   - Sidebar navigation & accordion submenus
 *   - Hero Call-to-Action banner, buttons, and badges
 *   - ALL section headings (h1, h2, h3, h4, h5)
 *   - ALL body paragraphs (<p>), bullet points (<li>), and ordered steps (<ol>)
 *   - Feature cards, spotlight highlights, callouts, and notes
 *   - FAQ accordion questions & answers
 *   - Micro-video cards and descriptions
 *   - Search placeholder, image alts, and figure captions
 *   - Mobile bottom quick navigation bar
 *   - Safe HTML protection: Never alters <pre>, <code>, <script>, <style>, <svg>, or tags/classes
 *
 * CLI Usage:
 *   node scripts/translate-docs.js                 (Build all languages)
 *   node scripts/translate-docs.js --lang=bn       (Build Bengali only)
 *   node scripts/translate-docs.js --lang=es       (Build Spanish only)
 *   node scripts/translate-docs.js --fast          (Dictionary + Cache only, no external calls)
 *   node scripts/translate-docs.js --ai            (Use AI provider if GEMINI_API_KEY/OPENAI_API_KEY set)
 *   node scripts/translate-docs.js --clean         (Clear translation cache)
 */

const fs = require('fs');
const path = require('path');

// ── Target Language Definitions ──
const TARGET_LANGUAGES = {
  bn: { name: 'বাংলা', flag: '🇧🇩', dir: 'ltr', englishName: 'Bengali' },
  es: { name: 'Español', flag: '🇪🇸', dir: 'ltr', englishName: 'Spanish' },
  de: { name: 'Deutsch', flag: '🇩🇪', dir: 'ltr', englishName: 'German' },
  fr: { name: 'Français', flag: '🇫🇷', dir: 'ltr', englishName: 'French' },
  ja: { name: '日本語', flag: '🇯🇵', dir: 'ltr', englishName: 'Japanese' },
  pt: { name: 'Português', flag: '🇧🇷', dir: 'ltr', englishName: 'Portuguese' },
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl', englishName: 'Arabic' },
  hi: { name: 'हिन्दी', flag: '🇮🇳', dir: 'ltr', englishName: 'Hindi' }
};

// ── Master UI Dictionary (Instant, Zero-Lag) ──
const UI_DICTIONARY = {
  // Navigation Sections
  'Getting Started': {
    bn: 'শুরু করা যাক', es: 'Primeros Pasos', de: 'Erste Schritte',
    fr: 'Premiers Pas', ja: 'はじめに', pt: 'Primeiros Passos', ar: 'البداية'
  },
  'Feature Highlight': {
    bn: 'প্রধান ফিচারসমূহ', es: 'Funciones Destacadas', de: 'Funktions-Highlights',
    fr: 'Fonctions Vedettes', ja: '注目の機能', pt: 'Destaques de Recursos', ar: 'أبرز الميزات'
  },
  'Feature Spotlight': {
    bn: 'প্রধান ফিচারসমূহ', es: 'Funciones Destacadas', de: 'Funktions-Highlights',
    fr: 'Fonctions Vedettes', ja: '注目の機能', pt: 'Destaques de Recursos', ar: 'أبرز الميزات'
  },
  'Core Modules': {
    bn: 'কোর মডিউলসমূহ', es: 'Módulos Principales', de: 'Kernmodule',
    fr: 'Modules Principaux', ja: 'コアモジュール', pt: 'Módulos Principais', ar: 'الوحدات الأساسية'
  },
  'System Reliability': {
    bn: 'সিস্টেম ও নির্ভরযোগ্যতা', es: 'Confiabilidad del Sistema', de: 'System & Zuverlässigkeit',
    fr: 'Système et Fiabilité', ja: 'システムと信頼性', pt: 'Sistema e Confiabilidade', ar: 'موثوقية النظام'
  },
  'System & Reliability': {
    bn: 'সিস্টেম ও নির্ভরযোগ্যতা', es: 'Confiabilidad del Sistema', de: 'System & Zuverlässigkeit',
    fr: 'Système et Fiabilité', ja: 'システムと信頼性', pt: 'Sistema e Confiabilidade', ar: 'موথوقية النظام'
  },

  // Sidebar Links - Getting Started
  'Introduction': {
    bn: 'পরিচিতি', es: 'Introducción', de: 'Einführung',
    fr: 'Introduction', ja: 'はじめに', pt: 'Introdução', ar: 'مقدمة'
  },
  'Installation & Setup': {
    bn: 'ইন্সটলেশন ও সেটআপ', es: 'Instalación y Configuración', de: 'Installation & Einrichtung',
    fr: 'Installation et Configuration', ja: 'インストールと設定', pt: 'Instalação e Configuração', ar: 'التثبيت والإعداد'
  },
  'Quick Start (5-Min Launch)': {
    bn: 'কুইক স্টার্ট (৫ মিনিটে চালু)', es: 'Inicio Rápido (Lanzamiento en 5 Min)', de: 'Schnellstart (5-Minuten-Start)',
    fr: 'Démarrage Rapide (Lancement 5 Min)', ja: 'クイックスタート (5分で起動)', pt: 'Início Rápido (Lançamento em 5 Min)', ar: 'البدء السريع (إطلاق في 5 دقائق)'
  },
  '🔥 Hot Items Spotlight': {
    bn: '🔥 হট আইটেম স্পটলাইট', es: '🔥 Funciones Destacadas', de: '🔥 Top-Funktionen im Fokus',
    fr: '🔥 Fonctions Clés', ja: '🔥 注目のキラー機能', pt: '🔥 Recursos em Destaque', ar: '🔥 أبرز الميزات الساخنة'
  },

  // Core Module Sidebar Names
  '1. Dashboard Overview': {
    bn: '১. ড্যাশবোর্ড ওভারভিউ', es: '1. Resumen del Panel', de: '1. Dashboard-Übersicht',
    fr: '1. Vue d\'ensemble du tableau de bord', ja: '1. ダッシュボードの概要', pt: '1. Visão Geral do Painel', ar: '1. نظرة عامة على لوحة التحكم'
  },
  '2. Email Marketing & CRM': {
    bn: '২. ইমেইল মার্কেটিং ও সিআরএম', es: '2. Email Marketing y CRM', de: '2. E-Mail-Marketing & CRM',
    fr: '2. Email Marketing et CRM', ja: '2. メールマーケティング＆CRM', pt: '2. E-mail Marketing e CRM', ar: '2. التسويق عبر البريد الإلكتروني و CRM'
  },
  '3. SEO Analyzer': {
    bn: '৩. এসইও অ্যানালাইজার', es: '3. Analizador SEO', de: '3. SEO-Analyzer',
    fr: '3. Analyseur SEO', ja: '3. SEOアナライザー', pt: '3. Analisador de SEO', ar: '3. محلل تحسين محركات البحث'
  },
  '4. AI Content Generator': {
    bn: '৪. এআই কন্টেন্ট জেনারেটর', es: '4. Generador de Contenido IA', de: '4. KI-Content-Generator',
    fr: '4. Générateur de Contenu IA', ja: '4. AIコンテンツジェネレーター', pt: '4. Gerador de Conteúdo com IA', ar: '4. منشئ المحتوى بالذكاء الاصطناعي'
  },
  '5. Social Media': {
    bn: '৫. সোশ্যাল মিডিয়া', es: '5. Redes Sociales', de: '5. Social Media',
    fr: '5. Médias Sociaux', ja: '5. ソーシャルメディア', pt: '5. Redes Sociais', ar: '5. وسائل التواصل الاجتماعي'
  },
  '6. AI Chatbot': {
    bn: '৬. এআই চ্যাটবট', es: '6. Chatbot de IA', de: '6. KI-Chatbot',
    fr: '6. Chatbot IA', ja: '6. AIチャットボット', pt: '6. Chatbot com IA', ar: '6. روبوت الدردشة بالذكاء الاصطناعي'
  },
  '7. Workflow Automation V2': {
    bn: '৭. ওয়ার্কফ্লো অটোমেশন V2', es: '7. Automatización de Flujos V2', de: '7. Workflow-Automatisierung V2',
    fr: '7. Automatisation de Workflows V2', ja: '7. ワークフロー自動化 V2', pt: '7. Automação de Fluxos de Trabalho V2', ar: '7. أتمتة سير العمل V2'
  },
  '8. AI Providers Setup': {
    bn: '৮. এআই প্রোভাইডার সেটআপ', es: '8. Configuración de Proveedores de IA', de: '8. KI-Anbieter-Einrichtung',
    fr: '8. Configuration des Fournisseurs d\'IA', ja: '8. AIプロバイダー設定', pt: '8. Configuração de Provedores de IA', ar: '8. إعداد مزودي الذكاء الاصطناعي'
  },
  '9. General Settings': {
    bn: '৯. সাধারণ সেটিংস', es: '9. Ajustes Generales', de: '9. Allgemeine Einstellungen',
    fr: '9. Paramètres Généraux', ja: '9. 一般設定', pt: '9. Configurações Gerais', ar: '9. الإعدادات العامة'
  },

  // Submenu Links
  'Analytics': { bn: 'অ্যানালিটিক্স', es: 'Analíticas', de: 'Analysen', fr: 'Analyses', ja: 'アナリティクス', pt: 'Análise de Dados', ar: 'التحليلات' },
  'Contacts': { bn: 'কন্টাক্টস', es: 'Contactos', de: 'Kontakte', fr: 'Contacts', ja: '連絡先', pt: 'Contatos', ar: 'جهات الاتصال' },
  'Lists': { bn: 'লিস্ট', es: 'Listas', de: 'Listen', fr: 'Listes', ja: 'リスト', pt: 'Listas', ar: 'القوائم' },
  'Tags': { bn: 'ট্যাগ', es: 'Etiquetas', de: 'Tags', fr: 'Balises', ja: 'タグ', pt: 'Tags', ar: 'الوسوم' },
  'B2B Lead Finder': { bn: 'B2B লিড ফাইন্ডার', es: 'Buscador de Leads B2B', de: 'B2B Lead Finder', fr: 'Recherche de Prospects B2B', ja: 'B2Bリードファインダー', pt: 'Localizador de Leads B2B', ar: 'مستكشف عملاء B2B' },
  'Campaigns': { bn: 'ক্যাম্পেইন', es: 'Campañas', de: 'Kampagnen', fr: 'Campagnes', ja: 'キャンペーン', pt: 'Campanhas', ar: 'الحملات' },
  'Templates': { bn: 'টেমপ্লেট', es: 'Plantillas', de: 'Vorlagen', fr: 'Modèles', ja: 'テンプレート', pt: 'Modelos', ar: 'النماذج' },
  'Automations': { bn: 'অটোমেশনস', es: 'Automatizaciones', de: 'Automatisierungen', fr: 'Automatisations', ja: '自動化', pt: 'Automações', ar: 'الأتمتة' },
  'Import / Export': { bn: 'ইমপোর্ট / এক্সপোর্ট', es: 'Importar / Exportar', de: 'Import / Export', fr: 'Importer / Exporter', ja: 'インポート / エクスポート', pt: 'Importar / Exportar', ar: 'استيراد / تصدير' },
  'AI Tools': { bn: 'এআই টুলস', es: 'Herramientas de IA', de: 'KI-Tools', fr: 'Outils IA', ja: 'AIツール', pt: 'Ferramentas de IA', ar: 'أدوات الذكاء الاصطناعي' },
  'SMTP Settings': { bn: 'SMTP সেটিংস', es: 'Ajustes de SMTP', de: 'SMTP-Einstellungen', fr: 'Paramètres SMTP', ja: 'SMTP設定', pt: 'Configurações de SMTP', ar: 'إعدادات SMTP' },
  'Settings': { bn: 'সেটিংস', es: 'Ajustes', de: 'Einstellungen', fr: 'Paramètres', ja: '設定', pt: 'Configurações', ar: 'الإعدادات' },
  'Keyword Research': { bn: 'কিওয়ার্ড রিসার্চ', es: 'Investigación de Palabras Clave', de: 'Keyword-Recherche', fr: 'Recherche de Mots-clés', ja: 'キーワードリサーチ', pt: 'Pesquisa de Palavras-chave', ar: 'بحث الكلمات المفتاحية' },
  'Keyword Vault': { bn: 'কিওয়ার্ড ভল্ট', es: 'Bóveda de Palabras Clave', de: 'Keyword-Tresor', fr: 'Coffre de Mots-clés', ja: 'キーワード保管庫', pt: 'Cofre de Palavras-chave', ar: 'خزينة الكلمات المفتاحية' },
  'Topic Map': { bn: 'টপিক ম্যাপ', es: 'Mapa de Temas', de: 'Themenkarte', fr: 'Carte des Thèmes', ja: 'トピックマップ', pt: 'Mapa de Tópicos', ar: 'خريطة الموضوعات' },
  'On-Page Audit': { bn: 'অন-পেজ অডিট', es: 'Auditoría On-Page', de: 'On-Page-Audit', fr: 'Audit On-Page', ja: 'オンページ監査', pt: 'Auditoria On-Page', ar: 'تدقيق الصفحة' },
  'Content Calendar': { bn: 'কন্টেন্ট ক্যালেন্ডার', es: 'Calendario de Contenidos', de: 'Content-Kalender', fr: 'Calendrier de Contenu', ja: 'コンテンツカレンダー', pt: 'Calendário de Conteúdo', ar: 'تقويم المحتوى' },
  'Link Building': { bn: 'লিংক বিল্ডিং', es: 'Construcción de Enlaces', de: 'Linkbuilding', fr: 'Création de Liens', ja: 'リンクビルディング', pt: 'Construção de Links', ar: 'بناء الروابط' },
  'Rank Tracker': { bn: 'র‍্যাংক ট্র্যাকার', es: 'Rastreador de Posiciones', de: 'Rank-Tracker', fr: 'Suivi du Classement', ja: '順位トラッカー', pt: 'Rastreador de Posição', ar: 'متتبع الترتيب' },
  'Automation': { bn: 'অটোমেশন', es: 'Automatización', de: 'Automatisierung', fr: 'Automatisation', ja: '自動化', pt: 'Automação', ar: 'الأتمتة' },
  'Articles List': { bn: 'আর্টিকেল তালিকা', es: 'Lista de Artículos', de: 'Artikelliste', fr: 'Liste des Articles', ja: '記事一覧', pt: 'Lista de Artigos', ar: 'قائمة المقالات' },
  'New Article Studio': { bn: 'নতুন আর্টিকেল স্টুডিও', es: 'Estudio de Nuevo Artículo', de: 'Neues Artikel-Studio', fr: 'Studio de Nouvel Article', ja: '新規記事スタジオ', pt: 'Estúdio de Novo Artigo', ar: 'استوديو المقالات الجديدة' },
  'Brand Voices': { bn: 'ব্র্যান্ড ভয়েসেস', es: 'Voces de Marca', de: 'Markenstimmen', fr: 'Voix de Marque', ja: 'ブランドボイス', pt: 'Vozes da Marca', ar: 'نبرات العلامة التجارية' },
  'Presets': { bn: 'প্রিসেটস', es: 'Ajustes Preestablecidos', de: 'Voreinstellungen', fr: 'Préréglages', ja: 'プリセット', pt: 'Predefinições', ar: 'الإعدادات المسبقة' },
  'Accounts': { bn: 'অ্যাকাউন্টস', es: 'Cuentas', de: 'Konten', fr: 'Comptes', ja: 'アカウント', pt: 'Contas', ar: 'الحسابات' },
  'Posts Feed': { bn: 'পোস্ট ফিড', es: 'Feed de Publicaciones', de: 'Beitrags-Feed', fr: 'Flux de Publications', ja: '投稿フィード', pt: 'Feed de Postagens', ar: 'موجز المنشورات' },
  'Post Composer': { bn: 'পোস্ট কম্পোজার', es: 'Compositor de Posts', de: 'Post-Composer', fr: 'Compositeur de Post', ja: '投稿作成スタジオ', pt: 'Compositor de Postagens', ar: 'مؤلف المنشورات' },
  'Calendar': { bn: 'ক্যালেন্ডার', es: 'Calendario', de: 'Kalender', fr: 'Calendrier', ja: 'カレンダー', pt: 'Calendário', ar: 'التقويم' },
  'Repurpose Studio': { bn: 'রিপারপাস স্টুডিও', es: 'Estudio de Reutilización', de: 'Repurpose-Studio', fr: 'Studio de Reconditionnement', ja: 'リパーパススタジオ', pt: 'Estúdio de Reutilização', ar: 'استوديو إعادة الاستخدام' },
  'Chatbots Manager': { bn: 'চ্যাটবট ম্যানেজার', es: 'Gestor de Chatbots', de: 'Chatbot-Manager', fr: 'Gestionnaire de Chatbots', ja: 'チャットボット管理', pt: 'Gerenciador de Chatbots', ar: 'مدير روبوتات الدردشة' },
  'Conversations & Live Takeover': { bn: 'কথোপকথন ও লাইভ টেকওভার', es: 'Conversaciones y Toma en Vivo', de: 'Konversationen & Live-Übernahme', fr: 'Conversations et Reprise en Direct', ja: '会話履歴とライブ引き継ぎ', pt: 'Conversas e Intervenção ao Vivo', ar: 'المحادثات والتدخل المباشر' },
  'Knowledge Base (URL & WooCommerce)': { bn: 'নলেজ বেস (URL ও উকমার্স)', es: 'Base de Conocimientos (URL y Woo)', de: 'Wissensdatenbank (URL & Woo)', fr: 'Base de Connaissances (URL et Woo)', ja: 'ナレッジベース (URL & Woo)', pt: 'Base de Conhecimento (URL e Woo)', ar: 'قاعدة المعرفة (روابط وWoo)' },
  'Workflows List': { bn: 'ওয়ার্কফ্লো তালিকা', es: 'Lista de Flujos de Trabajo', de: 'Workflow-Liste', fr: 'Liste des Workflows', ja: 'ワークフロー一覧', pt: 'Lista de Fluxos de Trabalho', ar: 'قائمة سير العمل' },
  'Visual Canvas Builder': { bn: 'ভিজ্যুয়াল ক্যানভাস বিল্ডার', es: 'Constructor Visual de Lienzo', de: 'Visueller Canvas-Builder', fr: 'Générateur de Canevas Visuel', ja: 'ビジュアルキャンバスビルダー', pt: 'Construtor Visual em Canvas', ar: 'منشئ اللوحة المرئية' },
  'Text-to-Workflow AI': { bn: 'টেক্সট-টু-ওয়ার্কফ্লো এআই', es: 'IA de Texto a Flujo', de: 'Text-zu-Workflow KI', fr: 'IA Texte-en-Workflow', ja: 'テキストからワークフローAI', pt: 'IA de Texto para Fluxo', ar: 'تحويل النص إلى سير عمل بالذكاء الاصطناعي' },
  'WooCommerce Cart Recovery': { bn: 'উকমার্স কার্ট রিকভারি', es: 'Recuperación de Carritos WooCommerce', de: 'WooCommerce Warenkorb-Rettung', fr: 'Récupération de Panier WooCommerce', ja: 'WooCommerce カートリカバリー', pt: 'Recuperação de Carrinho WooCommerce', ar: 'استعادة سلات WooCommerce المتروكة' },
  'Template Picker': { bn: 'টেমপ্লেট পিকার', es: 'Selector de Plantillas', de: 'Vorlagenauswahl', fr: 'Sélecteur de Modèles', ja: 'テンプレートセレクター', pt: 'Seletor de Modelos', ar: 'منتقي القوالب' },
  'Upcoming Runs': { bn: 'আসন্ন রানসমূহ', es: 'Próximas Ejecuciones', de: 'Bevorstehende Ausführungen', fr: 'Prochaines Exécutions', ja: '次回の実行予定', pt: 'Próximas Execuções', ar: 'التشغيلات القادمة' },
  'Error Log': { bn: 'এরর লগ', es: 'Registro de Errores', de: 'Fehlerprotokoll', fr: 'Journal des Erreurs', ja: 'エラーログ', pt: 'Registro de Erros', ar: 'سجل الأخطاء' },

  // System Section Links
  'External Server Cron Setup': { bn: 'এক্সটার্নাল সার্ভার ক্রন সেটআপ', es: 'Configuración de Cron del Servidor Externo', de: 'Externer Server-Cron-Setup', fr: 'Configuration Cron Serveur Externe', ja: '外部サーバーCron設定', pt: 'Configuração do Cron do Servidor Externo', ar: 'إعداد مهام Cron على خادم خارجي' },
  'Troubleshooting & Pitfalls': { bn: 'সমস্যা সমাধান ও সতর্কতা', es: 'Solución de Problemas y Errores Comunes', de: 'Fehlerbehebung & Fallstricke', fr: 'Dépannage et Pièges Fréquents', ja: 'トラブルシューティングと落とし穴', pt: 'Solução de Problemas e Dicas', ar: 'استكشاف الأخطاء والأخطاء الشائعة' },
  'Frequently Asked Questions (FAQ)': { bn: 'সচরাচর জিজ্ঞাসিত প্রশ্ন (FAQ)', es: 'Preguntas Frecuentes (FAQ)', de: 'Häufig gestellte Fragen (FAQ)', fr: 'Foire Aux Questions (FAQ)', ja: 'よくある質問 (FAQ)', pt: 'Perguntas Frequentes (FAQ)', ar: 'الأسئلة الشائعة (FAQ)' },
  '1-2 Min Micro-Videos 🎬': { bn: '১-২ মিনিটের মাইক্রো-ভিডিও 🎬', es: 'Microvídeos de 1-2 minutos 🎬', de: '1-2 Minuten Mikro-Videos 🎬', fr: 'Micro-Vidéos de 1-2 Min 🎬', ja: '1〜2分マイクロビデオ 🎬', pt: 'Microvídeos de 1-2 Minutos 🎬', ar: 'فيديوهات تعليمية سريعة 1-2 دقيقة 🎬' },
  'Changelog (v1.2.7)': { bn: 'চেঞ্জলগ (v1.2.7)', es: 'Registro de Cambios (v1.2.7)', de: 'Änderungsprotokoll (v1.2.7)', fr: 'Journal des Modifications (v1.2.7)', ja: '更新履歴 (v1.2.7)', pt: 'Histórico de Mudanças (v1.2.7)', ar: 'سجل التغييرات (v1.2.7)' },

  // Hero CTA Banner
  'Scale Your Business with Autonomous AI Marketing': {
    bn: 'স্বয়ংক্রিয় এআই মার্কেটিং দিয়ে আপনার ব্যবসা স্কেল করুন',
    es: 'Escale su Negocio con Marketing Autónomo de IA',
    de: 'Skalieren Sie Ihr Unternehmen mit autonomem KI-Marketing',
    fr: 'Développez Votre Entreprise grâce au Marketing IA Autonome',
    ja: '自律型AIマーケティングでビジネスを加速させる',
    pt: 'Escale seu Negócio com Marketing Autônomo por IA',
    ar: 'نمِّ أعمالك مع التسويق الذاتي بالذكاء الاصطناعي'
  },
  'Install Free Version Now': { bn: 'ফ্রি ভার্সন ইন্সটল করুন', es: 'Instalar Versión Gratuita Ahora', de: 'Kostenlose Version Jetzt Installieren', fr: 'Installer la Version Gratuite Maintenant', ja: '無料版を今すぐインストール', pt: 'Instalar Versão Gratuita Agora', ar: 'تثبيت النسخة المجانية الآن' },
  'Install Free Version': { bn: 'ফ্রি ভার্সন ইন্সটল করুন', es: 'Instalar Versión Gratuita', de: 'Kostenlose Version Installieren', fr: 'Installer la Version Gratuite', ja: '無料版をインストール', pt: 'Instalar Versão Gratuita', ar: 'تثبيت النسخة المجانية' },
  'Get Pro Unlimited License': { bn: 'প্রো আনলিমিটেড লাইসেন্স নিন', es: 'Obtener Licencia Pro Unlimited', de: 'Pro Unlimited Lizenz Holen', fr: 'Obtenir la Licence Pro Unlimited', ja: 'Pro Unlimited ライセンスを取得', pt: 'Obter Licença Pro Unlimited', ar: 'احصل على ترخيص Pro غير المحدود' },
  'Watch 2-Min Demo': { bn: '২ মিনিটের ডেমো দেখুন', es: 'Ver Demostración de 2 Minutos', de: '2-Minuten-Demo Ansehen', fr: 'Voir la Démo de 2 Min', ja: '2分間のデモ動画を見る', pt: 'Assistir ao Vídeo de 2 Minutos', ar: 'مشاهدة فيديو تجريبي في دقيقتين' },
  'Unlimited Contacts & Lists': { bn: 'আনলিমিটেড কন্টাক্ট ও লিস্ট', es: 'Contactos y Listas Ilimitadas', de: 'Unbegrenzte Kontakte & Listen', fr: 'Contacts et Listes Illimités', ja: '無制限の連絡先とリスト', pt: 'Contatos e Listas Ilimitadas', ar: 'جهات اتصال وقوائم غير محدودة' },
  'Multi-SMTP Free Relay Stacking': { bn: 'মাল্টি-SMTP ফ্রি রিলে স্ট্যাকিং', es: 'Apilamiento de Relés Libres Multi-SMTP', de: 'Multi-SMTP Kostenloses Relay-Stacking', fr: 'Empilement de Relais Multi-SMTP Gratuit', ja: 'マルチSMTP無料リレースタッキング', pt: 'Empilhamento de Relés Multi-SMTP Grátis', ar: 'دمج خوادم ترحيل Multi-SMTP المجانية' },
  'Free Google Gemini & OpenAI Keys': { bn: 'ফ্রি গুগল জেমিনি ও ওপেনএআই কী', es: 'Claves Gratuitas de Google Gemini y OpenAI', de: 'Kostenlose Google Gemini & OpenAI Keys', fr: 'Clés Gratuites Google Gemini et OpenAI', ja: '無料の Google Gemini & OpenAI キー対応', pt: 'Chaves Gratuitas do Google Gemini e OpenAI', ar: 'مفاتيح Google Gemini و OpenAI المجانية' },
  '100% Data Privacy (GDPR Ready)': { bn: '১০০% ডেটা প্রাইভেসি (GDPR রেডি)', es: '100% de Privacidad de Datos (Listo para RGPD)', de: '100% Datenschutz (DSGVO-konform)', fr: '100% Confidentialité des Données (RGPD)', ja: '100% データプライバシー (GDPR対応)', pt: '100% de Privacidade de Dados (Pronto para GDPR)', ar: 'خصوصية بيانات 100% (متوافق مع GDPR)' },

  // Mobile Bottom Bar Labels
  'Menu': { bn: 'মেনু', es: 'Menú', de: 'Menü', fr: 'Menu', ja: 'メニュー', pt: 'Menu', ar: 'القائمة' },
  'Search': { bn: 'খুঁজুন', es: 'Buscar', de: 'Suche', fr: 'Recherche', ja: '検索', pt: 'Buscar', ar: 'بحث' },
  'Spotlight': { bn: 'স্পটলাইট', es: 'Destacados', de: 'Highlights', fr: 'Vedettes', ja: '注目', pt: 'Destaques', ar: 'المميزات' },
  'FAQ': { bn: 'জিজ্ঞাসা', es: 'FAQ', de: 'FAQ', fr: 'FAQ', ja: 'FAQ', pt: 'FAQ', ar: 'الأسئلة' },
  'Top': { bn: 'উপরে', es: 'Arriba', de: 'Nach oben', fr: 'Haut', ja: 'トップへ', pt: 'Topo', ar: 'للأعلى' }
};

// ── Paths ──
const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_HTML = path.join(ROOT_DIR, 'docs', 'index.html');
const CACHE_FILE = path.join(__dirname, 'translation-cache.json');

// ── Load / Save Cache ──
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
  try {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  } catch (e) {
    cache = {};
  }
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8');
  } catch (err) {
    console.warn(`[Warning] Could not save cache: ${err.message}`);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

// Helper to look up an existing translation
function getExistingTranslation(text, targetLang) {
  const clean = text.trim();
  if (!clean || clean.length < 2) return clean;

  if (UI_DICTIONARY[clean] && UI_DICTIONARY[clean][targetLang]) {
    return UI_DICTIONARY[clean][targetLang];
  }

  const cacheKey = `${targetLang}:${clean}`;
  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  return null;
}

// ── Batch Translation Engine ──
async function translateBatch(items, targetLang, useAi = false) {
  if (items.length === 0) return {};

  const results = {};
  const needed = [];

  for (const item of items) {
    const existing = getExistingTranslation(item, targetLang);
    if (existing) {
      results[item] = existing;
    } else {
      needed.push(item);
    }
  }

  if (needed.length === 0) return results;

  // AI Translation Mode
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;
  if (useAi && apiKey) {
    try {
      const aiResults = await translateBatchWithAi(needed, targetLang, apiKey);
      for (const [orig, trans] of Object.entries(aiResults)) {
        results[orig] = trans;
        cache[`${targetLang}:${orig}`] = trans;
      }
      return results;
    } catch (e) {
      // Fall through to web translation
    }
  }

  // Web Translation Mode (MyMemory in chunks of 5 lines)
  const chunkSize = 5;
  for (let i = 0; i < needed.length; i += chunkSize) {
    const chunk = needed.slice(i, i + chunkSize);
    const joined = chunk.map(s => s.replace(/\r?\n+/g, ' ').trim()).join('\n');

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(joined)}&langpair=en|${targetLang}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'AIME-Doc-Full-Translator/2.0' } });
      if (res.ok) {
        const data = await res.json();
        const rawTrans = data.responseData?.translatedText || '';
        const lines = rawTrans.split('\n').map(l => cleanHtmlEntities(l.trim())).filter(Boolean);

        if (lines.length === chunk.length) {
          for (let j = 0; j < chunk.length; j++) {
            const original = chunk[j];
            const trans = lines[j];
            results[original] = trans;
            cache[`${targetLang}:${original}`] = trans;
          }
        } else {
          // If line counts mismatch, translate one by one in chunk
          for (const item of chunk) {
            const single = await translateSingle(item, targetLang);
            results[item] = single;
            cache[`${targetLang}:${item}`] = single;
            await sleep(60);
          }
        }
      } else {
        for (const item of chunk) {
          results[item] = item;
        }
      }
    } catch (err) {
      for (const item of chunk) {
        results[item] = item;
      }
    }

    await sleep(75);
  }

  return results;
}

async function translateSingle(text, targetLang) {
  const clean = text.trim();
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=en|${targetLang}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AIME-Doc-Full-Translator/2.0' } });
    if (res.ok) {
      const data = await res.json();
      const t = data.responseData?.translatedText;
      if (t && !t.includes('MYMEMORY WARNING')) {
        return cleanHtmlEntities(t);
      }
    }
  } catch (err) {}
  return clean;
}

async function translateBatchWithAi(items, targetLang, apiKey) {
  const targetName = TARGET_LANGUAGES[targetLang]?.name || targetLang;
  const prompt = `Translate each line of the following SaaS documentation into natural, fluent ${targetName}.
Preserve brand names (AIME, AI Marketing Expert, WooCommerce, WordPress, Gemini, Claude, OpenAI, SendGrid, Brevo, OpenRouter), version strings, and code terms.
Return exactly one translated line per input line, separated by newlines, with NO explanations:

${items.join('\n')}`;

  if (process.env.GEMINI_API_KEY) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    });
    if (res.ok) {
      const json = await res.json();
      const output = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
      const resMap = {};
      if (lines.length === items.length) {
        items.forEach((item, idx) => { resMap[item] = lines[idx]; });
        return resMap;
      }
    }
  }

  return {};
}

// ── HTML Document Processor ──
async function processHtmlDocument(sourceHtml, targetLang, useAi = false, isFast = false) {
  const langConfig = TARGET_LANGUAGES[targetLang];
  console.log(`\nTranslating entire documentation to [${targetLang.toUpperCase()} - ${langConfig.name}]...`);

  let html = sourceHtml;

  // 1. Mask protected blocks that should NEVER be translated
  const protectedBlocks = [];
  const protect = (pattern) => {
    html = html.replace(pattern, (match) => {
      const id = `___AIME_PROTECT_${protectedBlocks.length}___`;
      protectedBlocks.push(match);
      return id;
    });
  };

  protect(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
  protect(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi);
  protect(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi);
  protect(/<pre\b[^<]*(?:(?!<\/pre>)<[^<]*)*<\/pre>/gi);
  protect(/<div class="lang-dropdown" id="langDropdown"[\s\S]*?<\/div>/gi);

  // 2. Extract all unique text nodes between > and <
  const textNodeRegex = />([^<]+)</g;
  let match;
  const textNodesToTranslate = new Set();

  while ((match = textNodeRegex.exec(html)) !== null) {
    const raw = match[1];
    const clean = raw.trim();

    // Skip if empty, protected token, or pure punctuation/symbols/numbers
    if (
      !clean ||
      clean.length < 2 ||
      clean.startsWith('___AIME_PROTECT_') ||
      /^[\d\s.,:;!?()[\]{}#\-_+=\/\\|*&^%$@~`"']+$/.test(clean) ||
      /^(v\d+\.\d+\.\d+|Ctrl\s*K|\/|http|https|git|curl|php)/i.test(clean)
    ) {
      continue;
    }

    textNodesToTranslate.add(clean);
  }

  const allItems = Array.from(textNodesToTranslate);
  console.log(`Found ${allItems.length} unique text fragments in document.`);

  // 3. Batch translate any items not already cached or in dictionary
  const uncachedItems = allItems.filter(item => !getExistingTranslation(item, targetLang));
  console.log(`- Cached / Dictionary items: ${allItems.length - uncachedItems.length}`);
  console.log(`- Items requiring translation: ${uncachedItems.length}`);

  let translationMap = {};

  // Preload all cached/dictionary items
  for (const item of allItems) {
    const existing = getExistingTranslation(item, targetLang);
    if (existing) {
      translationMap[item] = existing;
    }
  }

  // Translate uncached items if not in fast mode
  if (uncachedItems.length > 0 && !isFast) {
    process.stdout.write(`Translating ${uncachedItems.length} text fragments`);
    const batchSize = 6;
    for (let i = 0; i < uncachedItems.length; i += batchSize) {
      const chunk = uncachedItems.slice(i, i + batchSize);
      const batchResult = await translateBatch(chunk, targetLang, useAi);
      Object.assign(translationMap, batchResult);
      process.stdout.write('.');
    }
    console.log(' Done!');
  } else if (isFast && uncachedItems.length > 0) {
    console.log(`Fast mode: skipping ${uncachedItems.length} network requests.`);
  }

  // 4. Safe Text-Node Replacement in HTML
  html = html.replace(/>([^<]+)</g, (fullMatch, textContent) => {
    const leadingSpace = textContent.match(/^\s*/)[0];
    const trailingSpace = textContent.match(/\s*$/)[0];
    const clean = textContent.trim();

    if (!clean || clean.startsWith('___AIME_PROTECT_')) {
      return fullMatch;
    }

    const translated = translationMap[clean] || getExistingTranslation(clean, targetLang);
    if (translated && translated !== clean) {
      return `>${leadingSpace}${translated}${trailingSpace}<`;
    }

    return fullMatch;
  });

  // 5. Restore Protected Blocks
  for (let i = 0; i < protectedBlocks.length; i++) {
    html = html.replace(`___AIME_PROTECT_${i}___`, () => protectedBlocks[i]);
  }

  // 6. Translate Attributes (Placeholder, Meta Title, Description)
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    const origTitle = titleMatch[1];
    const tTitle = translationMap[origTitle] || getExistingTranslation(origTitle, targetLang) || origTitle;
    html = html.replace(titleMatch[0], `<title>${tTitle}</title>`);
  }

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  if (descMatch) {
    const origDesc = descMatch[1];
    const tDesc = translationMap[origDesc] || getExistingTranslation(origDesc, targetLang) || origDesc;
    html = html.replace(descMatch[0], `<meta name="description" content="${tDesc}"`);
  }

  // 7. Update <html lang="..." dir="...">
  html = html.replace(/<html\s+lang="[^"]*"/i, `<html lang="${targetLang}" dir="${langConfig.dir}"`);

  // 8. Adjust relative asset links
  html = html.replace(/href="style\.css"/g, 'href="../style.css"');
  html = html.replace(/src="screenshots\//g, 'src="../screenshots/');

  // 9. Update Language Dropdown in the generated page
  const langDropdownRegex = /<div class="lang-dropdown" id="langDropdown" role="menu">([\s\S]*?)<\/div>/i;
  const dropdownMatch = html.match(langDropdownRegex);
  if (dropdownMatch) {
    let newDropdownHtml = '<div class="lang-dropdown" id="langDropdown" role="menu">\n';
    
    // Master English Link
    const enActive = targetLang === 'en' ? ' active' : '';
    newDropdownHtml += `          <a href="../index.html" class="lang-opt${enActive}" data-lang="en" role="menuitem">🇬🇧 English <span class="lang-badge">Master</span></a>\n`;

    // Other language options
    for (const [code, info] of Object.entries(TARGET_LANGUAGES)) {
      const isActive = code === targetLang ? ' active' : '';
      const href = code === targetLang ? '#' : `../${code}/index.html`;
      newDropdownHtml += `          <a href="${href}" class="lang-opt${isActive}" data-lang="${code}" role="menuitem">${info.flag} ${info.name} (${info.englishName})</a>\n`;
    }
    newDropdownHtml += '        </div>';

    html = html.replace(dropdownMatch[0], newDropdownHtml);
  }

  // Update current language label
  html = html.replace(/<span id="currentLangLabel">[^<]+<\/span>/i, `<span id="currentLangLabel">${langConfig.name}</span>`);

  return html;
}

// ── Main Execution Flow ──
async function main() {
  console.log('====================================================');
  console.log('  AI Marketing Expert — Full-Doc i18n Translation   ');
  console.log('====================================================');

  if (!fs.existsSync(SOURCE_HTML)) {
    console.error(`Error: Master source document not found at: ${SOURCE_HTML}`);
    process.exit(1);
  }

  const args = process.argv.slice(2);

  if (args.includes('--clean')) {
    if (fs.existsSync(CACHE_FILE)) {
      fs.unlinkSync(CACHE_FILE);
      console.log('✓ Cleared translation cache.');
      cache = {};
    }
  }

  const useAi = args.includes('--ai');
  const isFast = args.includes('--fast');
  const sourceHtml = fs.readFileSync(SOURCE_HTML, 'utf8');

  let selectedLangs = ['bn', 'es']; // Prioritize Bengali & Spanish by default
  const langArg = args.find(a => a.startsWith('--lang='));
  if (langArg) {
    const code = langArg.split('=')[1].toLowerCase().trim();
    if (code === 'all') {
      selectedLangs = Object.keys(TARGET_LANGUAGES);
    } else if (TARGET_LANGUAGES[code]) {
      selectedLangs = [code];
    } else {
      console.error(`Unknown language: "${code}". Supported: all, ${Object.keys(TARGET_LANGUAGES).join(', ')}`);
      process.exit(1);
    }
  }

  console.log(`Building full translations for: ${selectedLangs.map(l => `${l} (${TARGET_LANGUAGES[l].name})`).join(', ')}`);

  for (const lang of selectedLangs) {
    const outDir = path.join(ROOT_DIR, 'docs', lang);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const outFile = path.join(outDir, 'index.html');
    const translatedHtml = await processHtmlDocument(sourceHtml, lang, useAi, isFast);
    fs.writeFileSync(outFile, translatedHtml, 'utf8');
    const sizeKb = (fs.statSync(outFile).size / 1024).toFixed(1);
    console.log(`✓ Saved: docs/${lang}/index.html (${sizeKb} KB)`);
  }

  saveCache();
  console.log('\n====================================================');
  console.log('  Full i18n Build Complete!                         ');
  console.log('====================================================');
}

main().catch(err => {
  console.error('\nBuild failed:', err);
  process.exit(1);
});
