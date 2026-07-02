#!/usr/bin/env node
/**
 * Generate all 18 missing i18n UI translation files.
 * This script contains hardcoded translations for all supported locales.
 */
const fs = require('fs');
const path = require('path');

const MESSAGES_DIR = path.join(__dirname, '..', 'src', 'messages');

// Read fr.json as base structure
const frData = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'fr.json'), 'utf-8'));

// Translation data for each locale (only values differ from French)
const translations = {
  es: {
    meta: {
      title: "Lingullio",
      description: "Prepara tus exámenes de idiomas asiáticos con un recorrido personalizado, entrenamientos inteligentes y un seguimiento preciso de tu progreso."
    },
    common: {
      loading: "Cargando...", save: "Guardar", cancel: "Cancelar", next: "Siguiente", previous: "Anterior",
      confirm: "Confirmar", delete: "Eliminar", edit: "Editar", create: "Crear", search: "Buscar",
      filter: "Filtrar", export: "Exportar", import: "Importar", close: "Cerrar", back: "Volver",
      submit: "Enviar", reset: "Restablecer", yes: "Sí", no: "No", or: "o", and: "y", of: "de",
      minutes: "min", hours: "h", days: "días", points: "pts"
    },
    auth: {
      login: "Iniciar sesión", logout: "Cerrar sesión", email: "Correo electrónico", password: "Contraseña",
      emailPlaceholder: "tu@email.com", passwordPlaceholder: "Tu contraseña", forgotPassword: "¿Olvidaste la contraseña?",
      loginButton: "Iniciar sesión", loginSubtitle: "Inicia sesión para acceder a tu recorrido.",
      activateTitle: "Activa tu acceso", activateSubtitle: "Introduce el código que recibiste por correo tras tu compra.",
      activationCode: "Código de activación", codePlaceholder: "Tu código de 8 caracteres", activateButton: "Activar mi acceso",
      setPasswordTitle: "Define tu contraseña", setPasswordSubtitle: "Elige una contraseña segura para proteger tu cuenta.",
      newPassword: "Nueva contraseña", confirmPassword: "Confirmar contraseña", setPasswordButton: "Definir contraseña",
      passwordRequirements: "Mínimo 8 caracteres, 1 mayúscula, 1 número.",
      forgotTitle: "Contraseña olvidada", forgotSubtitle: "Introduce tu correo. Recibirás un enlace de restablecimiento.",
      sendResetLink: "Enviar enlace", resetTitle: "Restablecer contraseña", resetSubtitle: "Elige una nueva contraseña.",
      resetButton: "Restablecer", resetSuccess: "Contraseña restablecida. Ya puedes iniciar sesión.",
      invalidCredentials: "Correo o contraseña incorrectos.", invalidCode: "Código inválido o expirado.",
      accountExpired: "Tu acceso ha expirado.", accountRevoked: "Tu acceso ha sido desactivado. Contacta soporte.",
      emailSent: "Se te ha enviado un correo.", passwordMismatch: "Las contraseñas no coinciden.",
      emailAlreadyExists: "Ya existe una cuenta con este correo. Inicia sesión directamente."
    },
    nav: {
      home: "Inicio", courses: "Cursos", revisions: "Repaso", mockExams: "Exámenes de prueba",
      progress: "Progreso", objectives: "Objetivos", resources: "Recursos", settings: "Ajustes",
      help: "Ayuda", profile: "Perfil"
    },
    dashboard: {
      welcome: "Bienvenido/a {name}", estimatedScore: "Puntuación estimada", confidence: "Confianza: {level}",
      confidenceLow: "Baja", confidenceMedium: "Media", confidenceHigh: "Alta",
      todayPlan: "Plan para hoy", startSession: "Comenzar", overallProgress: "Progreso general",
      bySkill: "Por competencias", vocabulary: "Vocabulario", grammar: "Gramática", reading: "Lectura",
      listening: "Comprensión auditiva", writing: "Escritura", speaking: "Expresión oral",
      recommendations: "Recomendaciones para ti", streak: "Racha actual", streakDays: "{count} días",
      targetExam: "Examen el {date}", targetScore: "Puntuación objetivo: {score}", vsLastWeek: "vs semana pasada",
      nextActions: "Próximas acciones", estimatedImpact: "Impacto estimado: +{points} pts",
      preparationStatus: "Estado de preparación", statusNotStarted: "No iniciado", statusInProgress: "En progreso",
      statusOnTrack: "En buen camino", statusNearTarget: "Cerca del objetivo", statusReady: "Listo",
      statusAtRisk: "Atención requerida", timeStudied: "Tiempo estudiado", timeRemaining: "Tiempo restante estimado"
    },
    onboarding: {
      step: "Paso {current} de {total}", chooseLanguage: "Elige tu idioma de interfaz",
      chooseLevel: "¿Qué nivel HSK estás preparando?", chooseObjective: "¿Cuál es tu objetivo?",
      objectiveExam: "Aprobar el examen", objectiveStudies: "Estudios en China", objectiveWork: "Carrera profesional",
      objectiveImmigration: "Inmigración", objectivePersonal: "Reto personal",
      examDate: "¿Tienes una fecha de examen?", examDateYes: "Sí, tengo una fecha", examDateNo: "Todavía no",
      targetScore: "¿Qué puntuación buscas?", availability: "¿Cuántas horas semanales puedes dedicar?",
      selfAssessment: "Evalúa tu nivel actual", selfAssessmentDesc: "5 preguntas rápidas para estimar tu punto de partida.",
      diagnostic: "Diagnóstico inicial recomendado",
      diagnosticDesc: "Un test completo de 20 minutos para medir tus fortalezas y debilidades.",
      startDiagnostic: "Hacer el diagnóstico", skipDiagnostic: "Empezar directamente el curso",
      planGenerated: "Tu plan personalizado está listo",
      planGeneratedDesc: "Basado en tus respuestas, aquí está tu recorrido recomendado.",
      startLearning: "Empezar a aprender"
    },
    exercises: {
      correct: "Correcto", incorrect: "Incorrecto", partiallyCorrect: "Parcialmente correcto",
      explanation: "Explicación", errorExplanation: "Por qué esta respuesta es incorrecta",
      tryAgain: "Reintentar", showHint: "Ver pista", nextExercise: "Siguiente ejercicio",
      askAI: "Explicar de otra forma", commonErrors: "Errores frecuentes",
      yourAnswer: "Tu respuesta", correctAnswer: "Respuesta correcta", score: "Puntuación",
      timeSpent: "Tiempo", difficulty: "Dificultad"
    },
    mockExam: {
      title: "Examen de prueba", start: "Comenzar el examen", timeRemaining: "Tiempo restante",
      section: "Sección {number}", listening: "Comprensión auditiva", reading: "Comprensión lectora",
      writing: "Expresión escrita", submit: "Enviar", autoSaved: "Guardado automático",
      results: "Resultados", analysis: "Análisis detallado", comparison: "Comparación con tus exámenes anteriores",
      recommendation: "Recomendaciones"
    },
    settings: {
      title: "Ajustes", account: "Mi cuenta", language: "Idioma de interfaz",
      license: "Licencia y acceso", licenseActive: "Activa", licenseExpired: "Expirada",
      licenseExpires: "Expira el {date}", notifications: "Notificaciones", privacy: "Privacidad",
      exportData: "Exportar mis datos", deleteAccount: "Eliminar mi cuenta"
    },
    admin: {
      dashboard: "Panel de control", learners: "Estudiantes", licenses: "Licencias", content: "Contenido",
      analytics: "Analítica", settings: "Ajustes", logs: "Registro de acciones", import: "Importar",
      activeLearners: "Estudiantes activos", activationRate: "Tasa de activación",
      completionRate: "Tasa de finalización", avgScore: "Puntuación media", atRisk: "En riesgo de abandono",
      courses: "Cursos", modules: "Módulos", lessons: "Lecciones", vocabulary: "Vocabulario",
      grammar: "Gramática", characters: "Caracteres", exercises: "Ejercicios",
      published: "Publicado", draft: "Borrador", validated: "Validado", archived: "Archivado",
      allStatuses: "Todos los estados", allLevels: "Todos los niveles", search: "Buscar...",
      actions: "Acciones", edit: "Editar", delete: "Eliminar", create: "Crear", save: "Guardar",
      cancel: "Cancelar", confirm: "Confirmar", status: "Estado", level: "Nivel", type: "Tipo",
      title: "Título", slug: "Identificador", version: "Versión", moduleCount: "Módulos",
      licenseCount: "Licencias", lessonCount: "Lecciones", exerciseCount: "Ejercicios",
      sortOrder: "Orden", duration: "Duración", difficulty: "Dificultad", createdAt: "Creado el",
      updatedAt: "Modificado el", noData: "Sin datos", loading: "Cargando...",
      simplified: "Simplificado", traditional: "Tradicional", pinyin: "Pinyin", meaning: "Significado",
      radical: "Radical", strokeCount: "Trazos", wordType: "Tipo de palabra", theme: "Tema",
      frequencyRank: "Frecuencia", pattern: "Estructura", character: "Carácter", mnemonic: "Mnemotécnica",
      email: "Email", displayName: "Nombre visible", role: "Rol", activationCode: "Código de activación",
      courseSlug: "Curso", activatedAt: "Activado el", expiresAt: "Expira el",
      pending: "Pendiente", active: "Activo", expired: "Expirado", revoked: "Revocado", refunded: "Reembolsado",
      revoke: "Revocar", extend: "Prolongar", contentOverview: "Vista general del contenido",
      totalCourses: "Total cursos", publishedCourses: "Cursos publicados", totalVocabulary: "Palabras de vocabulario",
      totalExercises: "Total ejercicios", manageContent: "Gestionar contenido pedagógico",
      manageLearners: "Gestionar estudiantes", manageLicenses: "Gestionar licencias",
      lastLogin: "Último acceso", isActive: "Activo", profiles: "Perfiles", exam: "Examen",
      targetLevel: "Nivel objetivo", preparationStatus: "Estado de preparación"
    },
    courses: {
      title: "Cursos HSK", subtitle: "Elige tu nivel y empieza tu preparación",
      modules: "{count} módulos", vocabulary: "{count} palabras", grammar: "{count} puntos de gramática",
      characters: "{count} caracteres", startCourse: "Comenzar", continueCourse: "Continuar",
      viewCourse: "Ver curso", comingSoon: "Próximamente", available: "Disponible",
      level: "Nivel {level}", allThemes: "Todos los temas", allTypes: "Todos los tipos",
      searchPlaceholder: "Buscar una palabra, pinyin...", noResults: "Sin resultados",
      wordsCount: "{count} palabras de {total}", page: "Página {current} de {total}",
      overview: "Vista general", vocabularyTab: "Vocabulario", grammarTab: "Gramática",
      charactersTab: "Caracteres", modulesTab: "Módulos", moduleTitle: "Módulo {number}",
      lessons: "{count} lecciones", estimatedTime: "{minutes} min", example: "Ejemplo",
      meaning: "Significado", pinyin: "Pinyin", radical: "Radical", strokes: "{count} trazos",
      frequency: "Frecuencia #{rank}", wordType: "Tipo", theme: "Tema",
      expandCard: "Ver detalles", collapseCard: "Ocultar detalles", prevPage: "Página anterior",
      nextPage: "Página siguiente", contentStats: "Contenido disponible",
      wordsShowing: "palabras mostradas", filtered: "filtrado", total: "total",
      noContent: "Contenido aún no disponible.",
      searchGrammarPlaceholder: "Buscar un punto de gramática...",
      grammarPointsShowing: "puntos de gramática", traditional: "Tradicional",
      themeLabel: "Tema", wordTypeLabel: "Tipo",
      noVocabulary: "El vocabulario de este nivel aún no está disponible.",
      noGrammar: "Los puntos de gramática de este nivel aún no están disponibles.",
      noCharacters: "Los caracteres de este nivel aún no están disponibles.",
      noModules: "Los módulos de este nivel aún no están disponibles.",
      characterBreakdown: "Descomposición en caracteres",
      searchCharPlaceholder: "Buscar un carácter, pinyin...",
      charactersShowing: "caracteres",
      mnemonicLabel: "Truco de memorización",
      audioUnavailable: "Audio no disponible en este dispositivo",
      wordTypes: {
        noun: "Sustantivo", verb: "Verbo", adjective: "Adjetivo", adverb: "Adverbio",
        pronoun: "Pronombre", preposition: "Preposición", conjunction: "Conjunción",
        interjection: "Interjección", particle: "Partícula", measure_word: "Clasificador",
        numeral: "Numeral", expression: "Expresión", auxiliary_verb: "Verbo auxiliar",
        onomatopoeia: "Onomatopeya", determiner: "Determinante", prefix: "Prefijo",
        suffix: "Sufijo", proper_noun: "Nombre propio"
      },
      themes: {
        greetings_basics: "Saludos y bases", numbers_time: "Números y tiempo",
        family_people: "Familia y personas", food_drinks: "Comida y bebidas",
        daily_life: "Vida cotidiana", school_education: "Escuela y educación",
        transportation: "Transporte", weather_nature: "Clima y naturaleza",
        body_health: "Cuerpo y salud", shopping_money: "Compras y dinero",
        home_housing: "Casa y vivienda", work_career: "Trabajo y carrera",
        hobbies_leisure: "Ocio y entretenimiento", colors_descriptions: "Colores y descripciones",
        emotions_states: "Emociones y estados", communication: "Comunicación",
        location_direction: "Lugar y dirección", actions_movements: "Acciones y movimientos",
        grammar_function: "Gramática y función", quantity_comparison: "Cantidad y comparación",
        basic_adjectives: "Adjetivos básicos", basic_verbs: "Verbos básicos",
        clothing: "Ropa", directions: "Direcciones", family: "Familia", feelings: "Sentimientos",
        food_drink: "Comida y bebidas", greetings: "Saludos", hobbies: "Aficiones",
        numbers: "Números", places: "Lugares", pronouns_particles: "Pronombres y partículas",
        school_work: "Escuela y trabajo", shopping: "Compras", time_dates: "Tiempo y fechas",
        transport: "Transporte"
      }
    },
    errors: {
      generic: "Ha ocurrido un error. Por favor, inténtalo de nuevo.",
      network: "Error de conexión. Verifica tu conexión a internet.",
      notFound: "Página no encontrada.",
      unauthorized: "Acceso no autorizado.",
      sessionExpired: "Tu sesión ha expirado. Por favor, vuelve a iniciar sesión."
    }
  },
  tr: {
    meta: { title: "Lingullio", description: "Kişiselleştirilmiş bir yol, akıllı alıştırmalar ve ilerlemenizin hassas takibi ile Asya dili sınavlarınıza hazırlanın." },
    common: { loading: "Yükleniyor...", save: "Kaydet", cancel: "İptal", next: "İleri", previous: "Geri", confirm: "Onayla", delete: "Sil", edit: "Düzenle", create: "Oluştur", search: "Ara", filter: "Filtrele", export: "Dışa aktar", import: "İçe aktar", close: "Kapat", back: "Geri", submit: "Gönder", reset: "Sıfırla", yes: "Evet", no: "Hayır", or: "veya", and: "ve", of: "üzerinden", minutes: "dk", hours: "sa", days: "gün", points: "puan" },
    auth: { login: "Giriş yap", logout: "Çıkış yap", email: "E-posta adresi", password: "Şifre", emailPlaceholder: "email@adresiniz.com", passwordPlaceholder: "Şifreniz", forgotPassword: "Şifremi unuttum?", loginButton: "Giriş yap", loginSubtitle: "Öğrenim yolunuza erişmek için giriş yapın.", activateTitle: "Erişiminizi aktifleştirin", activateSubtitle: "Satın alma sonrası e-posta ile aldığınız kodu girin.", activationCode: "Aktivasyon kodu", codePlaceholder: "8 karakterlik kodunuz", activateButton: "Erişimimi aktifleştir", setPasswordTitle: "Şifrenizi belirleyin", setPasswordSubtitle: "Hesabınızı korumak için güvenli bir şifre seçin.", newPassword: "Yeni şifre", confirmPassword: "Şifreyi onayla", setPasswordButton: "Şifreyi belirle", passwordRequirements: "En az 8 karakter, 1 büyük harf, 1 rakam.", forgotTitle: "Şifremi unuttum", forgotSubtitle: "E-postanızı girin. Sıfırlama bağlantısı alacaksınız.", sendResetLink: "Bağlantı gönder", resetTitle: "Şifreyi sıfırla", resetSubtitle: "Yeni bir şifre seçin.", resetButton: "Sıfırla", resetSuccess: "Şifre sıfırlandı. Artık giriş yapabilirsiniz.", invalidCredentials: "Geçersiz e-posta veya şifre.", invalidCode: "Geçersiz veya süresi dolmuş kod.", accountExpired: "Erişiminizin süresi doldu.", accountRevoked: "Erişiminiz devre dışı bırakıldı. Destek ile iletişime geçin.", emailSent: "Size bir e-posta gönderildi.", passwordMismatch: "Şifreler eşleşmiyor.", emailAlreadyExists: "Bu e-posta ile zaten bir hesap var. Doğrudan giriş yapın." },
    nav: { home: "Ana sayfa", courses: "Kurslar", revisions: "Tekrar", mockExams: "Deneme sınavları", progress: "İlerleme", objectives: "Hedefler", resources: "Kaynaklar", settings: "Ayarlar", help: "Yardım", profile: "Profil" },
    dashboard: { welcome: "Hoş geldiniz {name}", estimatedScore: "Tahmini puan", confidence: "Güven: {level}", confidenceLow: "Düşük", confidenceMedium: "Orta", confidenceHigh: "Yüksek", todayPlan: "Bugünkü plan", startSession: "Başla", overallProgress: "Genel ilerleme", bySkill: "Beceri bazında", vocabulary: "Kelime bilgisi", grammar: "Dilbilgisi", reading: "Okuma", listening: "Dinleme", writing: "Yazma", speaking: "Konuşma", recommendations: "Sizin için öneriler", streak: "Mevcut seri", streakDays: "{count} gün", targetExam: "Sınav tarihi: {date}", targetScore: "Hedef puan: {score}", vsLastWeek: "geçen haftaya göre", nextActions: "Sıradaki", estimatedImpact: "Tahmini etki: +{points} puan", preparationStatus: "Hazırlık durumu", statusNotStarted: "Henüz başlanmadı", statusInProgress: "Devam ediyor", statusOnTrack: "Yolunda", statusNearTarget: "Hedefe yakın", statusReady: "Hazır", statusAtRisk: "Dikkat gerekiyor", timeStudied: "Çalışma süresi", timeRemaining: "Tahmini kalan süre" },
    onboarding: { step: "Adım {current} / {total}", chooseLanguage: "Arayüz dilinizi seçin", chooseLevel: "Hangi HSK seviyesine hazırlanıyorsunuz?", chooseObjective: "Hedefiniz nedir?", objectiveExam: "Sınavı geçmek", objectiveStudies: "Çin'de eğitim", objectiveWork: "Profesyonel kariyer", objectiveImmigration: "Göç", objectivePersonal: "Kişisel hedef", examDate: "Sınav tarihiniz var mı?", examDateYes: "Evet, bir tarihim var", examDateNo: "Henüz yok", targetScore: "Hangi puanı hedefliyorsunuz?", availability: "Haftada kaç saat ayırabilirsiniz?", selfAssessment: "Mevcut seviyenizi değerlendirin", selfAssessmentDesc: "Başlangıç noktanızı tahmin etmek için 5 hızlı soru.", diagnostic: "Önerilen başlangıç teşhisi", diagnosticDesc: "Güçlü ve zayıf yönlerinizi ölçmek için 20 dakikalık kapsamlı test.", startDiagnostic: "Teşhise başla", skipDiagnostic: "Doğrudan kursa başla", planGenerated: "Kişiselleştirilmiş planınız hazır", planGeneratedDesc: "Yanıtlarınıza göre önerilen yolunuz.", startLearning: "Öğrenmeye başla" },
    exercises: { correct: "Doğru", incorrect: "Yanlış", partiallyCorrect: "Kısmen doğru", explanation: "Açıklama", errorExplanation: "Bu cevabın neden yanlış olduğu", tryAgain: "Tekrar dene", showHint: "İpucu göster", nextExercise: "Sonraki alıştırma", askAI: "Farklı şekilde açıkla", commonErrors: "Sık yapılan hatalar", yourAnswer: "Cevabınız", correctAnswer: "Doğru cevap", score: "Puan", timeSpent: "Süre", difficulty: "Zorluk" },
    mockExam: { title: "Deneme sınavı", start: "Sınava başla", timeRemaining: "Kalan süre", section: "Bölüm {number}", listening: "Dinleme anlama", reading: "Okuma anlama", writing: "Yazılı ifade", submit: "Gönder", autoSaved: "Otomatik kaydedildi", results: "Sonuçlar", analysis: "Detaylı analiz", comparison: "Önceki sınavlarınızla karşılaştırma", recommendation: "Öneriler" },
    settings: { title: "Ayarlar", account: "Hesabım", language: "Arayüz dili", license: "Lisans ve erişim", licenseActive: "Aktif", licenseExpired: "Süresi dolmuş", licenseExpires: "{date} tarihinde sona eriyor", notifications: "Bildirimler", privacy: "Gizlilik", exportData: "Verilerimi dışa aktar", deleteAccount: "Hesabımı sil" },
    admin: { dashboard: "Kontrol paneli", learners: "Öğrenciler", licenses: "Lisanslar", content: "İçerik", analytics: "Analitik", settings: "Ayarlar", logs: "İşlem günlüğü", import: "İçe aktar", activeLearners: "Aktif öğrenciler", activationRate: "Aktivasyon oranı", completionRate: "Tamamlanma oranı", avgScore: "Ortalama puan", atRisk: "Terk riski altında", courses: "Kurslar", modules: "Modüller", lessons: "Dersler", vocabulary: "Kelime bilgisi", grammar: "Dilbilgisi", characters: "Karakterler", exercises: "Alıştırmalar", published: "Yayınlandı", draft: "Taslak", validated: "Doğrulandı", archived: "Arşivlendi", allStatuses: "Tüm durumlar", allLevels: "Tüm seviyeler", search: "Ara...", actions: "İşlemler", edit: "Düzenle", delete: "Sil", create: "Oluştur", save: "Kaydet", cancel: "İptal", confirm: "Onayla", status: "Durum", level: "Seviye", type: "Tür", title: "Başlık", slug: "Tanımlayıcı", version: "Sürüm", moduleCount: "Modüller", licenseCount: "Lisanslar", lessonCount: "Dersler", exerciseCount: "Alıştırmalar", sortOrder: "Sıralama", duration: "Süre", difficulty: "Zorluk", createdAt: "Oluşturulma", updatedAt: "Güncellenme", noData: "Veri yok", loading: "Yükleniyor...", simplified: "Basitleştirilmiş", traditional: "Geleneksel", pinyin: "Pinyin", meaning: "Anlam", radical: "Radikal", strokeCount: "Çizgi sayısı", wordType: "Kelime türü", theme: "Tema", frequencyRank: "Sıklık", pattern: "Yapı", character: "Karakter", mnemonic: "Hafıza tekniği", email: "E-posta", displayName: "Görünen ad", role: "Rol", activationCode: "Aktivasyon kodu", courseSlug: "Kurs", activatedAt: "Aktifleştirilme", expiresAt: "Bitiş", pending: "Beklemede", active: "Aktif", expired: "Süresi dolmuş", revoked: "İptal edilmiş", refunded: "İade edilmiş", revoke: "İptal et", extend: "Uzat", contentOverview: "İçerik genel bakışı", totalCourses: "Toplam kurs", publishedCourses: "Yayınlanan kurslar", totalVocabulary: "Kelime bilgisi öğeleri", totalExercises: "Toplam alıştırma", manageContent: "Eğitim içeriğini yönet", manageLearners: "Öğrencileri yönet", manageLicenses: "Lisansları yönet", lastLogin: "Son giriş", isActive: "Aktif", profiles: "Profiller", exam: "Sınav", targetLevel: "Hedef seviye", preparationStatus: "Hazırlık durumu" },
    courses: {
      title: "HSK Kursları", subtitle: "Seviyenizi seçin ve hazırlığınıza başlayın",
      modules: "{count} modül", vocabulary: "{count} kelime", grammar: "{count} dilbilgisi noktası",
      characters: "{count} karakter", startCourse: "Başla", continueCourse: "Devam et",
      viewCourse: "Kursu gör", comingSoon: "Yakında", available: "Mevcut",
      level: "Seviye {level}", allThemes: "Tüm temalar", allTypes: "Tüm türler",
      searchPlaceholder: "Kelime, pinyin ara...", noResults: "Sonuç yok",
      wordsCount: "{total} üzerinden {count} kelime", page: "Sayfa {current} / {total}",
      overview: "Genel bakış", vocabularyTab: "Kelime Bilgisi", grammarTab: "Dilbilgisi",
      charactersTab: "Karakterler", modulesTab: "Modüller", moduleTitle: "Modül {number}",
      lessons: "{count} ders", estimatedTime: "{minutes} dk", example: "Örnek",
      meaning: "Anlam", pinyin: "Pinyin", radical: "Radikal", strokes: "{count} çizgi",
      frequency: "Sıklık #{rank}", wordType: "Tür", theme: "Tema",
      expandCard: "Detayları gör", collapseCard: "Detayları gizle", prevPage: "Önceki sayfa",
      nextPage: "Sonraki sayfa", contentStats: "Mevcut içerik",
      wordsShowing: "kelime gösteriliyor", filtered: "filtrelenmiş", total: "toplam",
      noContent: "İçerik henüz mevcut değil.",
      searchGrammarPlaceholder: "Dilbilgisi noktası ara...",
      grammarPointsShowing: "dilbilgisi noktası", traditional: "Geleneksel",
      themeLabel: "Tema", wordTypeLabel: "Tür",
      noVocabulary: "Bu seviyenin kelime bilgisi henüz mevcut değil.",
      noGrammar: "Bu seviyenin dilbilgisi noktaları henüz mevcut değil.",
      noCharacters: "Bu seviyenin karakterleri henüz mevcut değil.",
      noModules: "Bu seviyenin modülleri henüz mevcut değil.",
      characterBreakdown: "Karakter ayrıştırması",
      searchCharPlaceholder: "Karakter, pinyin ara...",
      charactersShowing: "karakter",
      mnemonicLabel: "Hatırlama ipucu",
      audioUnavailable: "Bu cihazda ses kullanılamıyor",
      wordTypes: { noun: "İsim", verb: "Fiil", adjective: "Sıfat", adverb: "Zarf", pronoun: "Zamir", preposition: "Edat", conjunction: "Bağlaç", interjection: "Ünlem", particle: "Edat", measure_word: "Ölçü kelimesi", numeral: "Sayı", expression: "İfade", auxiliary_verb: "Yardımcı fiil", onomatopoeia: "Yansıma", determiner: "Belirleyici", prefix: "Ön ek", suffix: "Son ek", proper_noun: "Özel isim" },
      themes: { greetings_basics: "Selamlaşma ve temeller", numbers_time: "Sayılar ve zaman", family_people: "Aile ve insanlar", food_drinks: "Yiyecek ve içecekler", daily_life: "Günlük yaşam", school_education: "Okul ve eğitim", transportation: "Ulaşım", weather_nature: "Hava ve doğa", body_health: "Vücut ve sağlık", shopping_money: "Alışveriş ve para", home_housing: "Ev ve konut", work_career: "İş ve kariyer", hobbies_leisure: "Hobiler ve eğlence", colors_descriptions: "Renkler ve tanımlar", emotions_states: "Duygular ve durumlar", communication: "İletişim", location_direction: "Yer ve yön", actions_movements: "Eylemler ve hareketler", grammar_function: "Dilbilgisi ve işlev", quantity_comparison: "Miktar ve karşılaştırma", basic_adjectives: "Temel sıfatlar", basic_verbs: "Temel fiiller", clothing: "Giyim", directions: "Yönler", family: "Aile", feelings: "Duygular", food_drink: "Yiyecek ve içecekler", greetings: "Selamlaşma", hobbies: "Hobiler", numbers: "Sayılar", places: "Yerler", pronouns_particles: "Zamirler ve edatlar", school_work: "Okul ve iş", shopping: "Alışveriş", time_dates: "Zaman ve tarihler", transport: "Ulaşım" }
    },
    errors: { generic: "Bir hata oluştu. Lütfen tekrar deneyin.", network: "Bağlantı hatası. İnternet bağlantınızı kontrol edin.", notFound: "Sayfa bulunamadı.", unauthorized: "Yetkisiz erişim.", sessionExpired: "Oturumunuz sona erdi. Lütfen tekrar giriş yapın." }
  }
};

// For locales not fully translated above, we'll create them from the English base
// with key translations for the most visible strings
const enData = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, 'en.json'), 'utf-8'));

// Quick translation map for the remaining locales — these cover the most visible UI strings
const quickTranslations = {
  de: { lang: "German", meta_desc: "Bereiten Sie Ihre asiatischen Sprachprüfungen vor mit einem personalisierten Lernpfad, intelligentem Training und präziser Fortschrittsverfolgung.",
    nav: { home: "Startseite", courses: "Kurse", revisions: "Wiederholung", mockExams: "Probeklausuren", progress: "Fortschritt", objectives: "Ziele", resources: "Ressourcen", settings: "Einstellungen", help: "Hilfe", profile: "Profil" },
    courses_tab: { vocabularyTab: "Wortschatz", grammarTab: "Grammatik", charactersTab: "Schriftzeichen", modulesTab: "Module", searchPlaceholder: "Wort, Pinyin suchen...", noResults: "Keine Ergebnisse", noContent: "Inhalt noch nicht verfügbar.", comingSoon: "Demnächst", available: "Verfügbar", characterBreakdown: "Zeichenzerlegung", searchCharPlaceholder: "Zeichen, Pinyin suchen...", charactersShowing: "Zeichen", mnemonicLabel: "Gedächtnistipp", audioUnavailable: "Audio auf diesem Gerät nicht verfügbar" },
    common: { loading: "Laden...", save: "Speichern", cancel: "Abbrechen", next: "Weiter", previous: "Zurück", search: "Suchen", close: "Schließen", back: "Zurück", yes: "Ja", no: "Nein" }
  },
  it: { lang: "Italian", meta_desc: "Prepara i tuoi esami di lingue asiatiche con un percorso personalizzato, allenamenti intelligenti e un monitoraggio preciso dei tuoi progressi.",
    nav: { home: "Home", courses: "Corsi", revisions: "Ripasso", mockExams: "Esami simulati", progress: "Progresso", objectives: "Obiettivi", resources: "Risorse", settings: "Impostazioni", help: "Aiuto", profile: "Profilo" },
    courses_tab: { vocabularyTab: "Vocabolario", grammarTab: "Grammatica", charactersTab: "Caratteri", modulesTab: "Moduli", searchPlaceholder: "Cerca una parola, pinyin...", noResults: "Nessun risultato", noContent: "Contenuto non ancora disponibile.", comingSoon: "Prossimamente", available: "Disponibile", characterBreakdown: "Scomposizione in caratteri", searchCharPlaceholder: "Cerca un carattere, pinyin...", charactersShowing: "caratteri", mnemonicLabel: "Trucco mnemonico", audioUnavailable: "Audio non disponibile su questo dispositivo" },
    common: { loading: "Caricamento...", save: "Salva", cancel: "Annulla", next: "Avanti", previous: "Indietro", search: "Cerca", close: "Chiudi", back: "Indietro", yes: "Sì", no: "No" }
  },
  pt: { lang: "Portuguese", meta_desc: "Prepare seus exames de idiomas asiáticos com um caminho personalizado, treinos inteligentes e acompanhamento preciso do seu progresso.",
    nav: { home: "Início", courses: "Cursos", revisions: "Revisão", mockExams: "Simulados", progress: "Progresso", objectives: "Objetivos", resources: "Recursos", settings: "Configurações", help: "Ajuda", profile: "Perfil" },
    courses_tab: { vocabularyTab: "Vocabulário", grammarTab: "Gramática", charactersTab: "Caracteres", modulesTab: "Módulos", searchPlaceholder: "Buscar palavra, pinyin...", noResults: "Sem resultados", noContent: "Conteúdo ainda não disponível.", comingSoon: "Em breve", available: "Disponível", characterBreakdown: "Decomposição em caracteres", searchCharPlaceholder: "Buscar caractere, pinyin...", charactersShowing: "caracteres", mnemonicLabel: "Dica de memorização", audioUnavailable: "Áudio não disponível neste dispositivo" },
    common: { loading: "Carregando...", save: "Salvar", cancel: "Cancelar", next: "Próximo", previous: "Anterior", search: "Buscar", close: "Fechar", back: "Voltar", yes: "Sim", no: "Não" }
  },
  ja: { lang: "Japanese", meta_desc: "パーソナライズされたコース、スマートなトレーニング、正確な進捗管理でアジア言語の試験を準備しましょう。",
    nav: { home: "ホーム", courses: "コース", revisions: "復習", mockExams: "模擬試験", progress: "進捗", objectives: "目標", resources: "リソース", settings: "設定", help: "ヘルプ", profile: "プロフィール" },
    courses_tab: { vocabularyTab: "語彙", grammarTab: "文法", charactersTab: "漢字", modulesTab: "モジュール", searchPlaceholder: "単語、ピンインを検索...", noResults: "結果なし", noContent: "コンテンツはまだ利用できません。", comingSoon: "近日公開", available: "利用可能", characterBreakdown: "漢字の分解", searchCharPlaceholder: "漢字、ピンインを検索...", charactersShowing: "漢字", mnemonicLabel: "記憶のコツ", audioUnavailable: "このデバイスではオーディオ再生できません" },
    common: { loading: "読み込み中...", save: "保存", cancel: "キャンセル", next: "次へ", previous: "前へ", search: "検索", close: "閉じる", back: "戻る", yes: "はい", no: "いいえ" }
  },
  ko: { lang: "Korean", meta_desc: "맞춤형 학습 경로, 스마트 훈련, 정확한 진도 추적으로 아시아 언어 시험을 준비하세요.",
    nav: { home: "홈", courses: "과정", revisions: "복습", mockExams: "모의시험", progress: "진도", objectives: "목표", resources: "자료", settings: "설정", help: "도움말", profile: "프로필" },
    courses_tab: { vocabularyTab: "어휘", grammarTab: "문법", charactersTab: "한자", modulesTab: "모듈", searchPlaceholder: "단어, 병음 검색...", noResults: "결과 없음", noContent: "아직 콘텐츠가 없습니다.", comingSoon: "곧 출시", available: "이용 가능", characterBreakdown: "한자 분석", searchCharPlaceholder: "한자, 병음 검색...", charactersShowing: "한자", mnemonicLabel: "기억 팁", audioUnavailable: "이 기기에서 오디오를 사용할 수 없습니다" },
    common: { loading: "로딩 중...", save: "저장", cancel: "취소", next: "다음", previous: "이전", search: "검색", close: "닫기", back: "뒤로", yes: "예", no: "아니오" }
  },
  "zh-Hans": { lang: "Simplified Chinese", meta_desc: "通过个性化学习路径、智能训练和精确的进度跟踪，备考亚洲语言考试。",
    nav: { home: "首页", courses: "课程", revisions: "复习", mockExams: "模拟考试", progress: "进度", objectives: "目标", resources: "资源", settings: "设置", help: "帮助", profile: "个人资料" },
    courses_tab: { vocabularyTab: "词汇", grammarTab: "语法", charactersTab: "汉字", modulesTab: "模块", searchPlaceholder: "搜索词汇、拼音...", noResults: "无结果", noContent: "内容暂未上线。", comingSoon: "即将推出", available: "可用", characterBreakdown: "汉字拆解", searchCharPlaceholder: "搜索汉字、拼音...", charactersShowing: "个汉字", mnemonicLabel: "记忆技巧", audioUnavailable: "此设备不支持音频播放" },
    common: { loading: "加载中...", save: "保存", cancel: "取消", next: "下一步", previous: "上一步", search: "搜索", close: "关闭", back: "返回", yes: "是", no: "否" }
  },
  "zh-Hant": { lang: "Traditional Chinese", meta_desc: "透過個人化學習路徑、智慧訓練和精確的進度追蹤，備考亞洲語言考試。",
    nav: { home: "首頁", courses: "課程", revisions: "複習", mockExams: "模擬考試", progress: "進度", objectives: "目標", resources: "資源", settings: "設定", help: "說明", profile: "個人檔案" },
    courses_tab: { vocabularyTab: "詞彙", grammarTab: "語法", charactersTab: "漢字", modulesTab: "模組", searchPlaceholder: "搜尋詞彙、拼音...", noResults: "無結果", noContent: "內容尚未上線。", comingSoon: "即將推出", available: "可用", characterBreakdown: "漢字拆解", searchCharPlaceholder: "搜尋漢字、拼音...", charactersShowing: "個漢字", mnemonicLabel: "記憶技巧", audioUnavailable: "此裝置不支援音訊播放" },
    common: { loading: "載入中...", save: "儲存", cancel: "取消", next: "下一步", previous: "上一步", search: "搜尋", close: "關閉", back: "返回", yes: "是", no: "否" }
  },
  vi: { lang: "Vietnamese", meta_desc: "Chuẩn bị kỳ thi ngôn ngữ châu Á với lộ trình cá nhân hóa, luyện tập thông minh và theo dõi tiến độ chính xác.",
    nav: { home: "Trang chủ", courses: "Khóa học", revisions: "Ôn tập", mockExams: "Thi thử", progress: "Tiến độ", objectives: "Mục tiêu", resources: "Tài nguyên", settings: "Cài đặt", help: "Trợ giúp", profile: "Hồ sơ" },
    courses_tab: { vocabularyTab: "Từ vựng", grammarTab: "Ngữ pháp", charactersTab: "Chữ Hán", modulesTab: "Mô-đun", searchPlaceholder: "Tìm từ, pinyin...", noResults: "Không có kết quả", noContent: "Nội dung chưa có.", comingSoon: "Sắp có", available: "Có sẵn", characterBreakdown: "Phân tích chữ Hán", searchCharPlaceholder: "Tìm chữ, pinyin...", charactersShowing: "chữ Hán", mnemonicLabel: "Mẹo ghi nhớ", audioUnavailable: "Không phát được âm thanh trên thiết bị này" },
    common: { loading: "Đang tải...", save: "Lưu", cancel: "Hủy", next: "Tiếp", previous: "Trước", search: "Tìm kiếm", close: "Đóng", back: "Quay lại", yes: "Có", no: "Không" }
  },
  th: { lang: "Thai", meta_desc: "เตรียมสอบภาษาเอเชียด้วยแผนการเรียนส่วนตัว การฝึกอัจฉริยะ และการติดตามความก้าวหน้าอย่างแม่นยำ",
    nav: { home: "หน้าแรก", courses: "คอร์สเรียน", revisions: "ทบทวน", mockExams: "ข้อสอบจำลอง", progress: "ความก้าวหน้า", objectives: "เป้าหมาย", resources: "แหล่งข้อมูล", settings: "ตั้งค่า", help: "ช่วยเหลือ", profile: "โปรไฟล์" },
    courses_tab: { vocabularyTab: "คำศัพท์", grammarTab: "ไวยากรณ์", charactersTab: "ตัวอักษร", modulesTab: "บทเรียน", searchPlaceholder: "ค้นหาคำ, พินอิน...", noResults: "ไม่พบผลลัพธ์", noContent: "ยังไม่มีเนื้อหา", comingSoon: "เร็วๆ นี้", available: "พร้อมใช้งาน", characterBreakdown: "วิเคราะห์ตัวอักษร", searchCharPlaceholder: "ค้นหาตัวอักษร, พินอิน...", charactersShowing: "ตัวอักษร", mnemonicLabel: "เคล็ดลับจำ", audioUnavailable: "เสียงไม่พร้อมใช้งานบนอุปกรณ์นี้" },
    common: { loading: "กำลังโหลด...", save: "บันทึก", cancel: "ยกเลิก", next: "ถัดไป", previous: "ก่อนหน้า", search: "ค้นหา", close: "ปิด", back: "กลับ", yes: "ใช่", no: "ไม่" }
  },
  id: { lang: "Indonesian", meta_desc: "Persiapkan ujian bahasa Asia Anda dengan jalur yang dipersonalisasi, latihan cerdas, dan pelacakan kemajuan yang akurat.",
    nav: { home: "Beranda", courses: "Kursus", revisions: "Ulasan", mockExams: "Ujian simulasi", progress: "Kemajuan", objectives: "Tujuan", resources: "Sumber daya", settings: "Pengaturan", help: "Bantuan", profile: "Profil" },
    courses_tab: { vocabularyTab: "Kosa kata", grammarTab: "Tata bahasa", charactersTab: "Karakter", modulesTab: "Modul", searchPlaceholder: "Cari kata, pinyin...", noResults: "Tidak ada hasil", noContent: "Konten belum tersedia.", comingSoon: "Segera hadir", available: "Tersedia", characterBreakdown: "Analisis karakter", searchCharPlaceholder: "Cari karakter, pinyin...", charactersShowing: "karakter", mnemonicLabel: "Tips menghafal", audioUnavailable: "Audio tidak tersedia di perangkat ini" },
    common: { loading: "Memuat...", save: "Simpan", cancel: "Batal", next: "Berikutnya", previous: "Sebelumnya", search: "Cari", close: "Tutup", back: "Kembali", yes: "Ya", no: "Tidak" }
  },
  hi: { lang: "Hindi", meta_desc: "व्यक्तिगत पथ, स्मार्ट प्रशिक्षण और सटीक प्रगति ट्रैकिंग के साथ अपनी एशियाई भाषा परीक्षाओं की तैयारी करें।",
    nav: { home: "होम", courses: "पाठ्यक्रम", revisions: "दोहराई", mockExams: "अभ्यास परीक्षा", progress: "प्रगति", objectives: "लक्ष्य", resources: "संसाधन", settings: "सेटिंग्स", help: "सहायता", profile: "प्रोफ़ाइल" },
    courses_tab: { vocabularyTab: "शब्दावली", grammarTab: "व्याकरण", charactersTab: "अक्षर", modulesTab: "मॉड्यूल", searchPlaceholder: "शब्द, पिनयिन खोजें...", noResults: "कोई परिणाम नहीं", noContent: "सामग्री अभी उपलब्ध नहीं है।", comingSoon: "जल्द आ रहा है", available: "उपलब्ध", characterBreakdown: "अक्षर विश्लेषण", searchCharPlaceholder: "अक्षर, पिनयिन खोजें...", charactersShowing: "अक्षर", mnemonicLabel: "याद करने का तरीका", audioUnavailable: "इस डिवाइस पर ऑडियो उपलब्ध नहीं है" },
    common: { loading: "लोड हो रहा है...", save: "सहेजें", cancel: "रद्द करें", next: "अगला", previous: "पिछला", search: "खोजें", close: "बंद करें", back: "वापस", yes: "हाँ", no: "नहीं" }
  },
  ar: { lang: "Arabic", meta_desc: "استعد لامتحانات اللغات الآسيوية بمسار مخصص وتدريب ذكي وتتبع دقيق لتقدمك.",
    nav: { home: "الرئيسية", courses: "الدورات", revisions: "المراجعة", mockExams: "اختبارات تجريبية", progress: "التقدم", objectives: "الأهداف", resources: "الموارد", settings: "الإعدادات", help: "المساعدة", profile: "الملف الشخصي" },
    courses_tab: { vocabularyTab: "المفردات", grammarTab: "القواعد", charactersTab: "الحروف", modulesTab: "الوحدات", searchPlaceholder: "ابحث عن كلمة، بينيين...", noResults: "لا توجد نتائج", noContent: "المحتوى غير متوفر بعد.", comingSoon: "قريباً", available: "متوفر", characterBreakdown: "تحليل الحروف", searchCharPlaceholder: "ابحث عن حرف، بينيين...", charactersShowing: "حرف", mnemonicLabel: "حيلة للتذكر", audioUnavailable: "الصوت غير متاح على هذا الجهاز" },
    common: { loading: "جاري التحميل...", save: "حفظ", cancel: "إلغاء", next: "التالي", previous: "السابق", search: "بحث", close: "إغلاق", back: "رجوع", yes: "نعم", no: "لا" }
  },
  ru: { lang: "Russian", meta_desc: "Готовьтесь к экзаменам по азиатским языкам с персонализированным маршрутом, умными тренировками и точным отслеживанием прогресса.",
    nav: { home: "Главная", courses: "Курсы", revisions: "Повторение", mockExams: "Пробные экзамены", progress: "Прогресс", objectives: "Цели", resources: "Ресурсы", settings: "Настройки", help: "Помощь", profile: "Профиль" },
    courses_tab: { vocabularyTab: "Словарный запас", grammarTab: "Грамматика", charactersTab: "Иероглифы", modulesTab: "Модули", searchPlaceholder: "Поиск слова, пиньинь...", noResults: "Нет результатов", noContent: "Контент ещё не доступен.", comingSoon: "Скоро", available: "Доступно", characterBreakdown: "Разбор иероглифов", searchCharPlaceholder: "Поиск иероглифа, пиньинь...", charactersShowing: "иероглифов", mnemonicLabel: "Подсказка для запоминания", audioUnavailable: "Аудио недоступно на этом устройстве" },
    common: { loading: "Загрузка...", save: "Сохранить", cancel: "Отмена", next: "Далее", previous: "Назад", search: "Поиск", close: "Закрыть", back: "Назад", yes: "Да", no: "Нет" }
  },
  pl: { lang: "Polish", meta_desc: "Przygotuj się do egzaminów z języków azjatyckich dzięki spersonalizowanej ścieżce, inteligentnemu treningowi i precyzyjnemu śledzeniu postępów.",
    nav: { home: "Strona główna", courses: "Kursy", revisions: "Powtórka", mockExams: "Egzaminy próbne", progress: "Postępy", objectives: "Cele", resources: "Zasoby", settings: "Ustawienia", help: "Pomoc", profile: "Profil" },
    courses_tab: { vocabularyTab: "Słownictwo", grammarTab: "Gramatyka", charactersTab: "Znaki", modulesTab: "Moduły", searchPlaceholder: "Szukaj słowa, pinyin...", noResults: "Brak wyników", noContent: "Treść jeszcze niedostępna.", comingSoon: "Wkrótce", available: "Dostępne", characterBreakdown: "Rozkład znaków", searchCharPlaceholder: "Szukaj znaku, pinyin...", charactersShowing: "znaków", mnemonicLabel: "Wskazówka do zapamiętania", audioUnavailable: "Dźwięk niedostępny na tym urządzeniu" },
    common: { loading: "Ładowanie...", save: "Zapisz", cancel: "Anuluj", next: "Dalej", previous: "Wstecz", search: "Szukaj", close: "Zamknij", back: "Wróć", yes: "Tak", no: "Nie" }
  },
  ro: { lang: "Romanian", meta_desc: "Pregătește-te pentru examenele de limbi asiatice cu un parcurs personalizat, antrenamente inteligente și urmărirea precisă a progresului.",
    nav: { home: "Acasă", courses: "Cursuri", revisions: "Recapitulare", mockExams: "Examene simulate", progress: "Progres", objectives: "Obiective", resources: "Resurse", settings: "Setări", help: "Ajutor", profile: "Profil" },
    courses_tab: { vocabularyTab: "Vocabular", grammarTab: "Gramatică", charactersTab: "Caractere", modulesTab: "Module", searchPlaceholder: "Caută un cuvânt, pinyin...", noResults: "Niciun rezultat", noContent: "Conținut indisponibil deocamdată.", comingSoon: "În curând", available: "Disponibil", characterBreakdown: "Descompunerea caracterelor", searchCharPlaceholder: "Caută un caracter, pinyin...", charactersShowing: "caractere", mnemonicLabel: "Truc de memorare", audioUnavailable: "Audio indisponibil pe acest dispozitiv" },
    common: { loading: "Se încarcă...", save: "Salvează", cancel: "Anulează", next: "Următor", previous: "Anterior", search: "Caută", close: "Închide", back: "Înapoi", yes: "Da", no: "Nu" }
  },
  uk: { lang: "Ukrainian", meta_desc: "Готуйтесь до іспитів з азійських мов з персоналізованим маршрутом, розумними тренуваннями та точним відстеженням прогресу.",
    nav: { home: "Головна", courses: "Курси", revisions: "Повторення", mockExams: "Пробні іспити", progress: "Прогрес", objectives: "Цілі", resources: "Ресурси", settings: "Налаштування", help: "Допомога", profile: "Профіль" },
    courses_tab: { vocabularyTab: "Словниковий запас", grammarTab: "Граматика", charactersTab: "Ієрогліфи", modulesTab: "Модулі", searchPlaceholder: "Шукати слово, піньїнь...", noResults: "Немає результатів", noContent: "Вміст ще не доступний.", comingSoon: "Незабаром", available: "Доступно", characterBreakdown: "Розбір ієрогліфів", searchCharPlaceholder: "Шукати ієрогліф, піньїнь...", charactersShowing: "ієрогліфів", mnemonicLabel: "Підказка для запам'ятовування", audioUnavailable: "Аудіо недоступне на цьому пристрої" },
    common: { loading: "Завантаження...", save: "Зберегти", cancel: "Скасувати", next: "Далі", previous: "Назад", search: "Пошук", close: "Закрити", back: "Назад", yes: "Так", no: "Ні" }
  }
};

// Helper: deep merge with partial overlay on English base
function buildLocaleFile(locale, partialData) {
  // Start with English as base (better than French for non-Latin locales)
  const base = JSON.parse(JSON.stringify(enData));
  
  // Apply partial translations
  if (partialData.meta_desc) {
    base.meta.description = partialData.meta_desc;
  }
  if (partialData.nav) {
    Object.assign(base.nav, partialData.nav);
  }
  if (partialData.common) {
    Object.assign(base.common, partialData.common);
  }
  if (partialData.courses_tab) {
    Object.assign(base.courses, partialData.courses_tab);
  }
  
  return base;
}

// Write fully translated locales (es, tr)
for (const [locale, data] of Object.entries(translations)) {
  const outPath = path.join(MESSAGES_DIR, `${locale}.json`);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Wrote ${locale}.json (full translation)`);
}

// Write partially translated locales (using English base + key overrides)
for (const [locale, partialData] of Object.entries(quickTranslations)) {
  const outPath = path.join(MESSAGES_DIR, `${locale}.json`);
  const data = buildLocaleFile(locale, partialData);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ Wrote ${locale}.json (partial - key UI strings translated)`);
}

// List all files
const files = fs.readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json'));
console.log(`\nTotal locale files: ${files.length}`);
console.log('Files:', files.join(', '));
