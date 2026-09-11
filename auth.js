/* ======================================
   LZPN BIAŁA PODLASKA - EKWIWALENTY
   AUTH.JS - logowanie (login + PIN)
   i synchronizacja danych w chmurze (Firebase)
====================================== */

const SESSION_KEY = "lzpn_session_username";
const LOCAL_CACHE_PREFIX = "lzpn_cache_";

let currentUsername = null;
let readyCallback = null;
let currentMode = "login";

/* ======================================
   NARZĘDZIA
====================================== */

async function hashPin(pin, username){

    const data =
        new TextEncoder().encode(pin + ":" + username);

    const hashBuffer =
        await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

function sanitizeUsername(name){

    return name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_\-.]/g, "");
}

function getLoginEls(){

    return {
        modal: document.getElementById("loginModal"),
        fullNameGroup: document.getElementById("fullNameGroup"),
        fullNameInput: document.getElementById("loginFullName"),
        usernameInput: document.getElementById("loginUsername"),
        pinInput: document.getElementById("loginPin"),
        submitBtn: document.getElementById("loginSubmitBtn"),
        errorEl: document.getElementById("loginError"),
        subtitleEl: document.getElementById("loginSubtitle"),
        loginModeBtn: document.getElementById("loginModeBtn"),
        registerModeBtn: document.getElementById("registerModeBtn")
    };
}

function showLoginError(msg){

    const { errorEl } = getLoginEls();

    if(errorEl){
        errorEl.textContent = msg;
        errorEl.classList.add("active");
    }
}

function clearLoginError(){

    const { errorEl } = getLoginEls();

    if(errorEl){
        errorEl.textContent = "";
        errorEl.classList.remove("active");
    }
}

function setMode(mode){

    currentMode = mode;

    const {
        fullNameGroup, subtitleEl, loginModeBtn,
        registerModeBtn, submitBtn
    } = getLoginEls();

    clearLoginError();

    if(mode === "register"){

        fullNameGroup.style.display = "block";
        subtitleEl.textContent =
            "Podaj imię i nazwisko, login oraz PIN, żeby założyć nowe konto.";

        loginModeBtn.classList.remove("active");
        registerModeBtn.classList.add("active");

        submitBtn.innerHTML =
            "<i class=\"fa-solid fa-user-plus\"></i> Załóż konto";

    }else{

        fullNameGroup.style.display = "none";
        subtitleEl.textContent =
            "Podaj swój login i PIN.";

        registerModeBtn.classList.remove("active");
        loginModeBtn.classList.add("active");

        submitBtn.innerHTML =
            "<i class=\"fa-solid fa-right-to-bracket\"></i> Zaloguj";
    }
}

function setSubmitLoading(loading){

    const { submitBtn } = getLoginEls();

    if(!submitBtn) return;

    submitBtn.disabled = loading;

    if(loading){

        submitBtn.innerHTML = "Proszę czekać...";

    }else if(currentMode === "register"){

        submitBtn.innerHTML =
            "<i class=\"fa-solid fa-user-plus\"></i> Załóż konto";

    }else{

        submitBtn.innerHTML =
            "<i class=\"fa-solid fa-right-to-bracket\"></i> Zaloguj";
    }
}

/* ======================================
   PODSTAWOWA OBSŁUGA INTERFEJSU
   (uruchamiana zawsze, niezależnie od tego
   czy Firebase się połączy)
====================================== */

const {
    fullNameInput, submitBtn, pinInput, usernameInput,
    loginModeBtn, registerModeBtn
} = getLoginEls();

if(pinInput){
    pinInput.addEventListener("keydown", (e)=>{
        if(e.key === "Enter") handleLoginSubmit();
    });
}

if(usernameInput){
    usernameInput.addEventListener("keydown", (e)=>{
        if(e.key === "Enter") pinInput.focus();
    });
}

if(fullNameInput){
    fullNameInput.addEventListener("keydown", (e)=>{
        if(e.key === "Enter") usernameInput.focus();
    });
}

if(loginModeBtn){
    loginModeBtn.addEventListener("click", ()=> setMode("login"));
}

if(registerModeBtn){
    registerModeBtn.addEventListener("click", ()=> setMode("register"));
}

if(submitBtn){
    submitBtn.addEventListener("click", handleLoginSubmit);
}

setMode("login");

const logoutBtn = document.getElementById("logoutBtn");

if(logoutBtn){
    logoutBtn.addEventListener("click", ()=>{

        if(confirm("Czy na pewno chcesz się wylogować?")){
            logout();
        }
    });
}

const closeAccountModalBtn = document.getElementById("closeAccountModal");

if(closeAccountModalBtn){
    closeAccountModalBtn.addEventListener("click", ()=>{
        document.getElementById("refereeModal").classList.remove("active");
    });
}

/* ======================================
   POŁĄCZENIE Z FIREBASE
   (osobno, żeby jego ewentualna awaria
   nie blokowała reszty interfejsu powyżej)
====================================== */

const firebaseConfig = {
    apiKey: "AIzaSyD-dvhk6UvwZ97uMdPPshLz0RO9Z7jGGPU",
    authDomain: "lzpn-ekwiwalenty.firebaseapp.com",
    projectId: "lzpn-ekwiwalenty",
    storageBucket: "lzpn-ekwiwalenty.firebasestorage.app",
    messagingSenderId: "567125368512",
    appId: "1:567125368512:web:d94276b2e81c5c1fb69725"
};

let db = null;
let firebaseReady = false;

try{

    if(typeof firebase === "undefined"){
        throw new Error("Firebase SDK nie został wczytany (zablokowany skrypt?).");
    }

    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    firebaseReady = true;

}catch(err){

    console.error("Nie udało się zainicjować Firebase:", err);
    firebaseReady = false;

    showLoginError(
        "Nie można połączyć się z serwerem logowania w tej przeglądarce. " +
        "Wyłącz blokowanie reklam/skryptów dla tej strony (może blokować firebasejs.com / gstatic.com) " +
        "albo spróbuj w innej przeglądarce."
    );

    if(submitBtn) submitBtn.disabled = true;
}

/* ======================================
   LOGOWANIE / REJESTRACJA
====================================== */

async function handleLoginSubmit(){

    if(!firebaseReady){
        showLoginError("Brak połączenia z serwerem logowania. Odśwież stronę lub spróbuj innej przeglądarki.");
        return;
    }

    const { fullNameInput, usernameInput, pinInput } = getLoginEls();

    const fullName = fullNameInput.value.trim();
    const username = sanitizeUsername(usernameInput.value);
    const pin = pinInput.value.trim();

    clearLoginError();

    if(!username || username.length < 3){
        showLoginError("Login musi mieć min. 3 znaki (litery/cyfry, bez polskich znaków i spacji).");
        return;
    }

    if(!/^\d{4,8}$/.test(pin)){
        showLoginError("PIN musi się składać z 4 do 8 cyfr.");
        return;
    }

    if(currentMode === "register" && (!fullName || fullName.length < 3)){
        showLoginError("Podaj imię i nazwisko.");
        return;
    }

    setSubmitLoading(true);

    try{

        const pinHash = await hashPin(pin, username);

        const docRef = db.collection("users").doc(username);
        const doc = await docRef.get();

        if(currentMode === "register"){

            if(doc.exists){

                showLoginError("Ten login jest już zajęty. Przełącz się na \"Mam konto\", żeby się zalogować.");
                setSubmitLoading(false);
                return;
            }

            await docRef.set({
                pinHash: pinHash,
                refereeName: fullName,
                matches: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        }else{

            if(!doc.exists){

                showLoginError("Nie ma takiego konta. Przełącz się na \"Zakładam konto\", żeby je utworzyć.");
                setSubmitLoading(false);
                return;
            }

            const data = doc.data();

            if(data.pinHash !== pinHash){

                showLoginError("Nieprawidłowy PIN dla tego loginu.");
                setSubmitLoading(false);
                return;
            }
        }

        localStorage.setItem(SESSION_KEY, username);
        currentUsername = username;

        await completeLogin(username);

    }catch(err){

        console.error(err);
        showLoginError("Błąd połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
        setSubmitLoading(false);
    }
}

async function completeLogin(username){

    let data = {};

    try{

        if(!firebaseReady){
            throw new Error("Firebase niedostępny");
        }

        const doc = await db.collection("users").doc(username).get();
        data = doc.data() || {};

        localStorage.setItem(
            LOCAL_CACHE_PREFIX + username,
            JSON.stringify(data.matches || [])
        );

    }catch(err){

        console.warn("Nie udało się pobrać danych z chmury, próbuję z pamięci lokalnej.", err);

        const cached = localStorage.getItem(LOCAL_CACHE_PREFIX + username);

        data = {
            matches: cached ? JSON.parse(cached) : [],
            refereeName: username
        };
    }

    window.LZPN_MATCHES_CACHE = data.matches || [];
    window.LZPN_REFEREE_NAME = data.refereeName || username;

    const { modal } = getLoginEls();
    if(modal) modal.classList.remove("active");

    const nameDisplay = document.getElementById("refereeNameDisplay");
    if(nameDisplay) nameDisplay.textContent = `Sędzia: ${window.LZPN_REFEREE_NAME}`;

    const badge = document.getElementById("currentUserBadge");
    if(badge) badge.textContent = `@${username}`;

    setSubmitLoading(false);

    if(readyCallback){
        readyCallback();
        readyCallback = null;
    }
}

function showLoginModal(){

    const { modal, fullNameInput, usernameInput } = getLoginEls();

    clearLoginError();

    if(modal){
        modal.classList.add("active");
        setTimeout(()=>{
            const target = currentMode === "register" ? fullNameInput : usernameInput;
            target && target.focus();
        }, 100);
    }
}

function logout(){

    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
}

async function trySessionRestore(){

    const saved = localStorage.getItem(SESSION_KEY);

    if(!saved){
        showLoginModal();
        return;
    }

    currentUsername = saved;
    await completeLogin(saved);
}

/* ======================================
   SYNCHRONIZACJA DANYCH
====================================== */

let syncTimeout = null;

async function syncMatchesToCloud(matches){

    if(!currentUsername) return;

    localStorage.setItem(
        LOCAL_CACHE_PREFIX + currentUsername,
        JSON.stringify(matches)
    );

    if(!firebaseReady) return;

    clearTimeout(syncTimeout);

    syncTimeout = setTimeout(async ()=>{

        try{

            await db.collection("users")
                .doc(currentUsername)
                .update({ matches: matches });

        }catch(err){

            console.warn("Nie udało się zsynchronizować z chmurą - dane zapisane lokalnie na tym urządzeniu.", err);
        }

    }, 400);
}

async function syncRefereeNameToCloud(name){

    if(!currentUsername || !firebaseReady) return;

    try{

        await db.collection("users")
            .doc(currentUsername)
            .update({ refereeName: name });

    }catch(err){

        console.warn("Nie udało się zsynchronizować imienia sędziego.", err);
    }
}

/* ======================================
   ZMIANA PIN / USUNIĘCIE KONTA
====================================== */

function getAccountDangerEls(){

    return {
        currentPinInput: document.getElementById("currentPinInput"),
        newPinInput: document.getElementById("newPinInput"),
        newPinConfirmInput: document.getElementById("newPinConfirmInput"),
        pinChangeError: document.getElementById("pinChangeError"),
        changePinBtn: document.getElementById("changePinBtn"),
        deleteAccountPinInput: document.getElementById("deleteAccountPinInput"),
        deleteAccountError: document.getElementById("deleteAccountError"),
        deleteAccountBtn: document.getElementById("deleteAccountBtn")
    };
}

function showFieldError(el, msg){
    if(el){
        el.textContent = msg;
        el.classList.add("active");
    }
}

function clearFieldError(el){
    if(el){
        el.textContent = "";
        el.classList.remove("active");
    }
}

async function handleChangePin(){

    const {
        currentPinInput, newPinInput, newPinConfirmInput,
        pinChangeError, changePinBtn
    } = getAccountDangerEls();

    clearFieldError(pinChangeError);

    if(!firebaseReady || !currentUsername){
        showFieldError(pinChangeError, "Brak połączenia z serwerem.");
        return;
    }

    const currentPin = currentPinInput.value.trim();
    const newPin = newPinInput.value.trim();
    const newPinConfirm = newPinConfirmInput.value.trim();

    if(!/^\d{4,8}$/.test(newPin)){
        showFieldError(pinChangeError, "Nowy PIN musi mieć 4-8 cyfr.");
        return;
    }

    if(newPin !== newPinConfirm){
        showFieldError(pinChangeError, "Nowe PIN-y nie są takie same.");
        return;
    }

    changePinBtn.disabled = true;
    changePinBtn.textContent = "Zmieniam...";

    try{

        const docRef = db.collection("users").doc(currentUsername);
        const doc = await docRef.get();
        const data = doc.data() || {};

        const currentHash = await hashPin(currentPin, currentUsername);

        if(data.pinHash !== currentHash){
            showFieldError(pinChangeError, "Aktualny PIN jest nieprawidłowy.");
            changePinBtn.disabled = false;
            changePinBtn.innerHTML = "<i class=\"fa-solid fa-key\"></i> Zmień PIN";
            return;
        }

        const newHash = await hashPin(newPin, currentUsername);

        await docRef.update({ pinHash: newHash });

        currentPinInput.value = "";
        newPinInput.value = "";
        newPinConfirmInput.value = "";

        showToastSafe("PIN zmieniony");

    }catch(err){

        console.error(err);
        showFieldError(pinChangeError, "Błąd połączenia. Spróbuj ponownie.");

    }finally{

        changePinBtn.disabled = false;
        changePinBtn.innerHTML = "<i class=\"fa-solid fa-key\"></i> Zmień PIN";
    }
}

async function handleDeleteAccount(){

    const {
        deleteAccountPinInput, deleteAccountError, deleteAccountBtn
    } = getAccountDangerEls();

    clearFieldError(deleteAccountError);

    if(!firebaseReady || !currentUsername){
        showFieldError(deleteAccountError, "Brak połączenia z serwerem.");
        return;
    }

    const pin = deleteAccountPinInput.value.trim();

    if(!/^\d{4,8}$/.test(pin)){
        showFieldError(deleteAccountError, "Podaj swój PIN (4-8 cyfr), żeby potwierdzić.");
        return;
    }

    const sure = confirm(
        "Czy na pewno chcesz trwale usunąć swoje konto i wszystkie zapisane mecze? Tej operacji nie można cofnąć."
    );

    if(!sure) return;

    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = "Usuwam...";

    try{

        const docRef = db.collection("users").doc(currentUsername);
        const doc = await docRef.get();
        const data = doc.data() || {};

        const hash = await hashPin(pin, currentUsername);

        if(data.pinHash !== hash){
            showFieldError(deleteAccountError, "Nieprawidłowy PIN.");
            deleteAccountBtn.disabled = false;
            deleteAccountBtn.innerHTML = "<i class=\"fa-solid fa-trash\"></i> Usuń konto na zawsze";
            return;
        }

        await docRef.delete();

        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(LOCAL_CACHE_PREFIX + currentUsername);

        window.location.reload();

    }catch(err){

        console.error(err);
        showFieldError(deleteAccountError, "Błąd połączenia. Spróbuj ponownie.");
        deleteAccountBtn.disabled = false;
        deleteAccountBtn.innerHTML = "<i class=\"fa-solid fa-trash\"></i> Usuń konto na zawsze";
    }
}

function showToastSafe(msg){

    if(typeof showToast === "function"){
        showToast(msg);
    }
}

const changePinBtnEl = document.getElementById("changePinBtn");
if(changePinBtnEl){
    changePinBtnEl.addEventListener("click", handleChangePin);
}

const deleteAccountBtnEl = document.getElementById("deleteAccountBtn");
if(deleteAccountBtnEl){
    deleteAccountBtnEl.addEventListener("click", handleDeleteAccount);
}

/* ======================================
   BLOKADA SCROLLA TŁA PRZY OTWARTYM MODALU
   (dotyczy wszystkich okienek: logowania,
   konta, dodawania meczu, widoku dnia)
====================================== */

function updateBodyScrollLock(){

    const anyModalActive =
        document.querySelector(".modal.active, .day-modal.active");

    document.body.classList.toggle(
        "modal-open",
        !!anyModalActive
    );
}

const modalScrollObserver =
    new MutationObserver(updateBodyScrollLock);

document
    .querySelectorAll(".modal, .day-modal")
    .forEach(el=>{

        modalScrollObserver.observe(el, {
            attributes: true,
            attributeFilter: ["class"]
        });
    });

updateBodyScrollLock();

/* ======================================
   PUBLICZNE API DLA script.js
====================================== */

window.LZPN_AUTH = {

    onReady: function(cb){
        readyCallback = cb;
        trySessionRestore();
    },

    getMatches: function(){
        return window.LZPN_MATCHES_CACHE || [];
    },

    saveMatches: function(matches){
        syncMatchesToCloud(matches);
    },

    getRefereeName: function(){
        return window.LZPN_REFEREE_NAME || "";
    },

    setRefereeName: function(name){
        window.LZPN_REFEREE_NAME = name;
        syncRefereeNameToCloud(name);
    },

    logout: logout,

    getUsername: function(){
        return currentUsername;
    }
};
