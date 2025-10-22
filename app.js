// DOM Elements
const loginView = document.getElementById('login-view');
const registerView = document.getElementById('register-view');
const dashboardView = document.getElementById('dashboard-view');
const authContainer = document.getElementById('auth-container');
const mainHeader = document.getElementById('main-header');

// Auth Elements
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const logoutBtn = document.getElementById('logout-btn');

// Dashboard Elements
const userEmailSpan = document.getElementById('user-email');
const userNameSpan = document.getElementById('user-name');
const courseList = document.getElementById('course-list');
const courseDetailView = document.getElementById('course-detail-view');
const videoPlayerView = document.getElementById('video-player-view');
const videoPlayer = document.getElementById('video-player');
const lessonTitle = document.getElementById('lesson-title');
const courseTitle = document.getElementById('course-title');
const lessonList = document.getElementById('lesson-list');

// Global state
let currentUser = null;
let currentCourse = null;

// --- AUTHENTICATION LOGIC ---
auth.onAuthStateChanged(async user => {
    if (user) {
        currentUser = user;
        const userDoc = await db.collection('users').doc(user.uid).get();
        const userData = userDoc.data();

        userEmailSpan.textContent = user.email;
        userNameSpan.textContent = userData.name;

        // Show/hide teacher features
        document.querySelectorAll('.teacher-feature').forEach(el => {
            el.style.display = userData.role === 'teacher' ? 'inline-block' : 'none';
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
    mainHeader.style.display = 'flex';
}

// Event Listeners for Auth
showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginView.style.display='none'; registerView.style.display='block'; });
showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerView.style.display='none'; loginView.style.display='block'; });

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
    }).catch(err => alert(err.message));
});

logoutBtn.addEventListener('click', () => auth.signOut());

// --- DASHBOARD & COURSE LOGIC ---

async function loadCourses() {
    courseList.innerHTML = '';
    const coursesSnapshot = await db.collection('courses').get();
    coursesSnapshot.forEach(doc => {
        const course = doc.data();
        const courseItem = document.createElement('div');
        courseItem.className = 'course-item';
        courseItem.textContent = course.name;
        courseItem.addEventListener('click', () => loadCourseDetail(doc.id, course));
        courseList.appendChild(courseItem);
    });
}

async function loadCourseDetail(courseId, courseData) {
    currentCourse = { id: courseId, ...courseData };
    courseTitle.textContent = courseData.name;
    lessonList.innerHTML = '';

    // Show active course in sidebar
    document.querySelectorAll('.course-item').forEach(item => item.classList.remove('active'));
    event.target.classList.add('active');

    const lessonsSnapshot = await db.collection('courses').doc(courseId).collection('lessons').orderBy('index').get();
    lessonsSnapshot.forEach(doc => {
        const lesson = doc.data();
        addLessonToUI(doc.id, lesson);
    });

    courseDetailView.style.display = 'block';
    videoPlayerView.style.display = 'none';
}

async function addLessonToUI(lessonId, lesson) {
    const lessonItem = document.createElement('div');
    lessonItem.className = 'lesson-item';
    
    // Check if student completed this lesson
    if (currentUser) {
        const progressDoc = await db.collection('users').doc(currentUser.uid).collection('progress').doc(lessonId).get();
        if (progressDoc.exists) {
            lessonItem.classList.add('completed');
        }
    }

    // Fetch video details from YouTube API
    fetch(`https://www.googleapis.com/youtube/v3/videos?id=${lesson.youtubeId}&part=snippet,liveStreamingDetails&key=${YOUTUBE_API_KEY}`)
        .then(res => res.json())
        .then(data => {
            const video = data.items[0];
            const title = video.snippet.title;
            const isLive = video.liveStreamingDetails && video.liveStreamingDetails.actualStartTime && !video.liveStreamingDetails.actualEndTime;
            
            lessonItem.innerHTML = `<span>${title}</span>`;
            if (isLive) {
                lessonItem.innerHTML += `<span class="live-badge">LIVE NOW</span>`;
            }
        });

    lessonItem.addEventListener('click', () => playVideo(lessonId, lesson));
    lessonList.appendChild(lessonItem);
}

function playVideo(lessonId, lesson) {
    lessonTitle.textContent = lesson.title || 'Loading Title...';
    videoPlayer.src = `https://www.youtube.com/embed/${lesson.youtubeId}?rel=0`;
    
    courseDetailView.style.display = 'none';
    videoPlayerView.style.display = 'block';

    // Set up "Mark Complete" button
    const markCompleteBtn = document.getElementById('mark-complete-btn');
    markCompleteBtn.onclick = () => {
        db.collection('users').doc(currentUser.uid).collection('progress').doc(lessonId).set({ completedAt: new Date() });
        loadCourseDetail(currentCourse.id, currentCourse); // Refresh to show checkmark
    };
}

// --- TEACHER FEATURES (Add Course) ---
const addCourseBtn = document.getElementById('add-course-btn');
const addCourseModal = document.getElementById('add-course-modal');
const modalOverlay = document.getElementById('modal-overlay');
const addCourseForm = document.getElementById('add-course-form');
const closeModalBtn = document.getElementById('close-modal-btn');

addCourseBtn.addEventListener('click', () => {
    modalOverlay.style.display = 'block';
    addCourseModal.style.display = 'block';
});

function closeModal() {
    modalOverlay.style.display = 'none';
    addCourseModal.style.display = 'none';
}

closeModalBtn.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

addCourseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const courseName = document.getElementById('new-course-name').value;
    db.collection('courses').add({ name: courseName, createdBy: currentUser.uid }).then(() => {
        closeModal();
        loadCourses();
        addCourseForm.reset();
    });
});
