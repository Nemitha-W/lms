document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const elements = {
        authContainer: document.getElementById('auth-container'),
        loginForm: document.getElementById('login-form'),
        registerForm: document.getElementById('register-form'),
        showRegisterLink: document.getElementById('show-register'),
        showLoginLink: document.getElementById('show-login'),
        mainApp: document.getElementById('app'),
        mainHeader: document.getElementById('main-header'),
        sidebar: document.getElementById('sidebar'),
        mainContent: document.getElementById('main-content'),
        themeToggle: document.getElementById('theme-toggle'),
        menuToggle: document.getElementById('menu-toggle'),
        logoutBtn: document.getElementById('logout-btn'),
        userName: document.getElementById('user-name'),
        dashboardUserName: document.getElementById('dashboard-user-name'),
        // Views
        views: document.querySelectorAll('.view'),
        navLinks: document.querySelectorAll('.nav-link'),
        // Dashboard
        statCourses: document.getElementById('stat-courses'),
        statLessons: document.getElementById('stat-lessons'),
        statCompleted: document.getElementById('stat-completed'),
        // Courses
        courseList: document.getElementById('course-list'),
        courseTitle: document.getElementById('course-title'),
        lessonList: document.getElementById('lesson-list'),
        backToCoursesBtn: document.getElementById('back-to-courses'),
        backToDetailBtn: document.getElementById('back-to-detail'),
        // Player
        videoPlayer: document.getElementById('video-player'),
        lessonTitle: document.getElementById('lesson-title'),
        markCompleteBtn: document.getElementById('mark-complete-btn'),
        livestreamControls: document.getElementById('livestream-controls'),
        streamKeyInput: document.getElementById('stream-key'),
        copyKeyBtn: document.getElementById('copy-key-btn'),
        // Profile
        profileName: document.getElementById('profile-name'),
        profileEmail: document.getElementById('profile-email'),
        profileRole: document.getElementById('profile-role'),
        // Buttons
        addCourseBtn: document.getElementById('add-course-btn'),
        editCourseBtn: document.getElementById('edit-course-btn'),
        addLessonBtn: document.getElementById('add-lesson-btn'),
        // Modals
        modalOverlay: document.getElementById('modal-overlay'),
        courseModal: document.getElementById('course-modal'),
        lessonModal: document.getElementById('lesson-modal'),
        courseForm: document.getElementById('course-form'),
        lessonForm: document.getElementById('lesson-form'),
        cancelBtns: document.querySelectorAll('.cancel-btn'),
        // Toast
        toast: document.getElementById('toast'),
    };

    // --- State Management ---
    let state = {
        user: null,
        userData: null,
        currentView: 'login',
        currentCourse: null,
        editingCourse: null,
        editingLesson: null,
    };

    // --- Initialize Theme ---
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') document.body.classList.add('dark-theme');
    elements.themeToggle.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

    // --- Firebase Auth Listener ---
    auth.onAuthStateChanged(async user => {
        if (user) {
            state.user = user;
            const userDoc = await db.collection('users').doc(user.uid).get();
            state.userData = userDoc.data();
            elements.userName.textContent = state.userData.name;
            elements.dashboardUserName.textContent = state.userData.name;
            elements.profileName.textContent = state.userData.name;
            elements.profileEmail.textContent = state.userData.email;
            elements.profileRole.textContent = state.userData.role;

            showRoleBasedElements();
            router('dashboard');
            loadDashboardStats();
        } else {
            state.user = null;
            state.userData = null;
            router('login');
        }
    });

    // --- Router ---
    function router(viewName) {
        state.currentView = viewName;
        elements.views.forEach(view => view.classList.add('hidden'));
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) targetView.classList.remove('hidden');

        elements.navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewName);
        });
        
        if (viewName !== 'login') {
            elements.mainApp.classList.remove('hidden');
            elements.authContainer.classList.add('hidden');
        } else {
            elements.mainApp.classList.add('hidden');
            elements.authContainer.classList.remove('hidden');
        }
    }

    // --- UI Helpers ---
    function showToast(message, type = 'success') {
        elements.toast.textContent = message;
        elements.toast.className = `toast ${type}`;
        elements.toast.classList.remove('hidden');
        setTimeout(() => elements.toast.classList.add('hidden'), 3000);
    }

    function showRoleBasedElements() {
        const isTeacher = state.userData.role === 'teacher';
        document.querySelectorAll('.teacher-feature').forEach(el => el.classList.toggle('hidden', !isTeacher));
        document.querySelectorAll('.student-feature').forEach(el => el.classList.toggle('hidden', isTeacher));
    }

    // --- Event Listeners ---
    elements.themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        elements.themeToggle.textContent = isDark ? '☀️' : '🌙';
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });

    elements.menuToggle.addEventListener('click', () => elements.sidebar.classList.toggle('open'));
    elements.logoutBtn.addEventListener('click', () => auth.signOut());

    elements.navLinks.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        router(link.dataset.view);
        if (link.dataset.view === 'courses') loadCourses();
    }));

    // Auth Listeners
    elements.showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); elements.loginForm.classList.add('hidden'); elements.registerForm.classList.remove('hidden'); });
    elements.showLoginLink.addEventListener('click', (e) => { e.preventDefault(); elements.registerForm.classList.add('hidden'); elements.loginForm.classList.remove('hidden'); });
    elements.loginForm.addEventListener('submit', handleLogin);
    elements.registerForm.addEventListener('submit', handleRegister);

    // Modal Listeners
    elements.addCourseBtn.addEventListener('click', () => openCourseModal());
    elements.editCourseBtn.addEventListener('click', () => openCourseModal(state.currentCourse));
    elements.addLessonBtn.addEventListener('click', () => openLessonModal());
    elements.cancelBtns.forEach(btn => btn.addEventListener('click', closeModals));
    elements.modalOverlay.addEventListener('click', closeModals);
    elements.courseForm.addEventListener('submit', handleCourseSubmit);
    elements.lessonForm.addEventListener('submit', handleLessonSubmit);

    // View Listeners
    elements.backToCoursesBtn.addEventListener('click', () => router('courses'));
    elements.backToDetailBtn.addEventListener('click', () => router('course-detail'));
    elements.markCompleteBtn.addEventListener('click', handleMarkComplete);
    elements.copyKeyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(elements.streamKeyInput.value);
        showToast('Stream Key Copied!');
    });

    // --- CRUD Functions ---
    async function handleLogin(e) {
        e.preventDefault();
        const [email, password] = e.target.elements;
        try { await auth.signInWithEmailAndPassword(email.value, password.value); }
        catch (error) { showToast(error.message, 'error'); }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const [name, email, password, role] = e.target.elements;
        try {
            const cred = await auth.createUserWithEmailAndPassword(email.value, password.value);
            await db.collection('users').doc(cred.user.uid).set({ name: name.value, email: email.value, role: role.value });
            showToast('Registration successful!');
        } catch (error) { showToast(error.message, 'error'); }
    }

    async function loadDashboardStats() {
        const coursesSnap = await db.collection('courses').where('createdBy', '==', state.user.uid).get();
        elements.statCourses.textContent = coursesSnap.size;

        let totalLessons = 0;
        coursesSnap.forEach(courseDoc => {
            db.collection('courses').doc(courseDoc.id).collection('lessons').get().then(lessonSnap => {
                totalLessons += lessonSnap.size;
                elements.statLessons.textContent = totalLessons;
            });
        });
    }

    async function loadCourses() {
        elements.courseList.innerHTML = '<p class="text-center">Loading courses...</p>';
        const coursesSnap = await db.collection('courses').where('createdBy', '==', state.user.uid).get();
        elements.courseList.innerHTML = '';
        if (coursesSnap.empty) { elements.courseList.innerHTML = '<p class="text-center">No courses found. Create one!</p>'; return; }

        coursesSnap.forEach(doc => {
            const course = { id: doc.id, ...doc.data() };
            const courseCard = document.createElement('div');
            courseCard.className = 'card';
            courseCard.innerHTML = `<h3>${course.name}</h3><p>Manage your course content and lessons.</p>`;
            courseCard.addEventListener('click', () => loadCourseDetail(course));
            elements.courseList.appendChild(courseCard);
        });
    }

    async function loadCourseDetail(course) {
        state.currentCourse = course;
        elements.courseTitle.textContent = course.name;
        elements.lessonList.innerHTML = '<p class="text-center">Loading lessons...</p>';
        router('course-detail');

        const lessonsSnap = await db.collection('courses').doc(course.id).collection('lessons').orderBy('index').get();
        elements.lessonList.innerHTML = '';
        if (lessonsSnap.empty) { elements.lessonList.innerHTML = '<p class="text-center">No lessons yet. Add one!</p>'; return; }

        lessonsSnap.forEach(doc => {
            const lesson = { id: doc.id, ...doc.data() };
            addLessonToUI(lesson);
        });
    }

    async function addLessonToUI(lesson) {
        const lessonItem = document.createElement('div');
        lessonItem.className = 'lesson-item';
        lessonItem.innerHTML = `<span>${lesson.title}</span>`;
        
        if (state.userData.role === 'student') {
            const progressDoc = await db.collection('users').doc(state.user.uid).collection('progress').doc(lesson.id).get();
            if (progressDoc.exists) lessonItem.classList.add('completed');
        }

        lessonItem.addEventListener('click', () => playVideo(lesson));
        elements.lessonList.appendChild(lessonItem);
    }

    function playVideo(lesson) {
        state.editingLesson = lesson;
        elements.lessonTitle.textContent = lesson.title;
        elements.videoPlayer.src = `https://www.youtube.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1`;
        router('video-player');

        if (state.userData.role === 'teacher') {
            elements.livestreamControls.classList.remove('hidden');
            elements.streamKeyInput.value = lesson.youtubeId; // For simplicity, using video ID as key
        }
    }

    function handleMarkComplete() {
        if (!state.editingLesson) return;
        db.collection('users').doc(state.user.uid).collection('progress').doc(state.editingLesson.id).set({ completedAt: new Date() });
        showToast('Lesson marked as complete!');
        loadCourseDetail(state.currentCourse); // Refresh to show checkmark
    }

    // --- Modal Logic ---
    function openCourseModal(course = null) {
        state.editingCourse = course;
        elements.courseModal.querySelector('h3').textContent = course ? 'Edit Course' : 'Add New Course';
        elements.courseForm.elements[0].value = course ? course.name : '';
        elements.modalOverlay.classList.remove('hidden');
        elements.courseModal.classList.remove('hidden');
    }

    function openLessonModal() {
        elements.lessonModal.querySelector('h3').textContent = 'Add New Lesson';
        elements.lessonForm.reset();
        elements.modalOverlay.classList.remove('hidden');
        elements.lessonModal.classList.remove('hidden');
    }

    function closeModals() {
        elements.modalOverlay.classList.add('hidden');
        elements.courseModal.classList.add('hidden');
        elements.lessonModal.classList.add('hidden');
        state.editingCourse = null;
        state.editingLesson = null;
    }

    async function handleCourseSubmit(e) {
        e.preventDefault();
        const courseName = e.target.elements[0].value;
        try {
            if (state.editingCourse) {
                await db.collection('courses').doc(state.editingCourse.id).update({ name: courseName });
                showToast('Course updated!');
            } else {
                await db.collection('courses').add({ name: courseName, createdBy: state.user.uid });
                showToast('Course created!');
            }
            closeModals();
            loadCourses();
        } catch (error) { showToast(error.message, 'error'); }
    }

    async function handleLessonSubmit(e) {
        e.preventDefault();
        const [title, url] = e.target.elements;
        const youtubeId = extractYouTubeId(url.value);
        if (!youtubeId) { showToast('Invalid YouTube URL.', 'error'); return; }

        try {
            const lessonsRef = db.collection('courses').doc(state.currentCourse.id).collection('lessons');
            const snapshot = await lessonsRef.get();
            await lessonsRef.add({ title: title.value, youtubeId, index: snapshot.size + 1 });
            showToast('Lesson added!');
            closeModals();
            loadCourseDetail(state.currentCourse);
        } catch (error) { showToast(error.message, 'error'); }
    }

    // --- Helper: YouTube ID Extractor (FOOLPROOF) ---
    function extractYouTubeId(url) {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname === 'youtu.be') return urlObj.pathname.substring(1);
            if (urlObj.hostname.includes('youtube.com')) {
                const params = new URLSearchParams(urlObj.search);
                if (params.has('v')) return params.get('v');
                const pathSegments = urlObj.pathname.split('/');
                const liveIndex = pathSegments.indexOf('live');
                const embedIndex = pathSegments.indexOf('embed');
                if (liveIndex !== -1 && liveIndex + 1 < pathSegments.length) return pathSegments[liveIndex + 1];
                if (embedIndex !== -1 && embedIndex + 1 < pathSegments.length) return pathSegments[embedIndex + 1];
            }
            return null;
        } catch (e) { return null; }
    }
});
