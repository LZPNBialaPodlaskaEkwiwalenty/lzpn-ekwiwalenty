/* ======================================
   LZPN - KALKULATOR SĘDZIOWSKI
   AUTH.JS - logowanie (login + PIN)
   i synchronizacja danych w chmurze (Firebase)
====================================== */

const LOCAL_CACHE_PREFIX = "lzpn_cache_";
const EMAIL_DOMAIN = "lzpn-ekwiwalenty.local";
const SESSION_STARTED_KEY = "lzpn_session_started_at";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

let currentUsername = null;
let currentUserUid = null;
let readyCallback = null;
let currentMode = "login";
let handlingExplicitAuth = false;

/* ======================================
   NARZĘDZIA
====================================== */

async function lookupEmailForUsername(username){

    try{
        const doc = await db.collection("usernames").doc(username).get();
        if(doc.exists && doc.data().email) return doc.data().email;
    }catch(e){
        console.warn("Nie udało się znaleźć e-maila dla loginu.", e);
    }

    return null;
}

function isSyntheticEmail(email){
    return typeof email === "string" && email.endsWith("@" + EMAIL_DOMAIN);
}

function escapeHtml(str){

    if(str === null || str === undefined) return "";

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

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
        emailGroup: document.getElementById("emailGroup"),
        emailInput: document.getElementById("loginEmail"),
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
        fullNameGroup, emailGroup, subtitleEl, loginModeBtn,
        registerModeBtn, submitBtn
    } = getLoginEls();

    clearLoginError();

    if(mode === "register"){

        fullNameGroup.style.display = "block";
        emailGroup.style.display = "block";
        subtitleEl.textContent =
            "Podaj imię i nazwisko, e-mail, login oraz PIN, żeby założyć nowe konto.";

        loginModeBtn.classList.remove("active");
        registerModeBtn.classList.add("active");

        submitBtn.innerHTML =
            "<i class=\"fa-solid fa-user-plus\"></i> Załóż konto";

        const usernameLabel = document.getElementById("loginUsernameLabel");
        if(usernameLabel) usernameLabel.textContent = "Login";

    }else{

        fullNameGroup.style.display = "none";
        emailGroup.style.display = "none";
        subtitleEl.textContent =
            "Podaj swój login (lub e-mail) i PIN.";

        registerModeBtn.classList.remove("active");
        loginModeBtn.classList.add("active");

        submitBtn.innerHTML =
            "<i class=\"fa-solid fa-right-to-bracket\"></i> Zaloguj";

        const usernameLabel = document.getElementById("loginUsernameLabel");
        if(usernameLabel) usernameLabel.textContent = "Login lub e-mail";
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

const forgotPinBtn = document.getElementById("forgotPinBtn");
if(forgotPinBtn){
    forgotPinBtn.addEventListener("click", handleForgotPin);
}

setMode("login");

/* ======================================
   LOSOWE PRZYKŁADOWE DANE W PLACEHOLDERACH
====================================== */

const SAMPLE_FIRST_NAMES = [
    "Michał", "Paweł", "Tomasz", "Krzysztof", "Adam",
    "Piotr", "Marcin", "Jakub", "Łukasz", "Wojciech"
];

const SAMPLE_LAST_NAMES = [
    "Kowalski", "Nowak", "Wiśniewski", "Wójcik", "Kamiński",
    "Lewandowski", "Zieliński", "Dąbrowski", "Kozłowski", "Jankowski"
];

function setRandomLoginPlaceholders(){

    const firstName = SAMPLE_FIRST_NAMES[
        Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)
    ];

    const lastName = SAMPLE_LAST_NAMES[
        Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)
    ];

    const sampleUsername = sanitizeUsername(
        firstName.charAt(0) + lastName
    );

    const { fullNameInput: fnInput, usernameInput: unInput } = getLoginEls();

    if(fnInput) fnInput.placeholder = `np. ${firstName} ${lastName}`;
    if(unInput) unInput.placeholder = `np. ${sampleUsername}`;
}

setRandomLoginPlaceholders();

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
    apiKey: "AIzaSyAUmoa2XgFKqIp9k72rrbryelyqohRtJqw",
    authDomain: "lzpn-ekwiwalenty-2.firebaseapp.com",
    projectId: "lzpn-ekwiwalenty-2",
    storageBucket: "lzpn-ekwiwalenty-2.firebasestorage.app",
    messagingSenderId: "987798846510",
    appId: "1:987798846510:web:c36125fc994e4f7935b3bf"
};

let db = null;
let auth = null;
let firebaseReady = false;

try{

    if(typeof firebase === "undefined"){
        throw new Error("Firebase SDK nie został wczytany (zablokowany skrypt?).");
    }

    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    auth = firebase.auth();
    firebaseReady = true;

    auth.onAuthStateChanged(async (user)=>{

        if(handlingExplicitAuth) return;

        if(user){

            const storedRaw = localStorage.getItem(SESSION_STARTED_KEY);

            if(!storedRaw){

                localStorage.setItem(SESSION_STARTED_KEY, Date.now().toString());
                await completeLogin(user);

            }else{

                const age = Date.now() - parseInt(storedRaw, 10);

                if(age > SESSION_MAX_AGE_MS){

                    localStorage.removeItem(SESSION_STARTED_KEY);
                    await auth.signOut();

                }else{

                    await completeLogin(user);
                }
            }

        }else{
            showLoginModal();
        }
    });

}catch(err){

    console.error("Nie udało się zainicjować Firebase:", err);
    firebaseReady = false;

    showLoginError(
        "Nie można połączyć się z serwerem logowania w tej przeglądarce. " +
        "Wyłącz blokowanie reklam/skryptów dla tej strony (może blokować firebasejs.com / gstatic.com) " +
        "albo spróbuj w innej przeglądarce."
    );

    if(submitBtn) submitBtn.disabled = true;

    hideLoadingOverlay();
    showLoginModal();
}

/* ======================================
   LOGOWANIE / REJESTRACJA
====================================== */

async function handleLoginSubmit(){

    if(!firebaseReady){
        showLoginError("Brak połączenia z serwerem logowania. Odśwież stronę lub spróbuj innej przeglądarki.");
        return;
    }

    const { fullNameInput, emailInput, usernameInput, pinInput } = getLoginEls();

    const fullName = fullNameInput.value.trim();
    const rawEmail = emailInput.value.trim();
    const rawUsername = usernameInput.value.trim();
    const username = sanitizeUsername(usernameInput.value);
    const pin = pinInput.value.trim();

    clearLoginError();

    if(currentMode === "register" && rawUsername.includes("@")){
        showLoginError("W polu \"Login\" wpisz krótką nazwę użytkownika (np. jkowalski), nie e-mail. Adres e-mail wpisz w polu \"E-mail\" powyżej.");
        return;
    }

    if(!username || username.length < 3){
        showLoginError("Login musi mieć min. 3 znaki (litery/cyfry, bez polskich znaków i spacji).");
        return;
    }

    if(currentMode === "register"){

        if(pin.length < 4){
            showLoginError("PIN/hasło musi mieć min. 4 znaki.");
            return;
        }

        if(!fullName || fullName.length < 3){
            showLoginError("Podaj imię i nazwisko.");
            return;
        }

        if(rawEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)){
            showLoginError("Podaj prawidłowy adres e-mail albo zostaw pole puste.");
            return;
        }

    }else{

        if(pin.length < 6){
            showLoginError("PIN/hasło musi mieć min. 6 znaków.");
            return;
        }
    }

    setSubmitLoading(true);
    handlingExplicitAuth = true;

    try{

        if(currentMode === "register"){

            let migratedMatches = null;
            let migratedRefereeName = null;
            let oldDocRef = null;

            try{

                oldDocRef = db.collection("users").doc(username);
                const oldDoc = await oldDocRef.get();

                if(oldDoc.exists && oldDoc.data().pinHash){

                    const oldHash = await hashPin(pin, username);

                    if(oldDoc.data().pinHash === oldHash){

                        migratedMatches = oldDoc.data().matches || [];
                        migratedRefereeName = oldDoc.data().refereeName || fullName;

                    }else{

                        showLoginError("Ten login już istnieje ze starszej wersji logowania - podany PIN się nie zgadza. Wpisz swój dotychczasowy PIN, żeby bezpiecznie przenieść konto.");
                        setSubmitLoading(false);
                        handlingExplicitAuth = false;
                        return;
                    }
                }

            }catch(e){
                console.warn("Nie udało się sprawdzić starego konta.", e);
            }

            let finalPin = pin;

            if(migratedMatches !== null && finalPin.length < 6){

                const newPin = prompt(
                    "Twoje dotychczasowe konto zostało znalezione, ale ten PIN jest za krótki dla nowego, bezpieczniejszego logowania (min. 6 znaków). Podaj nowy PIN/hasło, którego chcesz używać od teraz:"
                );

                if(!newPin || newPin.length < 6){
                    showLoginError("Migracja przerwana - nowy PIN/hasło musi mieć min. 6 znaków.");
                    setSubmitLoading(false);
                    handlingExplicitAuth = false;
                    return;
                }

                finalPin = newPin;

            }else if(migratedMatches === null && finalPin.length < 6){

                showLoginError("PIN/hasło musi mieć min. 6 znaków.");
                setSubmitLoading(false);
                handlingExplicitAuth = false;
                return;
            }

            let cred;
            const finalEmail = rawEmail || (username + "@" + EMAIL_DOMAIN);

            try{

                cred = await auth.createUserWithEmailAndPassword(finalEmail, finalPin);

            }catch(err){

                if(err.code === "auth/email-already-in-use"){
                    showLoginError("Ten e-mail jest już powiązany z innym kontem.");
                }else if(err.code === "auth/weak-password"){
                    showLoginError("PIN/hasło jest za krótkie (min. 6 znaków).");
                }else if(err.code === "auth/invalid-email"){
                    showLoginError("Podaj prawidłowy adres e-mail.");
                }else{
                    showLoginError("Błąd połączenia z serwerem. Spróbuj ponownie.");
                }

                setSubmitLoading(false);
                handlingExplicitAuth = false;
                return;
            }

            const usernameDocRef = db.collection("usernames").doc(username);
            const usernameDoc = await usernameDocRef.get();

            if(usernameDoc.exists){

                showLoginError("Ten login jest już zajęty. Przełącz się na \"Mam konto\", żeby się zalogować.");

                try{ await cred.user.delete(); }catch(e){}

                setSubmitLoading(false);
                handlingExplicitAuth = false;
                return;
            }

            await usernameDocRef.set({
                email: finalEmail,
                uid: cred.user.uid
            });

            await db.collection("users").doc(cred.user.uid).set({
                username: username,
                refereeName: migratedRefereeName || fullName,
                email: finalEmail,
                matches: migratedMatches || [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            if(migratedMatches !== null && oldDocRef){

                try{
                    await oldDocRef.delete();
                }catch(e){
                    console.warn("Nie udało się usunąć starego konta po migracji.", e);
                }
            }

            localStorage.setItem(SESSION_STARTED_KEY, Date.now().toString());
            await completeLogin(cred.user);

        }else{

            try{

                const rawLoginInput = usernameInput.value.trim();

                let foundEmail = rawLoginInput.includes("@")
                    ? rawLoginInput
                    : await lookupEmailForUsername(username);

                if(!foundEmail){

                    const legacyDoc = await db.collection("users").doc(username).get();
                    const legacyExists = legacyDoc.exists && !!legacyDoc.data().pinHash;

                    if(legacyExists){
                        showLoginError("To konto działa jeszcze na starym systemie logowania. Przełącz się na \"Zakładam konto\" i zaloguj się tym samym loginem i PIN-em, żeby bezpiecznie przenieść dane.");
                    }else{
                        showLoginError("Nie ma takiego konta.");
                    }

                    setSubmitLoading(false);
                    handlingExplicitAuth = false;
                    return;
                }

                const cred = await auth.signInWithEmailAndPassword(foundEmail, pin);
                localStorage.setItem(SESSION_STARTED_KEY, Date.now().toString());
                await completeLogin(cred.user);

            }catch(err){

                if(
                    err.code === "auth/user-not-found" ||
                    err.code === "auth/wrong-password" ||
                    err.code === "auth/invalid-credential"
                ){
                    showLoginError("Nie ma takiego konta lub PIN jest nieprawidłowy.");
                }else{
                    showLoginError("Błąd połączenia z serwerem. Spróbuj ponownie.");
                }

                setSubmitLoading(false);
            }
        }

    }catch(err){

        console.error(err);
        showLoginError("Błąd połączenia z serwerem. Sprawdź internet i spróbuj ponownie.");
        setSubmitLoading(false);

    }finally{

        handlingExplicitAuth = false;
    }
}

async function completeLogin(user){

    currentUserUid = user.uid;

    let data = {};

    try{

        const doc = await db.collection("users").doc(user.uid).get();
        data = doc.data() || {};

        localStorage.setItem(
            LOCAL_CACHE_PREFIX + user.uid,
            JSON.stringify(data.matches || [])
        );

    }catch(err){

        console.warn("Nie udało się pobrać danych z chmury, próbuję z pamięci lokalnej.", err);

        const cached = localStorage.getItem(LOCAL_CACHE_PREFIX + user.uid);

        data = {
            matches: cached ? JSON.parse(cached) : []
        };
    }

    currentUsername = data.username || "";

    window.LZPN_MATCHES_CACHE = data.matches || [];
    window.LZPN_REFEREE_NAME = data.refereeName || currentUsername || "Sędzia";

    if(firebaseReady){

        db.collection("users").doc(user.uid).update({
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(err=>{
            console.warn("Nie udało się zapisać czasu logowania.", err);
        });

        if(currentUsername){

            db.collection("usernames").doc(currentUsername).get().then(unameDoc=>{

                if(!unameDoc.exists){

                    db.collection("usernames").doc(currentUsername).set({
                        email: user.email,
                        uid: user.uid
                    }).catch(err=>{
                        console.warn("Nie udało się zapisać mapowania loginu.", err);
                    });

                }else if(unameDoc.data().email !== user.email){

                    db.collection("usernames").doc(currentUsername).set({
                        email: user.email,
                        uid: user.uid
                    }).catch(err=>{
                        console.warn("Nie udało się zaktualizować mapowania loginu.", err);
                    });
                }

            }).catch(err=>{
                console.warn("Nie udało się sprawdzić mapowania loginu.", err);
            });

            if(data.email !== user.email){

                db.collection("users").doc(user.uid).update({
                    email: user.email
                }).catch(err=>{
                    console.warn("Nie udało się zaktualizować e-maila w profilu.", err);
                });
            }
        }
    }

    const { modal } = getLoginEls();
    if(modal) modal.classList.remove("active");

    const nameDisplay = document.getElementById("refereeNameDisplay");
    if(nameDisplay) nameDisplay.textContent = `Sędzia: ${window.LZPN_REFEREE_NAME}`;

    const badge = document.getElementById("currentUserBadge");
    if(badge) badge.textContent = `@${currentUsername}`;

    if(currentUsername === ADMIN_USERNAME){
        const usersBtn = document.getElementById("adminUsersPageBtn");
        if(usersBtn) usersBtn.style.display = "inline-flex";
    }

    hideLoadingOverlay();

    setSubmitLoading(false);

    loadTeamsFromCloud();

    if(readyCallback){
        readyCallback();
        readyCallback = null;
    }
}

async function handleForgotPin(){

    if(!firebaseReady){
        alert("Brak połączenia z serwerem. Spróbuj ponownie później.");
        return;
    }

    const username = sanitizeUsername(
        prompt("Podaj swój login, żeby otrzymać link do zresetowania PIN-u:") || ""
    );

    if(!username) return;

    try{

        const email = await lookupEmailForUsername(username);

        if(!email){
            alert("Nie znaleziono konta o takim loginie.");
            return;
        }

        if(isSyntheticEmail(email)){
            alert(
                "To konto nie ma jeszcze zapisanego prawdziwego adresu e-mail, więc nie możemy wysłać linku resetującego. " +
                "Zaloguj się normalnie i w sekcji \"Konto\" dopisz swój e-mail, żeby ta opcja zadziałała w przyszłości."
            );
            return;
        }

        await auth.sendPasswordResetEmail(email);

        alert(`Wysłaliśmy link do zresetowania PIN-u na adres ${email}. Sprawdź skrzynkę (także SPAM).`);

    }catch(err){

        console.error(err);
        alert("Nie udało się wysłać linku resetującego. Spróbuj ponownie później.");
    }
}

function showLoginModal(){

    hideLoadingOverlay();

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

function hideLoadingOverlay(){

    const el = document.getElementById("appLoadingOverlay");
    if(el) el.classList.remove("active");
}

async function logout(){

    localStorage.removeItem(SESSION_STARTED_KEY);

    try{
        if(auth) await auth.signOut();
    }catch(e){
        console.warn(e);
    }

    window.location.reload();
}

/* ======================================
   SYNCHRONIZACJA DANYCH
====================================== */

let syncTimeout = null;

async function syncMatchesToCloud(matches){

    if(!currentUserUid) return;

    localStorage.setItem(
        LOCAL_CACHE_PREFIX + currentUserUid,
        JSON.stringify(matches)
    );

    if(!firebaseReady) return;

    clearTimeout(syncTimeout);

    syncTimeout = setTimeout(async ()=>{

        try{

            await db.collection("users")
                .doc(currentUserUid)
                .update({ matches: matches });

        }catch(err){

            console.warn("Nie udało się zsynchronizować z chmurą - dane zapisane lokalnie na tym urządzeniu.", err);
        }

    }, 400);
}

async function syncRefereeNameToCloud(name){

    if(!currentUserUid || !firebaseReady) return;

    try{

        await db.collection("users")
            .doc(currentUserUid)
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

    const user = auth ? auth.currentUser : null;

    if(!firebaseReady || !user){
        showFieldError(pinChangeError, "Brak połączenia z serwerem.");
        return;
    }

    const currentPin = currentPinInput.value.trim();
    const newPin = newPinInput.value.trim();
    const newPinConfirm = newPinConfirmInput.value.trim();

    if(newPin.length < 6){
        showFieldError(pinChangeError, "Nowy PIN/hasło musi mieć min. 6 znaków.");
        return;
    }

    if(newPin !== newPinConfirm){
        showFieldError(pinChangeError, "Nowe PIN-y nie są takie same.");
        return;
    }

    changePinBtn.disabled = true;
    changePinBtn.textContent = "Zmieniam...";

    try{

        const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPin);

        await user.reauthenticateWithCredential(cred);
        await user.updatePassword(newPin);

        currentPinInput.value = "";
        newPinInput.value = "";
        newPinConfirmInput.value = "";

        showToastSafe("PIN zmieniony");

    }catch(err){

        console.error(err);

        if(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"){
            showFieldError(pinChangeError, "Aktualny PIN jest nieprawidłowy.");
        }else{
            showFieldError(pinChangeError, "Błąd połączenia. Spróbuj ponownie.");
        }

    }finally{

        changePinBtn.disabled = false;
        changePinBtn.innerHTML = "<i class=\"fa-solid fa-key\"></i> Zmień PIN";
    }
}

async function populateAccountProfileSummary(){

    const nameEl = document.getElementById("accountProfileName");
    const loginEl = document.getElementById("accountProfileLogin");
    const emailEl = document.getElementById("accountProfileEmail");
    const sinceEl = document.getElementById("accountProfileSince");

    if(!nameEl) return;

    nameEl.textContent = window.LZPN_REFEREE_NAME || "Sędzia";
    loginEl.textContent = currentUsername ? `@${currentUsername}` : "—";
    emailEl.textContent = "Wczytywanie...";
    sinceEl.textContent = "Konto od: —";

    if(!firebaseReady || !currentUserUid) return;

    try{

        const doc = await db.collection("users").doc(currentUserUid).get();
        const data = doc.data() || {};

        const email = data.email;
        emailEl.textContent = (email && !isSyntheticEmail(email))
            ? email
            : "Brak zapisanego e-maila";

        if(data.createdAt && typeof data.createdAt.toDate === "function"){
            sinceEl.textContent = `Konto od: ${data.createdAt.toDate().toLocaleDateString("pl-PL")}`;
        }else{
            sinceEl.textContent = "Konto od: —";
        }

    }catch(err){
        console.warn("Nie udało się wczytać danych profilu.", err);
        emailEl.textContent = "Błąd wczytywania";
    }
}

window.LZPN_POPULATE_ACCOUNT_SUMMARY = populateAccountProfileSummary;

async function handleSaveAccountEmail(){

    const input = document.getElementById("accountEmailInput");
    const errorEl = document.getElementById("accountEmailError");
    const btn = document.getElementById("saveAccountEmailBtn");

    clearFieldError(errorEl);

    const user = auth ? auth.currentUser : null;

    if(!firebaseReady || !user){
        showFieldError(errorEl, "Brak połączenia z serwerem.");
        return;
    }

    const newEmail = input.value.trim();

    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)){
        showFieldError(errorEl, "Podaj prawidłowy adres e-mail.");
        return;
    }

    const currentPin = prompt("Podaj swój obecny PIN/hasło, żeby potwierdzić zmianę e-maila:");

    if(!currentPin) return;

    btn.disabled = true;
    btn.textContent = "Zapisuję...";

    try{

        const cred = firebase.auth.EmailAuthProvider.credential(user.email, currentPin);
        await user.reauthenticateWithCredential(cred);

        await user.verifyBeforeUpdateEmail(newEmail);

        showToastSafe("Wysłaliśmy link weryfikacyjny na nowy adres");
        alert(
            `Sprawdź skrzynkę ${newEmail} i kliknij link weryfikacyjny, żeby dokończyć zmianę e-maila. ` +
            "Twój login i PIN pozostają bez zmian - e-mail w aplikacji zaktualizuje się automatycznie po weryfikacji, przy najbliższym logowaniu."
        );
        input.value = "";

    }catch(err){

        console.error(err);

        if(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"){
            showFieldError(errorEl, "Nieprawidłowy PIN.");
        }else if(err.code === "auth/email-already-in-use"){
            showFieldError(errorEl, "Ten e-mail jest już używany przez inne konto.");
        }else if(err.code === "auth/invalid-email"){
            showFieldError(errorEl, "Nieprawidłowy adres e-mail.");
        }else{
            showFieldError(errorEl, "Błąd połączenia. Spróbuj ponownie.");
        }

    }finally{

        btn.disabled = false;
        btn.textContent = "Zapisz e-mail";
    }
}

const saveAccountEmailBtn = document.getElementById("saveAccountEmailBtn");
if(saveAccountEmailBtn){
    saveAccountEmailBtn.addEventListener("click", handleSaveAccountEmail);
}

async function handleDeleteAccount(){

    const {
        deleteAccountPinInput, deleteAccountError, deleteAccountBtn
    } = getAccountDangerEls();

    clearFieldError(deleteAccountError);

    const user = auth ? auth.currentUser : null;

    if(!firebaseReady || !user){
        showFieldError(deleteAccountError, "Brak połączenia z serwerem.");
        return;
    }

    const pin = deleteAccountPinInput.value.trim();

    if(!pin){
        showFieldError(deleteAccountError, "Podaj swój PIN, żeby potwierdzić.");
        return;
    }

    const sure = confirm(
        "Czy na pewno chcesz trwale usunąć swoje konto i wszystkie zapisane mecze? Tej operacji nie można cofnąć."
    );

    if(!sure) return;

    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = "Usuwam...";

    try{

        const cred = firebase.auth.EmailAuthProvider.credential(user.email, pin);

        await user.reauthenticateWithCredential(cred);

        await db.collection("users").doc(user.uid).delete();

        if(currentUsername){
            try{
                await db.collection("usernames").doc(currentUsername).delete();
            }catch(e){
                console.warn("Nie udało się usunąć mapowania loginu.", e);
            }
        }

        await user.delete();

        localStorage.removeItem(LOCAL_CACHE_PREFIX + user.uid);
        localStorage.removeItem(SESSION_STARTED_KEY);

        window.location.reload();

    }catch(err){

        console.error(err);

        if(err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"){
            showFieldError(deleteAccountError, "Nieprawidłowy PIN.");
        }else{
            showFieldError(deleteAccountError, "Błąd połączenia. Spróbuj ponownie.");
        }

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
   BANER BRAKU INTERNETU
====================================== */

function updateOfflineBanner(){

    const banner = document.getElementById("offlineBanner");
    if(!banner) return;

    banner.classList.toggle("active", !navigator.onLine);
}

window.addEventListener("online", updateOfflineBanner);
window.addEventListener("offline", updateOfflineBanner);

updateOfflineBanner();

/* ======================================
   BANER INSTALACJI "JAK APLIKACJA"
====================================== */

const INSTALL_DISMISS_KEY = "lzpn_install_banner_dismissed";

function isRunningStandalone(){

    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true
    );
}

function isIOSDevice(){

    return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

let deferredInstallPrompt = null;

function maybeShowInstallBanner(){

    const banner = document.getElementById("installBanner");
    if(!banner) return;

    if(isRunningStandalone()) return;
    if(localStorage.getItem(INSTALL_DISMISS_KEY)) return;

    if(isIOSDevice()){

        document.getElementById("installBannerText").textContent =
            "Dodaj tę stronę do ekranu głównego: w Safari stuknij \"Udostępnij\", a potem \"Dodaj do ekranu początkowego\".";

    }

    banner.classList.add("active");
}

window.addEventListener("beforeinstallprompt", (e)=>{

    e.preventDefault();
    deferredInstallPrompt = e;

    const actionBtn = document.getElementById("installBannerActionBtn");
    if(actionBtn) actionBtn.style.display = "inline-flex";

    maybeShowInstallBanner();
});

const installActionBtn = document.getElementById("installBannerActionBtn");

if(installActionBtn){
    installActionBtn.addEventListener("click", async ()=>{

        if(!deferredInstallPrompt) return;

        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;

        document.getElementById("installBanner").classList.remove("active");
    });
}

const installCloseBtn = document.getElementById("installBannerCloseBtn");

if(installCloseBtn){
    installCloseBtn.addEventListener("click", ()=>{

        localStorage.setItem(INSTALL_DISMISS_KEY, "1");
        document.getElementById("installBanner").classList.remove("active");
    });
}

if(isIOSDevice()){
    maybeShowInstallBanner();
}

/* ======================================
   PUBLICZNE API DLA script.js
====================================== */

async function addNamesToApprovedTeams(names){

    if(!firebaseReady) return [];
    if(!names || names.length === 0) return [];

    const cleaned = names
        .map(n => (n || "").trim())
        .filter(n => n.length > 0);

    if(cleaned.length === 0) return [];

    try{

        const docRef = db.collection(TEAMS_DOC_PATH[0]).doc(TEAMS_DOC_PATH[1]);
        const doc = await docRef.get();
        const existing = (doc.data() && doc.data().approved) || [];

        const existingLower = new Set(existing.map(n => n.toLowerCase()));

        const trulyNew = [];
        const seenLower = new Set();

        cleaned.forEach(name=>{

            const lower = name.toLowerCase();

            if(!existingLower.has(lower) && !seenLower.has(lower)){
                trulyNew.push(name);
                seenLower.add(lower);
            }
        });

        if(trulyNew.length === 0) return [];

        await docRef.set({
            approved: firebase.firestore.FieldValue.arrayUnion(...trulyNew)
        }, { merge: true });

        if(typeof window.LZPN_ADD_TEAMS === "function"){
            window.LZPN_ADD_TEAMS(trulyNew);
        }

        return trulyNew;

    }catch(err){

        console.warn("Nie udało się dopisać drużyn do bazy.", err);
        return [];
    }
}

async function addTeamsToDbSilently(names){
    await addNamesToApprovedTeams(names);
}

window.LZPN_ADD_TEAMS_TO_DB = addTeamsToDbSilently;

window.LZPN_AUTH = {

    onReady: function(cb){
        readyCallback = cb;
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

/* ======================================
   DRUŻYNY: ZGŁASZANIE I AKCEPTACJA
====================================== */

const ADMIN_USERNAME = "bzabielski";
const TEAMS_DOC_PATH = ["teams", "data"];

async function loadTeamsFromCloud(){

    if(!firebaseReady) return;

    try{

        const docRef = db.collection(TEAMS_DOC_PATH[0]).doc(TEAMS_DOC_PATH[1]);
        const doc = await docRef.get();

        if(!doc.exists){

            const seed = window.LZPN_DEFAULT_TEAMS || [];

            await docRef.set({ approved: seed, pending: [] });

            if(currentUsername === ADMIN_USERNAME){
                renderAdminTeamsSection([]);
                document.getElementById("adminTeamsPageBtn").style.display = "inline-flex";
            }

            return;
        }

        const data = doc.data() || {};

        if(typeof window.LZPN_SET_TEAMS === "function"){
            window.LZPN_SET_TEAMS(data.approved || []);
        }

        if(currentUsername === ADMIN_USERNAME){
            renderAdminTeamsSection(data.pending || []);
            document.getElementById("adminTeamsPageBtn").style.display = "inline-flex";
        }

    }catch(err){

        console.warn("Nie udało się wczytać listy drużyn z chmury.", err);
    }
}

async function submitTeamProposal(){

    if(!firebaseReady || !currentUsername){
        alert("Brak połączenia z serwerem. Spróbuj ponownie później.");
        return;
    }

    const name = prompt(
        "Podaj pełną nazwę drużyny, której brakuje na liście:"
    );

    if(!name) return;

    const trimmed = name.trim();

    if(trimmed.length < 3){
        alert("Nazwa drużyny jest za krótka.");
        return;
    }

    try{

        const docRef = db.collection(TEAMS_DOC_PATH[0]).doc(TEAMS_DOC_PATH[1]);

        await docRef.set({
            pending: firebase.firestore.FieldValue.arrayUnion({
                name: trimmed,
                by: currentUsername,
                at: Date.now()
            })
        }, { merge: true });

        showToastSafe("Zgłoszenie wysłane - czeka na akceptację");

    }catch(err){

        console.error(err);
        alert("Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
    }
}

const reportMissingTeamBtn = document.getElementById("reportMissingTeamBtn");

if(reportMissingTeamBtn){
    reportMissingTeamBtn.addEventListener("click", submitTeamProposal);
}

function renderAdminTeamsSection(pending){

    const section = document.getElementById("adminTeamsSection");
    const list = document.getElementById("pendingTeamsList");

    if(!section || !list) return;

    section.style.display = "block";

    if(!pending || pending.length === 0){

        list.innerHTML = "<p class=\"pending-teams-empty\">Brak nowych zgłoszeń.</p>";
        return;
    }

    list.innerHTML = "";

    pending.forEach((item)=>{

        const row = document.createElement("div");
        row.className = "pending-team-item";

        const date = item.at
            ? new Date(item.at).toLocaleDateString("pl-PL")
            : "";

        row.innerHTML = `
            <span class="pending-team-name">
                ${escapeHtml(item.name)}
                <span class="pending-team-meta">zgłosił: ${escapeHtml(item.by) || "?"} ${date ? "- " + date : ""}</span>
            </span>
            <span class="pending-team-actions">
                <button type="button" class="approve-team-btn">Akceptuj</button>
                <button type="button" class="reject-team-btn">Odrzuć</button>
            </span>
        `;

        row.querySelector(".approve-team-btn")
            .addEventListener("click", ()=> handleTeamDecision(item, true));

        row.querySelector(".reject-team-btn")
            .addEventListener("click", ()=> handleTeamDecision(item, false));

        list.appendChild(row);
    });
}

async function handleTeamDecision(item, approve){

    if(!firebaseReady) return;

    try{

        const docRef = db.collection(TEAMS_DOC_PATH[0]).doc(TEAMS_DOC_PATH[1]);

        await docRef.update({
            pending: firebase.firestore.FieldValue.arrayRemove(item)
        });

        if(approve){
            await addNamesToApprovedTeams([item.name]);
        }

        showToastSafe(approve ? "Drużyna dodana do listy" : "Zgłoszenie odrzucone");

        loadTeamsFromCloud();

    }catch(err){

        console.error(err);
        alert("Nie udało się zapisać decyzji. Spróbuj ponownie.");
    }
}

/* ======================================
   PEŁNA BAZA DRUŻYN (ADMIN)
====================================== */

let teamsAdminCache = [];

function sortTeamsPL(list){

    return list.slice().sort((a,b)=> a.localeCompare(b, "pl"));
}

function renderTeamsAdminList(filterText){

    const listEl = document.getElementById("teamsAdminList");
    const countEl = document.getElementById("teamsAdminCount");

    if(!listEl) return;

    const filter = (filterText || "").trim().toLowerCase();

    const filtered = filterText
        ? teamsAdminCache.filter(name => name.toLowerCase().includes(filter))
        : teamsAdminCache;

    const sorted = sortTeamsPL(filtered);

    countEl.textContent =
        `${sorted.length} z ${teamsAdminCache.length} drużyn`;

    if(sorted.length === 0){
        listEl.innerHTML = "<p class=\"pending-teams-empty\">Brak wyników.</p>";
        return;
    }

    listEl.innerHTML = "";

    sorted.forEach(name=>{

        const row = document.createElement("div");
        row.className = "teams-admin-item";

        row.innerHTML = `
            <span>${escapeHtml(name)}</span>
            <button type="button" aria-label="Usuń drużynę ${escapeHtml(name)}">
                <i class="fa-solid fa-trash"></i>
            </button>
        `;

        row.querySelector("button")
            .addEventListener("click", ()=> deleteTeamFromDb(name));

        listEl.appendChild(row);
    });
}

async function openTeamsAdminModal(){

    if(!firebaseReady) return;

    const modal = document.getElementById("teamsAdminModal");
    if(modal) modal.classList.add("active");

    document.getElementById("teamsAdminSearch").value = "";

    document.getElementById("teamsAdminCount").textContent = "Wczytywanie...";
    document.getElementById("teamsAdminList").innerHTML = "";

    try{

        const docRef = db.collection(TEAMS_DOC_PATH[0]).doc(TEAMS_DOC_PATH[1]);
        const doc = await docRef.get();
        const data = doc.data() || {};

        teamsAdminCache = data.approved || [];

        renderTeamsAdminList("");

    }catch(err){

        console.error(err);
        document.getElementById("teamsAdminCount").textContent =
            "Błąd wczytywania listy.";
    }
}

async function restoreDefaultTeams(){

    const defaults = window.LZPN_DEFAULT_TEAMS || [];

    if(defaults.length === 0){
        alert("Brak wbudowanej listy do przywrócenia.");
        return;
    }

    const sure = confirm(
        `Dodać z powrotem ${defaults.length} wbudowanych drużyn do bazy? Obecne wpisy zostaną zachowane.`
    );

    if(!sure) return;

    try{

        await addNamesToApprovedTeams(defaults);

        const docRef = db.collection(TEAMS_DOC_PATH[0]).doc(TEAMS_DOC_PATH[1]);
        const doc = await docRef.get();
        const data = doc.data() || {};

        teamsAdminCache = data.approved || [];

        renderTeamsAdminList(document.getElementById("teamsAdminSearch").value);

        if(typeof window.LZPN_SET_TEAMS === "function"){
            window.LZPN_SET_TEAMS(teamsAdminCache);
        }

        showToastSafe("Wbudowana lista przywrócona");

    }catch(err){

        console.error(err);
        alert("Nie udało się przywrócić listy. Spróbuj ponownie.");
    }
}

async function addTeamToDb(){

    const input = document.getElementById("teamsAdminNewName");
    const name = input.value.trim();

    if(name.length < 3){
        alert("Nazwa drużyny jest za krótka.");
        return;
    }

    const nameLower = name.toLowerCase();

    if(teamsAdminCache.some(t => t.toLowerCase() === nameLower)){
        alert("Ta drużyna już jest w bazie.");
        return;
    }

    try{

        const added = await addNamesToApprovedTeams([name]);

        if(added.length === 0){
            alert("Ta drużyna już jest w bazie.");
            return;
        }

        teamsAdminCache.push(name);
        input.value = "";

        renderTeamsAdminList(document.getElementById("teamsAdminSearch").value);

        showToastSafe("Drużyna dodana");

    }catch(err){

        console.error(err);
        alert("Nie udało się dodać drużyny. Spróbuj ponownie.");
    }
}

async function deleteTeamFromDb(name){

    const sure = confirm(`Usunąć drużynę "${name}" z bazy?`);
    if(!sure) return;

    try{

        const docRef = db.collection(TEAMS_DOC_PATH[0]).doc(TEAMS_DOC_PATH[1]);

        await docRef.update({
            approved: firebase.firestore.FieldValue.arrayRemove(name)
        });

        teamsAdminCache = teamsAdminCache.filter(t => t !== name);

        renderTeamsAdminList(document.getElementById("teamsAdminSearch").value);

        if(typeof window.LZPN_SET_TEAMS === "function"){
            window.LZPN_SET_TEAMS(teamsAdminCache);
        }

        showToastSafe("Drużyna usunięta");

    }catch(err){

        console.error(err);
        alert("Nie udało się usunąć drużyny. Spróbuj ponownie.");
    }
}

const adminTeamsPageBtn = document.getElementById("adminTeamsPageBtn");
if(adminTeamsPageBtn){
    adminTeamsPageBtn.addEventListener("click", openTeamsAdminModal);
}

const closeTeamsAdminModalBtn = document.getElementById("closeTeamsAdminModal");
if(closeTeamsAdminModalBtn){
    closeTeamsAdminModalBtn.addEventListener("click", ()=>{
        document.getElementById("teamsAdminModal").classList.remove("active");
    });
}

const teamsAdminSearchInput = document.getElementById("teamsAdminSearch");
if(teamsAdminSearchInput){
    teamsAdminSearchInput.addEventListener("input", ()=>{
        renderTeamsAdminList(teamsAdminSearchInput.value);
    });
}

const restoreDefaultTeamsBtn = document.getElementById("restoreDefaultTeamsBtn");
if(restoreDefaultTeamsBtn){
    restoreDefaultTeamsBtn.addEventListener("click", restoreDefaultTeams);
}

const teamsAdminAddBtn = document.getElementById("teamsAdminAddBtn");
if(teamsAdminAddBtn){
    teamsAdminAddBtn.addEventListener("click", addTeamToDb);
}

const teamsAdminNewNameInput = document.getElementById("teamsAdminNewName");
if(teamsAdminNewNameInput){
    teamsAdminNewNameInput.addEventListener("keydown", (e)=>{
        if(e.key === "Enter") addTeamToDb();
    });
}

/* ======================================
   LISTA UŻYTKOWNIKÓW (ADMIN)
====================================== */

function formatAdminTimestamp(ts){

    if(!ts || typeof ts.toDate !== "function") return "-";

    return ts.toDate().toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function openUsersAdminModal(){

    if(!firebaseReady) return;

    const modal = document.getElementById("usersAdminModal");
    if(modal) modal.classList.add("active");

    const countEl = document.getElementById("usersAdminCount");
    const listEl = document.getElementById("usersAdminList");

    countEl.textContent = "Wczytywanie...";
    listEl.innerHTML = "";

    try{

        const snapshot = await db.collection("users").get();

        const users = [];

        snapshot.forEach(doc=>{
            users.push(doc.data());
        });

        users.sort((a, b)=>{

            const aTime = a.lastLogin && a.lastLogin.toMillis ? a.lastLogin.toMillis() : 0;
            const bTime = b.lastLogin && b.lastLogin.toMillis ? b.lastLogin.toMillis() : 0;

            return bTime - aTime;
        });

        countEl.textContent = `${users.length} zarejestrowanych użytkowników`;

        if(users.length === 0){
            listEl.innerHTML = "<p class=\"pending-teams-empty\">Brak zarejestrowanych kont.</p>";
            return;
        }

        listEl.innerHTML = "";

        users.forEach(u=>{

            const row = document.createElement("div");
            row.className = "pending-team-item";

            const matchCount = Array.isArray(u.matches) ? u.matches.length : 0;

            row.innerHTML = `
                <span class="pending-team-name">
                    ${escapeHtml(u.refereeName) || "(brak imienia)"} — @${escapeHtml(u.username) || "?"}
                    <span class="pending-team-meta">
                        Ostatnie logowanie: ${formatAdminTimestamp(u.lastLogin)} •
                        Konto od: ${formatAdminTimestamp(u.createdAt)} •
                        Meczów: ${matchCount}
                    </span>
                </span>
            `;

            listEl.appendChild(row);
        });

    }catch(err){

        console.error(err);
        countEl.textContent = "Błąd wczytywania listy.";
    }
}

const adminUsersPageBtn = document.getElementById("adminUsersPageBtn");
if(adminUsersPageBtn){
    adminUsersPageBtn.addEventListener("click", openUsersAdminModal);
}

const closeUsersAdminModalBtn = document.getElementById("closeUsersAdminModal");
if(closeUsersAdminModalBtn){
    closeUsersAdminModalBtn.addEventListener("click", ()=>{
        document.getElementById("usersAdminModal").classList.remove("active");
    });
}
