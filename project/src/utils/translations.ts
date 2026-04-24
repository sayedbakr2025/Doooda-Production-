type Language = 'ar' | 'en';

interface Translations {
  [key: string]: {
    ar: string;
    en: string;
  };
}

const translations: Translations = {
  'signup.title': {
    ar: 'إنشاء حساب جديد',
    en: 'Create Your Account'
  },
  'signup.subtitle': {
    ar: 'ابدأ رحلتك في الكتابة',
    en: 'Start your writing journey'
  },
  'signup.firstName': {
    ar: 'الاسم الأول',
    en: 'First Name'
  },
  'signup.lastName': {
    ar: 'اسم العائلة',
    en: 'Last Name'
  },
  'signup.penName': {
    ar: 'الاسم المستعار',
    en: 'Pen Name'
  },
  'signup.language': {
    ar: 'لغة الكتابة المفضلة',
    en: 'Preferred Writing Language'
  },
  'signup.selectLanguage': {
    ar: 'اختر لغة',
    en: 'Select language'
  },
  'signup.arabic': {
    ar: 'العربية',
    en: 'Arabic'
  },
  'signup.english': {
    ar: 'الإنجليزية',
    en: 'English'
  },
  'signup.email': {
    ar: 'البريد الإلكتروني',
    en: 'Email'
  },
  'signup.password': {
    ar: 'كلمة المرور',
    en: 'Password'
  },
  'signup.confirmPassword': {
    ar: 'تأكيد كلمة المرور',
    en: 'Confirm Password'
  },
  'signup.button': {
    ar: 'إنشاء حساب',
    en: 'Create Account'
  },
  'signup.hasAccount': {
    ar: 'لديك حساب بالفعل؟',
    en: 'Already have an account?'
  },
  'signup.login': {
    ar: 'تسجيل الدخول',
    en: 'Log In'
  },
  'signup.passwordMismatch': {
    ar: 'كلمات المرور غير متطابقة',
    en: 'Passwords do not match'
  },
  'signup.passwordLength': {
    ar: 'يجب أن تكون كلمة المرور 8 أحرف على الأقل',
    en: 'Password must be at least 8 characters'
  },
  'signup.languageRequired': {
    ar: 'يرجى اختيار لغة الكتابة المفضلة',
    en: 'Please select your preferred writing language'
  },
  'signup.verifyEmail': {
    ar: 'تحقق من بريدك الإلكتروني',
    en: 'Verify Your Email'
  },
  'signup.verifyMessage': {
    ar: 'لقد أرسلنا رابط تحقق إلى بريدك الإلكتروني. يرجى النقر على الرابط لتأكيد حسابك.',
    en: 'We sent a verification link to your email. Please click the link to confirm your account.'
  },
  'signup.verifyCheck': {
    ar: 'تحقق من بريدك الإلكتروني',
    en: 'Check your email'
  },
  'signup.verifyResend': {
    ar: 'إعادة إرسال البريد',
    en: 'Resend email'
  },
  'signup.verifyBackLogin': {
    ar: 'العودة إلى تسجيل الدخول',
    en: 'Back to login'
  },
  'login.title': {
    ar: 'مرحباً بعودتك',
    en: 'Welcome Back'
  },
  'login.subtitle': {
    ar: 'واصل رحلتك في الكتابة',
    en: 'Continue your writing journey'
  },
  'login.email': {
    ar: 'البريد الإلكتروني',
    en: 'Email'
  },
  'login.password': {
    ar: 'كلمة المرور',
    en: 'Password'
  },
  'login.remember': {
    ar: 'تذكرني',
    en: 'Remember me'
  },
  'login.forgot': {
    ar: 'هل نسيت كلمة المرور؟',
    en: 'Forgot password?'
  },
  'login.button': {
    ar: 'تسجيل الدخول',
    en: 'Log In'
  },
  'login.noAccount': {
    ar: 'ليس لديك حساب؟',
    en: "Don't have an account?"
  },
  'login.signup': {
    ar: 'إنشاء حساب',
    en: 'Sign Up'
  },
  'placeholder.firstName': {
    ar: 'أدخل اسمك الأول',
    en: 'Enter your first name'
  },
  'placeholder.lastName': {
    ar: 'أدخل اسم عائلتك',
    en: 'Enter your last name'
  },
  'placeholder.penName': {
    ar: 'اسمك الذي سيظهر على أعمالك',
    en: 'Name that will appear on your works'
  },
  'placeholder.email': {
    ar: 'your@email.com',
    en: 'your@email.com'
  },
  'placeholder.password': {
    ar: '8 أحرف على الأقل',
    en: 'At least 8 characters'
  },
  'placeholder.confirmPassword': {
    ar: 'أعد إدخال كلمة المرور',
    en: 'Re-enter your password'
  },
  'welcome.title': {
    ar: 'دووودة',
    en: 'Doooda'
  },
  'welcome.tagline': {
    ar: 'رفيقك في رحلة الكتابة',
    en: 'Your Writing Companion'
  },
  'welcome.description': {
    ar: 'دووودة تساعدك على تنظيم مشاريع كتابتك، تتبع تقدمك، وتحقيق أهدافك الإبداعية بمساعدة الذكاء الاصطناعي.',
    en: 'Doooda helps you organize your writing projects, track your progress, and achieve your creative goals with AI-powered assistance.'
  },
  'welcome.signup': {
    ar: 'إنشاء حساب',
    en: 'Sign Up'
  },
  'welcome.login': {
    ar: 'تسجيل الدخول',
    en: 'Log In'
  },
  'error.emailExists': {
    ar: 'هذا البريد الإلكتروني مستخدم بالفعل',
    en: 'Email already exists'
  },
  'error.invalidEmail': {
    ar: 'البريد الإلكتروني غير صالح',
    en: 'Invalid email address'
  },
  'error.weakPassword': {
    ar: 'كلمة المرور ضعيفة جداً',
    en: 'Password is too weak'
  },
  'error.invalidCredentials': {
    ar: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    en: 'Invalid email or password'
  },
  'error.network': {
    ar: 'خطأ في الاتصال. يرجى المحاولة مرة أخرى',
    en: 'Connection error. Please try again'
  },
  'error.unknown': {
    ar: 'حدث خطأ. يرجى المحاولة مرة أخرى',
    en: 'An error occurred. Please try again'
  },
  'error.emailNotConfirmed': {
    ar: 'يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول. تحقق من صندوق الوارد الخاص بك.',
    en: 'Please confirm your email before logging in. Check your inbox for the confirmation link.'
  },
  'error.confirmationRequired': {
    ar: 'تم إنشاء الحساب! يرجى التحقق من بريدك الإلكتروني للتأكيد.',
    en: 'Account created! Please check your email to confirm your account.'
  },
  'dashboard.greeting.morning': {
    ar: 'صباح الخير',
    en: 'Good morning'
  },
  'dashboard.greeting.afternoon': {
    ar: 'مساء الخير',
    en: 'Good afternoon'
  },
  'dashboard.greeting.evening': {
    ar: 'مساء الخير',
    en: 'Good evening'
  },
  'dashboard.greeting.writer': {
    ar: 'كاتب',
    en: 'Writer'
  },
  'dashboard.greeting.ready': {
    ar: 'مستعد للكتابة اليوم؟',
    en: 'Ready to write today?'
  },
  'dashboard.logout': {
    ar: 'تسجيل الخروج',
    en: 'Logout'
  },
  'dashboard.yourProjects': {
    ar: 'مشاريعك',
    en: 'Your Projects'
  },
  'dashboard.newProject': {
    ar: '+ مشروع جديد',
    en: '+ New Project'
  },
  'dashboard.noProjects': {
    ar: 'لا توجد مشاريع بعد',
    en: 'No projects yet'
  },
  'dashboard.noProjectsDesc': {
    ar: 'قم بإنشاء مشروعك الأول للبدء في الكتابة',
    en: 'Create your first project to start writing'
  },
  'dashboard.createFirstProject': {
    ar: 'إنشاء مشروعك الأول',
    en: 'Create Your First Project'
  },
  'dashboard.words': {
    ar: 'كلمة',
    en: 'words'
  },
  'dashboard.progress': {
    ar: 'التقدم',
    en: 'Progress'
  },
  'project.create.title': {
    ar: 'إنشاء مشروع جديد',
    en: 'Create New Project'
  },
  'project.create.projectTitle': {
    ar: 'عنوان المشروع',
    en: 'Project Title'
  },
  'project.create.titlePlaceholder': {
    ar: 'قصتي المذهلة',
    en: 'My Amazing Story'
  },
  'project.create.projectType': {
    ar: 'نوع المشروع',
    en: 'Project Type'
  },
  'project.create.type.novel': {
    ar: 'رواية',
    en: 'Novel'
  },
  'project.create.type.short_story': {
    ar: 'قصة قصيرة',
    en: 'Short Story'
  },
  'project.create.type.long_story': {
    ar: 'قصة طويلة',
    en: 'Long Story'
  },
  'project.create.type.book': {
    ar: 'كتاب',
    en: 'Book'
  },
  'project.create.targetWordCount': {
    ar: 'عدد الكلمات المستهدف (اختياري)',
    en: 'Target Word Count (Optional)'
  },
  'project.create.targetPlaceholder': {
    ar: '50000',
    en: '50000'
  },
  'project.create.idea': {
    ar: 'فكرة المشروع (اختياري)',
    en: 'Project Idea (Optional)'
  },
  'project.create.ideaPlaceholder': {
    ar: 'وصف موجز لفكرة مشروعك',
    en: 'Brief description of your project idea'
  },
  'project.create.cancel': {
    ar: 'إلغاء',
    en: 'Cancel'
  },
  'project.create.create': {
    ar: 'إنشاء المشروع',
    en: 'Create Project'
  },
  'project.create.limitError': {
    ar: 'لقد وصلت إلى الحد الأقصى من المشاريع. يرجى الترقية أو حذف المشاريع غير المستخدمة.',
    en: 'You have reached your project limit. Please upgrade or delete unused projects.'
  },
  'project.create.titleRequired': {
    ar: 'عنوان المشروع مطلوب',
    en: 'Project title is required'
  },
  'project.create.invalidWordCount': {
    ar: 'عدد الكلمات المستهدف يجب أن يكون رقمًا موجبًا',
    en: 'Target word count must be a positive number'
  },
  'project.workspace.back': {
    ar: '→ رجوع',
    en: '← Back'
  },
  'project.workspace.settings': {
    ar: 'الإعدادات',
    en: 'Settings'
  },
  'project.tab.plot': {
    ar: 'خط الحبكة',
    en: 'Plot'
  },
  'project.tab.logline': {
    ar: 'الخط الدرامي',
    en: 'Logline'
  },
  'project.tab.chapters': {
    ar: 'الفصول',
    en: 'Chapters'
  },
  'project.tab.scenes': {
    ar: 'المشاهد',
    en: 'Scenes'
  },
  'project.tab.characters': {
    ar: 'الشخصيات',
    en: 'Characters'
  },
  'project.tab.notes': {
    ar: 'الملاحظات',
    en: 'Notes'
  },
  'project.logline.title': {
    ar: 'الخط الدرامي للمشروع',
    en: 'Project Logline'
  },
  'project.logline.description': {
    ar: 'الخط الدرامي هو ملخص من جملة واحدة لقصتك. يجب أن يلتقط جوهر السرد الخاص بك.',
    en: 'A logline is a one-sentence summary of your story. It should capture the essence of your narrative.'
  },
  'project.logline.placeholder': {
    ar: 'اكتب خطك الدرامي هنا...',
    en: 'Write your logline here...'
  },
  'project.logline.charCount': {
    ar: 'عدد الأحرف',
    en: 'Character count'
  },
  'project.logline.save': {
    ar: 'حفظ',
    en: 'Save'
  },
  'project.logline.tip': {
    ar: 'نصيحة: الخط الدرامي الجيد يتضمن البطل وهدفه والعقبة التي يواجهها.',
    en: 'Tip: A good logline includes your protagonist, their goal, and the obstacle they face.'
  },
  'project.chapters.title': {
    ar: 'الفصول',
    en: 'Chapters'
  },
  'project.chapters.add': {
    ar: '+ إضافة فصل',
    en: '+ Add Chapter'
  },
  'project.chapters.noChapters': {
    ar: 'لا توجد فصول بعد',
    en: 'No chapters yet'
  },
  'project.chapters.noChaptersDesc': {
    ar: 'ابدأ بإضافة فصلك الأول',
    en: 'Start by adding your first chapter'
  },
  'project.chapters.chapter': {
    ar: 'الفصل',
    en: 'Chapter'
  },
  'project.chapters.lastEdited': {
    ar: 'آخر تعديل',
    en: 'Last edited'
  },
  'project.chapters.edit': {
    ar: 'تعديل',
    en: 'Edit'
  },
  'project.chapters.delete': {
    ar: 'حذف',
    en: 'Delete'
  },
  'project.chapters.total': {
    ar: 'المجموع',
    en: 'Total'
  },
  'project.chapters.chaptersCount': {
    ar: 'فصول',
    en: 'chapters'
  },
  'project.scenes.title': {
    ar: 'المشاهد',
    en: 'Scenes'
  },
  'project.scenes.description': {
    ar: 'قسم فصولك إلى مشاهد يمكن إدارتها',
    en: 'Break your chapters into manageable scenes'
  },
  'project.scenes.add': {
    ar: '+ إضافة مشهد',
    en: '+ Add Scene'
  },
  'project.scenes.noScenes': {
    ar: 'لا توجد مشاهد بعد',
    en: 'No Scenes Yet'
  },
  'project.characters.title': {
    ar: 'الشخصيات',
    en: 'Characters'
  },
  'project.characters.description': {
    ar: 'إنشاء وإدارة شخصيات قصتك',
    en: 'Create and manage your story characters'
  },
  'project.characters.add': {
    ar: '+ إضافة شخصية',
    en: '+ Add Character'
  },
  'project.subheadings.title': {
    ar: 'العناوين الفرعية',
    en: 'Subheadings'
  },
  'project.subheadings.add': {
    ar: '+ إضافة عنوان فرعي',
    en: '+ Add Subheading'
  },
  'project.subheadings.description': {
    ar: 'قسم فصولك إلى عناوين فرعية',
    en: 'Break your chapters into subheadings'
  },
  'project.subheadings.noSubheadings': {
    ar: 'لا توجد عناوين فرعية بعد',
    en: 'No Subheadings Yet'
  },
  'project.references.title': {
    ar: 'المراجع',
    en: 'References'
  },
  'project.references.add': {
    ar: '+ إضافة مرجع',
    en: '+ Add Reference'
  },
  'project.references.description': {
    ar: 'إدارة مراجع كتابك',
    en: 'Manage your book references'
  },
  'contextMenu.addScene': {
    ar: 'أضف مشهد',
    en: 'Add Scene'
  },
  'contextMenu.addSubheading': {
    ar: 'أضف عنوان فرعي',
    en: 'Add Subheading'
  },
  'contextMenu.addCharacter': {
    ar: 'أضف شخصية',
    en: 'Add Character'
  },
  'contextMenu.addReference': {
    ar: 'أضف مرجع',
    en: 'Add Reference'
  },
  'contextMenu.addNote': {
    ar: 'أضف ملاحظة',
    en: 'Add Note'
  },
  'contextMenu.askDoooda': {
    ar: 'اسأل دووودة',
    en: 'Ask Doooda'
  },
  'project.notFound': {
    ar: 'المشروع غير موجود',
    en: 'Project not found'
  },
  'project.backToDashboard': {
    ar: 'العودة إلى لوحة التحكم',
    en: 'Back to Dashboard'
  },
  'common.noDescription': {
    ar: 'بدون وصف',
    en: 'No description'
  },
  'common.loading': {
    ar: 'جاري التحميل...',
    en: 'Loading...'
  },
  'doooda.title': {
    ar: 'دووودة',
    en: 'Doooda'
  },
  'doooda.subtitle': {
    ar: 'رفيقك في الكتابة',
    en: 'Your writing companion'
  },
  'doooda.greeting.neutral': {
    ar: 'أهلا أنا دووودة، كيف أساعدك؟',
    en: 'Hello, I am Doooda, how can I help you?'
  },
  'doooda.greeting.context': {
    ar: 'قرأت الجزء المظلل، كيف أساعدك؟',
    en: "I've read the selected part. How can I help you?"
  },
  'doooda.thinking': {
    ar: 'دووودة بتفكر معاك...',
    en: 'Doooda is thinking with you...'
  },
  'doooda.inputPlaceholder': {
    ar: 'اكتب رسالتك...',
    en: 'Type your message...'
  },
  'doooda.selectedContext': {
    ar: 'النص المحدد:',
    en: 'Selected text:'
  },
  'doooda.limitRedirect': {
    ar: 'خلّينا نقرّب السؤال شوية، إيه الجزء اللي حابب نركز عليه؟',
    en: 'Let\'s approach this from another angle. Which part would you like to focus on?'
  },
  'doooda.limitReached': {
    ar: 'واضح إننا اشتغلنا كتير النهارده \u{1F642} خلّينا نكمّل قريب.',
    en: 'Looks like we\'ve done a lot together today \u{1F642} Let\'s continue soon.'
  },
  'doooda.freePlanNotice': {
    ar: 'Ask Doooda متاحة في الخطط المدفوعة.',
    en: 'Ask Doooda is available on paid plans.'
  },
  'doooda.unavailable': {
    ar: 'Ask Doooda غير متاحة حاليًا.',
    en: 'Ask Doooda is temporarily unavailable.'
  },
  'doooda.upgrade': {
    ar: 'ترقية الخطة',
    en: 'Upgrade Plan'
  },
  'doooda.mode.explain': {
    ar: 'وضّح',
    en: 'Explain'
  },
  'doooda.mode.review': {
    ar: 'راجع',
    en: 'Review'
  },
  'doooda.mode.idea': {
    ar: 'أفكار',
    en: 'Ideas'
  },
  'plot.title': {
    ar: 'خط الحبكة',
    en: 'Plot Canvas'
  },
  'plot.newChapter': {
    ar: 'فصل جديد',
    en: 'New Chapter'
  },
  'plot.newScene': {
    ar: 'مشهد جديد',
    en: 'New Scene'
  },
  'plot.addChapter': {
    ar: 'إضافة فصل',
    en: 'Add Chapter'
  },
  'plot.addScene': {
    ar: 'إضافة مشهد',
    en: 'Add Scene'
  },
  'plot.saveError': {
    ar: 'فشل حفظ خط الحبكة',
    en: 'Failed to save plot'
  },
  'marketing.button': {
    ar: 'سوّق العمل',
    en: 'Market Your Work'
  },
  'marketing.panel.title': {
    ar: 'سوّق عملك',
    en: 'Market Your Work'
  },
  'marketing.export.title': {
    ar: 'تصدير العمل',
    en: 'Export Your Work'
  },
  'marketing.export.word': {
    ar: 'تصدير Word',
    en: 'Export Word'
  },
  'marketing.export.pdf': {
    ar: 'تصدير PDF',
    en: 'Export PDF'
  },
  'marketing.export.kindle': {
    ar: 'تنسيق Kindle',
    en: 'Kindle Format'
  },
  'marketing.export.print69': {
    ar: 'طباعة 6×9',
    en: 'Print-ready 6×9'
  },
  'marketing.export.screenplay': {
    ar: 'تنسيق السيناريو',
    en: 'Screenplay Format'
  },
  'marketing.export.kdp': {
    ar: 'تصدير Amazon KDP',
    en: 'Amazon KDP Export'
  },
  'marketing.english.title': {
    ar: 'النسخة الإنجليزية',
    en: 'English Edition'
  },
  'marketing.english.generate': {
    ar: 'إنشاء نسخة إنجليزية',
    en: 'Generate English Edition'
  },
  'marketing.publishers.title': {
    ar: 'البحث عن دور نشر',
    en: 'Find Publishers'
  },
  'marketing.competitions.title': {
    ar: 'المسابقات',
    en: 'Competitions'
  },
  'marketing.publishers.filter.genre': {
    ar: 'النوع الأدبي',
    en: 'Genre'
  },
  'marketing.publishers.filter.country': {
    ar: 'الدولة',
    en: 'Country'
  },
  'marketing.publishers.filter.accepts': {
    ar: 'يقبل مخطوطات مباشرة',
    en: 'Accepts manuscripts directly'
  },
  'marketing.publishers.filter.type': {
    ar: 'النوع',
    en: 'Type'
  },
  'marketing.publishers.type.publisher': {
    ar: 'دار نشر',
    en: 'Publisher'
  },
  'marketing.publishers.type.production': {
    ar: 'شركة إنتاج',
    en: 'Production Company'
  },
  'marketing.publishers.noResults': {
    ar: 'لا توجد نتائج مطابقة',
    en: 'No matching results'
  },
  'marketing.publishers.email': {
    ar: 'إرسال مخطوطة',
    en: 'Submit Manuscript'
  },
  'marketing.publishers.website': {
    ar: 'الموقع الرسمي',
    en: 'Official Website'
  },
  'marketing.publishers.guidelines': {
    ar: 'إرشادات التقديم',
    en: 'Submission Guidelines'
  },
  'marketing.publishers.copyEmail': {
    ar: 'نسخ البريد',
    en: 'Copy Email'
  },
  'marketing.publishers.submitLink': {
    ar: 'رابط التقديم',
    en: 'Open Submission Link'
  },
  'marketing.upgrade.title': {
    ar: 'مرحى! أنت الآن تتخذ خطوة هامة في مسيرتك ككاتب',
    en: "You're taking a serious step in your writing journey"
  },
  'marketing.upgrade.desc': {
    ar: 'قسم التسويق متاح فقط للكتّاب المشتركين. قم بالترقية لتحصل على أدوات احترافية لتصدير ونشر وتسويق عملك.',
    en: 'Marketing tools are available only for premium writers. Upgrade to unlock professional export and publishing features.'
  },
  'marketing.upgrade.cta': {
    ar: 'الترقية الآن',
    en: 'Upgrade Now'
  },
  'marketing.upgrade.plan.advanced': {
    ar: 'كاتب جاد',
    en: 'Serious Writer'
  },
  'marketing.upgrade.plan.pro': {
    ar: 'كاتب محترف',
    en: 'Pro Writer'
  },
  'marketing.export.settings.title': {
    ar: 'تنسيق العمل قبل التصدير',
    en: 'Formatting Options'
  },
  'marketing.export.settings.chapterTitles': {
    ar: 'عرض عناوين الفصول',
    en: 'Show chapter titles'
  },
  'marketing.export.settings.sceneTitles': {
    ar: 'عرض عناوين المشاهد',
    en: 'Show scene titles'
  },
  'marketing.export.settings.chapterNewPage': {
    ar: 'كل فصل يبدأ في صفحة جديدة',
    en: 'Start each chapter on new page'
  },
  'marketing.export.settings.sceneNewPage': {
    ar: 'كل مشهد يبدأ في صفحة جديدة',
    en: 'Start each scene on new page'
  },
  'marketing.export.settings.blankPage': {
    ar: 'فصل صفحة بيضاء بعد كل فصل',
    en: 'Insert blank page after each chapter'
  },
  'marketing.export.settings.coverPage': {
    ar: 'تضمين صفحة الغلاف',
    en: 'Include cover page'
  },
  'marketing.export.settings.cta': {
    ar: 'تصدير الآن',
    en: 'Export Now'
  },
  'marketing.translate.title': {
    ar: 'إنشاء نسخة إنجليزية',
    en: 'Generate English Edition'
  },
  'marketing.translate.desc': {
    ar: 'سيتم إنشاء نسخة إنجليزية كاملة من عملك.',
    en: 'This will generate a full English edition of your work.'
  },
  'marketing.translate.cost': {
    ar: 'التكلفة التقديرية',
    en: 'Estimated cost'
  },
  'marketing.translate.tokens': {
    ar: 'توكن',
    en: 'tokens'
  },
  'marketing.translate.confirm': {
    ar: 'هل ترغب في المتابعة؟',
    en: 'Do you want to continue?'
  },
  'marketing.translate.cta': {
    ar: 'متابعة',
    en: 'Continue'
  },
  'marketing.translate.cancel': {
    ar: 'إلغاء',
    en: 'Cancel'
  },
  'marketing.translate.insufficientTokens': {
    ar: 'رصيد التوكن غير كافٍ',
    en: 'Insufficient token balance'
  },
  'marketing.translate.buyTokens': {
    ar: 'شراء توكن',
    en: 'Buy Tokens'
  },
  'marketing.notComplete': {
    ar: 'يظهر زر التسويق عند اكتمال المشروع 100%',
    en: 'Marketing button appears when the project is 100% complete'
  }
};

export function t(key: string, lang: Language): string {
  return translations[key]?.[lang] || key;
}

export function translateError(error: string, lang: Language): string {
  if (error.includes('CONFIRMATION_REQUIRED')) return t('error.confirmationRequired', lang);
  if (error.includes('Email not confirmed')) return t('error.emailNotConfirmed', lang);
  if (error.includes('User already registered')) return t('error.emailExists', lang);
  if (error.includes('Invalid email')) return t('error.invalidEmail', lang);
  if (error.includes('Password')) return t('error.weakPassword', lang);
  if (error.includes('Invalid login credentials')) return t('error.invalidCredentials', lang);
  if (error.includes('network') || error.includes('fetch')) return t('error.network', lang);
  return t('error.unknown', lang);
}
