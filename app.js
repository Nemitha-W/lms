document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const authContainer = document.getElementById('auth-container');
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const dashboardView = document.getElementById('dashboard-view');
    const mainHeader = document.getElementById('main-header');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');

    const userEmailSpan = document.getElementById('user-email');
    const userNameSpan = document.getElementById('user-name');
    const courseList = document.getElementById('course-list');
    const courseDetailView = document.getElementById('course-detail-view');
    const videoPlayerView = document.getElementById('video-player-view');
    const videoPlayer = document.getElementById('video-player');
    const lessonTitle = document.getElementById('lesson-title');
    const courseTitle = document.getElementById('course-title');
    const lessonList = document.getElementById('lesson-list');
    const welcomeMessage = document.getElementById('welcome-message');

    // Modal Elements
    const modalOverlay = document.getElementById('modal-overlay');
    const addCourseBtn = document.getElementById('add-course-btn');
    const addCourseModal = document.getElementById('add-course-modal');
    const addCourseForm = document.getElementById('add-course-form');
    const addLessonBtn = document.getElementById('add-lesson-btn');
    const addLessonModal = document.getElementById('add-lesson-modal');
    const addLessonForm = document.getElementById('add-lesson-form');
    const closeModalBtns = document.querySelectorAll('.close-modal-btn');

    // --- Global State ---
    let currentUser = null;
    let currentCourse = null;
    let userData = null;

    // --- HELPER FUNCTION: Extract YouTube ID (FOOLPROOF VERSION) ---
function extractYouTubeId(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Handle youtu.be short links
        if (hostname === 'youtu.be') {
            return urlObj.pathname.substring(1); // Get the part after the '/'
        }

        // Handle youtube.com, m.youtube.com, etc.
        if (hostname.includes('youtube.com')) {
            const params = new URLSearchParams(urlObj.search);
            
            // Standard watch link: ?v=ID
            if (params.has('v')) {
                return params.get('v');
            }

            // Live link or embed link: /live/ID or /embed/ID
            const pathSegments = urlObj.pathname.split('/');
            const liveIndex = pathSegments.indexOf('live');
            const embedIndex = pathSegments.indexOf('embed');

            if (liveIndex !== -1 && liveIndex + 1 < pathSegments.length) {
                return pathSegments[liveIndex + 1];
            }
            if (embedIndex !== -1 && embedIndex + 1 < pathSegments.length) {
                return pathSegments[embedIndex + 1];
            }
        }
        
        return null; // If no ID found
    } catch (e) {
        console.error("Invalid URL provided:", e);
        return null;
    }
}

    // --- AUTHENTICATION LOGIC ---
    auth.onAuthStateChanged(async user => {
        if (user) {
            currentUser = user;
            const userDoc = await db.collection('users').doc(user.uid).get();
            userData = userDoc.data();

            userEmailSpan.textContent = user.email;
            userNameSpan.textContent = userData.name;

            // Show/hide features based on role
            document.querySelectorAll('.teacher-feature').forEach(el => {
                el.style.display = userData.role === 'teacher' ? 'block' : 'none';
            });
            document.querySelectorAll('.student-feature').forEach(el => {
                el.style.display = userData.role === 'student' ? 'inline-block' : 'none';
            });

            showDashboard();
            loadCourses();
        } else {
            showAuth();
        }
    });

    function showAuth() {
        authContainer.style.display = 'flex';
        dashboardView.style.display = 'none';
        mainHeader.style.display = 'none';
    }

    function showDashboard() {
        authContainer.style.display = 'none';
        dashboardView.style.display = 'flex';
        mainHeader.style.display = 'block';
    }

    // Auth Event Listeners
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginView.style.display='none'; registerView.style.display='block'; });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerView.style.display='none'; loginView.style.display='block'; });
    logoutBtn.addEventListener('click', () => auth.signOut());

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = e.target[0].value;
        const password = e.target[1].value;
        auth.signInWithEmailAndPassword(email, password).catch(err => alert(err.message));
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = e.target[0].value;
        const email = e.target[1].value;
        const password = e.target[2].value;
        const role = e.target[3].value;
        auth.createUserWithEmailAndPassword(email, password).then(cred => {
            return db.collection('users').doc(cred.user.uid).set({ name, email, role });
        }).then(() => {
            registerForm.reset();
        }).catch(err => alert(err.message));
    });

    // --- MODAL LOGIC ---
    function openModal(modal) {
        modalOverlay.style.display = 'block';
        modal.style.display = 'block';
    }
    function closeModal() {
        modalOverlay.style.display = 'none';
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    }
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    modalOverlay.addEventListener('click', closeModal);

    addCourseBtn.addEventListener('click', () => openModal(addCourseModal));
    addLessonBtn.addEventListener('click', () => openModal(addLessonModal));

    // --- COURSE & LESSON LOGIC ---
    async function loadCourses() {
        courseList.innerHTML = '';
        const coursesSnapshot = await db.collection('courses').get();
        coursesSnapshot.forEach(doc => {
            const course = { id: doc.id, ...doc.data() };
            const courseItem = document.createElement('div');
            courseItem.className = 'course-item';
            courseItem.innerHTML = `<span>${course.name}</span>`;
            courseItem.addEventListener('click', () => loadCourseDetail(course));
            courseList.appendChild(courseItem);
        });
    }

    async function loadCourseDetail(course) {
        currentCourse = course;
        courseTitle.textContent = course.name;
        lessonList.innerHTML = '';
        
        welcomeMessage.style.display = 'none';
        courseDetailView.style.display = 'block';
        videoPlayerView.style.display = 'none';

        // Show active course in sidebar
        document.querySelectorAll('.course-item').forEach(item => item.classList.remove('active'));
        event.target.closest('.course-item').classList.add('active');

        const lessonsSnapshot = await db.collection('courses').doc(course.id).collection('lessons').orderBy('index').get();
        const lessonPromises = lessonsSnapshot.docs.map(doc => addLessonToUI(doc.id, doc.data()));
        await Promise.all(lessonPromises); // Wait for all lesson titles to be fetched
    }

    async function addLessonToUI(lessonId, lesson) {
        const lessonItem = document.createElement('div');
        lessonItem.className = 'lesson-item';
        lessonItem.dataset.lessonId = lessonId;

        // Check if student completed this lesson
        if (userData && userData.role === 'student') {
            const progressDoc = await db.collection('users').doc(currentUser.uid).collection('progress').doc(lessonId).get();
            if (progressDoc.exists) {
                lessonItem.classList.add('completed');
            }
        }

        // Fetch video details from YouTube API
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${lesson.youtubeId}&part=snippet,liveStreamingDetails&key=${YOUTUBE_API_KEY}`);
            if (!res.ok) throw new Error('Video not found or private');
            const data = await res.json();
            if (data.items.length === 0) throw new Error('Video not found');
            
            const video = data.items[0];
            const title = video.snippet.title;
            const isLive = video.liveStreamingDetails && video.liveStreamingDetails.actualStartTime && !video.liveStreamingDetails.actualEndTime;
            
            lessonItem.innerHTML = `<span>${title}</span>`;
            if (isLive) {
                lessonItem.innerHTML += `<span class="live-badge">LIVE NOW</span>`;
            }
        } catch (error) {
            console.error("Error fetching YouTube data:", error);
            lessonItem.innerHTML = `<span>${lesson.title || 'Untitled Lesson'}</span>`;
        }

        lessonItem.addEventListener('click', () => playVideo(lessonId, lesson));
        lessonList.appendChild(lessonItem);
    }

    function playVideo(lessonId, lesson) {
        lessonTitle.textContent = lesson.title || 'Loading Title...';
        videoPlayer.src = `https://www.youtube.com/embed/${lesson.youtubeId}?rel=0&modestbranding=1`;
        
        courseDetailView.style.display = 'none';
        videoPlayerView.style.display = 'block';

        // Update active lesson
        document.querySelectorAll('.lesson-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`.lesson-item[data-lesson-id="${lessonId}"]`).classList.add('active');

        // Set up "Mark Complete" button
        const markCompleteBtn = document.getElementById('mark-complete-btn');
        markCompleteBtn.onclick = () => {
            db.collection('users').doc(currentUser.uid).collection('progress').doc(lessonId).set({ completedAt: new Date() });
            // Add checkmark immediately for better UX
            document.querySelector(`.lesson-item[data-lesson-id="${lessonId}"]`).classList.add('completed');
        };
    }

    // --- TEACHER FEATURES: Add Course & Lesson ---
    addCourseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const courseName = document.getElementById('new-course-name').value;
        db.collection('courses').add({ name: courseName, createdBy: currentUser.uid }).then(() => {
            closeModal();
            addCourseForm.reset();
            loadCourses();
        });
    });

    addLessonForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const lessonTitle = document.getElementById('new-lesson-title').value;
        const lessonUrl = document.getElementById('new-lesson-url').value;
        const youtubeId = extractYouTubeId(lessonUrl);

        if (!youtubeId) {
            alert('Invalid YouTube URL. Please check and try again.');
            return;
        }

        // Get the next index for the lesson
        db.collection('courses').doc(currentCourse.id).collection('lessons').get().then(snap => {
            const newIndex = snap.size + 1;
            return db.collection('courses').doc(currentCourse.id).collection('lessons').add({
                title: lessonTitle,
                youtubeId: youtubeId,
                index: newIndex
            });
        }).then(() => {
            closeModal();
            addLessonForm.reset();
            loadCourseDetail(currentCourse); // Refresh the lesson list
        });
    });
});
