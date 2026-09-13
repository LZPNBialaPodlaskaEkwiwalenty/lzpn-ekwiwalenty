/* ======================================
   LZPN - KALKULATOR SĘDZIOWSKI
   SCRIPT.JS
   CZĘŚĆ 1
====================================== */

/* ======================================
   LOCAL STORAGE
====================================== */

const STORAGE_KEY = "lzpn_biala_podlaska_ekwiwalenty";

function escapeHtml(str){

    if(str === null || str === undefined) return "";

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

const DEFAULT_TEAMS = [
    "Orzeł Czemierniki",
    "ŁKS Łazy",
    "Granica Terespol",
    "Lewart Lubartów",
    "Absolwent Domaszewnica",
    "Agere Sportivo Łuków",
    "AP Bronowice Lublin",
    "AP Ulan-Majorat",
    "Armaty Stoczek Łukowski",
    "Avia Świdnik",
    "Avia II Świdnik",
    "Az-Bud Komarówka Podlaska",
    "BKS Lublin",
    "Bizon Jeleniec",
    "Bug Hanna",
    "Champion Biała Podlaska",
    "Chełmianka Chełm",
    "Dąb Dębowa Kłoda",
    "Dwernicki Stoczek Łukowski",
    "Dwójka Międzyrzec Podlaski",
    "Eko Różanka",
    "FA Orzeł Czemierniki",
    "Gaudium Zamość",
    "GLZS Wodnik Siemień",
    "Górnik Łęczna S.A.",
    "Grom Kąkolewnica",
    "Granit Bychawa",
    "Gryf Gmina Zamość",
    "Hetman Zamość",
    "Huragan Międzyrzec Podlaski",
    "Janovia Janów Podlaski",
    "Janowianka Janów Lubelski",
    "KS AR-TIG Huta Dąbrowa",
    "KS Drelów",
    "KS Kamionka",
    "KS Lublinianka",
    "KS Twierdza Kobylany",
    "Krzna Rzeczyca",
    "Kujawiak Stanin",
    "Lesovia Trzebieszów",
    "LKS Milanów",
    "Lobos FA Biała Podlaska",
    "Lutnia Piszczac",
    "ŁSR Amplus Łuków",
    "Młodzieżówka Radzyń Podlaski",
    "MOSiR Lubartów",
    "Motor Lublin S.A.",
    "Motor II Lublin S.A.",
    "Niwa Łomazy",
    "Olimpia Jabłoń",
    "Olimpia Okrzeja",
    "Opolanin Opole Lubelskie",
    "Orkan Wojcieszków",
    "Orlęta Łuków",
    "Orlęta Radzyń Podlaski",
    "Orlik Lubartów",
    "Perełki Puławy",
    "Podlasie Biała Podlaska",
    "Pogoń 96 Łaszczówka",
    "Północ Lublin",
    "Powiślak Końskowola",
    "Ruch Ryki",
    "Sławin Lublin",
    "Sokół Adamów",
    "Stal Poniatowa",
    "Sygnał Lublin",
    "Świdniczanka Świdnik",
    "Tomasovia Tomaszów Lubelski",
    "Tur Milejów",
    "Tytan Wisznice",
    "UKS Jedynka Terespol",
    "Unia Krzywda",
    "Victoria Łukowa",
    "Victoria Parczew",
    "Vrotcovia Lublin",
    "Wiara Łęczna",
    "Widok SP 51 Lublin",
    "Wisła Puławy",
    "Wenus Oszczepalin"
];

let TEAMS = DEFAULT_TEAMS.slice();

/* ======================================
   DRUŻYNY Z CHMURY (zgłoszenia zaakceptowane
   przez administratora dołączają tutaj)
====================================== */

function populateTeamsDatalist(){

    const teamsListEl =
        document.getElementById("teamsList");

    if(!teamsListEl) return;

    teamsListEl.innerHTML = "";

    TEAMS
        .slice()
        .sort()
        .forEach(team=>{

            const option =
                document.createElement("option");

            option.value = team;

            teamsListEl.appendChild(option);
        });
}

function addExtraTeams(names){

    if(!Array.isArray(names)) return;

    let changed = false;

    names.forEach(name=>{

        if(name && !TEAMS.includes(name)){

            TEAMS.push(name);
            changed = true;
        }
    });

    if(changed){
        populateTeamsDatalist();
    }
}

function replaceAllTeams(names){

    if(!Array.isArray(names)) return;

    TEAMS = names.slice();

    populateTeamsDatalist();
}

window.LZPN_ADD_TEAMS = addExtraTeams;
window.LZPN_SET_TEAMS = replaceAllTeams;
window.LZPN_GET_TEAMS = function(){ return TEAMS.slice(); };
window.LZPN_DEFAULT_TEAMS = DEFAULT_TEAMS.slice();

/* ======================================
   STAWKI
====================================== */

const RATES = {

    "3 Liga": {
    "Sędzia główny": 0,
    "Asystent": 452
},

    "4 Liga": {
        "Sędzia główny": 348,
        "Asystent": 247
    },

    "Klasa okręgowa": {
        "Sędzia główny": 286,
        "Asystent": 218
    },

    "Klasa A": {
        "Sędzia główny": 222,
        "Asystent": 160
    },

    "Klasa B": {
        "Sędzia główny": 198,
        "Asystent": 136
    },

    "Wojewódzka: Junior starszy": {
        "Sędzia główny": 213,
        "Asystent": 155
    },

    "Wojewódzka: Junior młodszy": {
        "Sędzia główny": 198,
        "Asystent": 146
    },

    "Okręgowa: Junior starszy": {
        "Sędzia główny": 165,
        "Asystent": 111
    },

    "Okręgowa: Junior młodszy": {
        "Sędzia główny": 150,
        "Asystent": 101
    },

    "Wojewódzka: Trampkarz": {
        "Sędzia główny": 140,
        "Asystent": 90
    },

    "Wojewódzka: Młodzik": {
        "Sędzia główny": 140,
        "Asystent": 90
    },

    "Okręgowa: Trampkarz": {
        "Sędzia główny": 130,
        "Asystent": 80
    },

    "Okręgowa: Młodzik": {
        "Sędzia główny": 130,
        "Asystent": 80
    },

    "Sparingi: 4 liga": {
        "Sędzia główny": 136,
        "Asystent": 111
    },

    "Sparingi: Niższe klasy": {
        "Sędzia główny": 108,
        "Asystent": 90
    },

    "Baraże: Klasa okręgowa": {
        "Sędzia główny": 222,
        "Asystent": 160
    },

    "Baraże: Klasa A": {
        "Sędzia główny": 198,
        "Asystent": 136
    }

};

/* ======================================
   MIESIĄCE
====================================== */

const MONTHS = [

    "Styczeń",
    "Luty",
    "Marzec",
    "Kwiecień",
    "Maj",
    "Czerwiec",

    "Lipiec",
    "Sierpień",
    "Wrzesień",

    "Październik",
    "Listopad",
    "Grudzień"

];

/* ======================================
   DANE APLIKACJI
====================================== */

let matches = [];

let currentDate = new Date();

let currentMonth = currentDate.getMonth();

let currentYear = currentDate.getFullYear();

if(currentYear < 2026){
    currentYear = 2026;
}

/* ======================================
   ELEMENTY DOM
====================================== */

const calendarGrid =
    document.getElementById("calendarGrid");

const monthSelect =
    document.getElementById("monthSelect");

const yearSelect =
    document.getElementById("yearSelect");

const prevMonth =
    document.getElementById("prevMonth");

const nextMonth =
    document.getElementById("nextMonth");

const modal =
    document.getElementById("matchModal");

const closeModal =
    document.getElementById("closeModal");

const dayModal =
    document.getElementById("dayModal");

let selectedDayDate = null;

const matchForm =
    document.getElementById("matchForm");

const leagueSelect =
    document.getElementById("league");

const roleSelect =
    document.getElementById("role");

const calculatedAmount =
    document.getElementById("calculatedAmount");

const searchInput =
    document.getElementById("searchInput");

const filterLeague =
    document.getElementById("filterLeague");

const filterRole =
    document.getElementById("filterRole");

const tableBody =
    document.getElementById("matchesTableBody");

/* ======================================
   LOCAL STORAGE
====================================== */

function loadData(){

    matches = window.LZPN_AUTH.getMatches();
}

function saveData(){

    window.LZPN_AUTH.saveMatches(matches);
}

/* ======================================
   SELECTY
====================================== */

function initializeSelects(){

    monthSelect.innerHTML = "";

    MONTHS.forEach((month,index)=>{

        const option =
            document.createElement("option");

        option.value = index;
        option.textContent = month;

        monthSelect.appendChild(option);

    });

    monthSelect.value =
        currentMonth;

    yearSelect.innerHTML = "";

    for(let year = 2026; year <= 2100; year++){

        const option =
            document.createElement("option");

        option.value = year;
        option.textContent = year;

        yearSelect.appendChild(option);
    }

    yearSelect.value =
        currentYear;

    leagueSelect.innerHTML = "";

    filterLeague.innerHTML =
        '<option value="">Wszystkie rozgrywki</option>';

    Object.keys(RATES).forEach(league=>{

        const option =
            document.createElement("option");

        option.value = league;
        option.textContent = league;

        leagueSelect.appendChild(
            option.cloneNode(true)
        );

        filterLeague.appendChild(option);

    });

}

/* ======================================
   KALENDARZ
====================================== */

function renderCalendar(){

    calendarGrid.innerHTML = "";

    const firstDay =
        new Date(
            currentYear,
            currentMonth,
            1
        );

    const lastDay =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        );

    let startDay =
        firstDay.getDay();

    if(startDay === 0){
        startDay = 7;
    }

    for(let i = 1; i < startDay; i++){

        const empty =
            document.createElement("div");

        empty.className = "day";

        empty.style.visibility = "hidden";

        calendarGrid.appendChild(empty);
    }

    for(let day = 1;
        day <= lastDay.getDate();
        day++){

        const dayElement =
            document.createElement("div");

        dayElement.classList.add("day");

        const fullDate =
            formatDate(
                currentYear,
                currentMonth + 1,
                day
            );

        const dayMatches =
    matches.filter(
        match =>
            match.date === fullDate
    );

const matchesCount =
    dayMatches.length;

        if(matchesCount > 0){

            dayElement.classList.add(
                "has-match"
            );
        }

        const MAX_PREVIEW =
            3;

        const matchesPreview =
    dayMatches
        .slice(0, MAX_PREVIEW)
        .map(match => {

            const isMain =
                match.role === "Sędzia główny";

            const roleAbbr =
                isMain ? "SG" : "AS";

            const roleClass =
                isMain ? "role-sg" : "role-as";

            return `
                <div class="calendar-match-line ${roleClass}">
                    <span class="role-tag">${roleAbbr}:</span>${escapeHtml(match.homeTeam)} - ${escapeHtml(match.awayTeam)}
                </div>
            `;

        })
        .join("");

dayElement.innerHTML = `

    <div class="day-number">
        ${day}
    </div>

    ${
        matchesCount > 0
        ?
        `
        <div class="calendar-matches">

            ${matchesPreview}

            ${
                matchesCount > MAX_PREVIEW
                ?
                `<div class="more-matches">
                    +${matchesCount - MAX_PREVIEW}
                </div>`
                :
                ""
            }

        </div>
        `
        :
        ""
    }

`;
if(matchesCount > 0){

    dayElement.title =
        dayMatches
            .map(match =>
                `${
                    match.role === "Sędzia główny"
                        ? "SG"
                        : "AS"
                }: ${match.homeTeam} - ${match.awayTeam}`
            )
            .join("\n");

}

        dayElement.addEventListener(
            "click",
            ()=>openDayModal(fullDate)
        );

        calendarGrid.appendChild(
            dayElement
        );
    }

}

/* ======================================
   FORMAT DATY
====================================== */

function formatDate(
    year,
    month,
    day
){

    const m =
        String(month).padStart(2,"0");

    const d =
        String(day).padStart(2,"0");

    return `${year}-${m}-${d}`;
}
/* ======================================
   MODAL
====================================== */

function openAddModal(date){

    document.getElementById("modalTitle").textContent =
        "Dodaj mecz";

    document.getElementById("editId").value = "";

    document.getElementById("matchDate").value =
        date;

    document.getElementById("homeTeam").value = "";

    document.getElementById("awayTeam").value = "";

    setFormSettled(false);

    leagueSelect.selectedIndex = 0;
    roleSelect.selectedIndex = 0;

    updateAmountPreview();

    modal.classList.add("active");
}

function openEditModal(id){

    const match =
        matches.find(m => m.id === id);

    if(!match) return;

    document.getElementById("modalTitle").textContent =
        "Edytuj mecz";

    document.getElementById("editId").value =
        match.id;

    document.getElementById("matchDate").value =
        match.date;

    document.getElementById("homeTeam").value =
        match.homeTeam;

    document.getElementById("awayTeam").value =
        match.awayTeam;

    setFormSettled(match.settled);

    leagueSelect.value =
        match.league;

    roleSelect.value =
        match.role;

    updateAmountPreview();

    modal.classList.add("active");
}

function closeModalWindow(force){

    if(!force){

        const homeVal =
            document.getElementById("homeTeam").value.trim();

        const awayVal =
            document.getElementById("awayTeam").value.trim();

        if(homeVal || awayVal){

            const discard = confirm(
                "Masz niezapisane dane w formularzu. Na pewno zamknąć bez zapisywania?"
            );

            if(!discard) return;
        }
    }

    modal.classList.remove("active");
}

/* ======================================
   MODAL PODGLĄDU DNIA
====================================== */

function openDayModal(date){

    selectedDayDate = date;

    document.getElementById("dayModalDate").textContent =
        formatDisplayDate(date);

    renderDayMatchesList(date);

    dayModal.classList.add("active");
}

function closeDayModal(){

    dayModal.classList.remove("active");
}

function renderDayMatchesList(date){

    const list =
        document.getElementById("dayMatchesList");

    const dayMatches =
        matches.filter(
            match => match.date === date
        );

    if(dayMatches.length === 0){

        list.innerHTML = `
            <p style="color:var(--muted); text-align:center; padding:20px 0;">
                Brak meczów w tym dniu
            </p>
        `;

        return;
    }

    list.innerHTML = "";

    dayMatches.forEach((match, index)=>{

        const card =
            document.createElement("div");

        card.className = "day-match-card";

        card.innerHTML = `

            <div class="day-match-title">
                ${escapeHtml(match.homeTeam)} - ${escapeHtml(match.awayTeam)}
            </div>

            <div>
                ${escapeHtml(match.league)} • ${escapeHtml(match.role)}
            </div>

            <div style="margin-top:8px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <strong>${match.amount} zł</strong>

                <span style="color:var(--muted); font-size:.8rem;">
                    Rozliczone:
                </span>

                <div class="settled-toggle-table">

                    <button
                        type="button"
                        class="toggle-btn-sm toggle-yes ${
                            match.settled ? 'active' : ''
                        }"
                        onclick="setMatchSettled(${match.id}, true)"
                    >
                        TAK
                    </button>

                    <button
                        type="button"
                        class="toggle-btn-sm toggle-no ${
                            !match.settled ? 'active' : ''
                        }"
                        onclick="setMatchSettled(${match.id}, false)"
                    >
                        NIE
                    </button>

                </div>
            </div>

            <div class="day-match-actions">

                <button
                    class="action-btn move-btn"
                    onclick="moveMatch(${match.id}, -1)"
                    ${index === 0 ? "disabled" : ""}
                    aria-label="Przenieś wyżej"
                >
                    <i class="fa-solid fa-arrow-up"></i>
                </button>

                <button
                    class="action-btn move-btn"
                    onclick="moveMatch(${match.id}, 1)"
                    ${index === dayMatches.length - 1 ? "disabled" : ""}
                    aria-label="Przenieś niżej"
                >
                    <i class="fa-solid fa-arrow-down"></i>
                </button>

                <button
                    class="action-btn edit-btn"
                    onclick="editMatchFromDay(${match.id})"
                >
                    <i class="fa-solid fa-pen"></i>
                    Edytuj
                </button>

                <button
                    class="action-btn delete-btn"
                    onclick="deleteMatchFromDay(${match.id})"
                >
                    <i class="fa-solid fa-trash"></i>
                    Usuń
                </button>

            </div>

        `;

        list.appendChild(card);

    });

}

function moveMatch(id, direction){

    const match =
        matches.find(m => m.id === id);

    if(!match) return;

    const dayMatches =
        matches.filter(m => m.date === match.date);

    const posInDay =
        dayMatches.findIndex(m => m.id === id);

    if(posInDay === -1) return;

    const targetPosInDay = posInDay + direction;

    if(targetPosInDay < 0 || targetPosInDay >= dayMatches.length) return;

    const idA = dayMatches[posInDay].id;
    const idB = dayMatches[targetPosInDay].id;

    const globalIndexA = matches.findIndex(m => m.id === idA);
    const globalIndexB = matches.findIndex(m => m.id === idB);

    [matches[globalIndexA], matches[globalIndexB]] =
        [matches[globalIndexB], matches[globalIndexA]];

    saveData();

    renderCalendar();
    renderMatchesTable();

    if(
        dayModal.classList.contains("active") &&
        selectedDayDate === match.date
    ){
        renderDayMatchesList(match.date);
    }
}

function addMatchFromDay(){

    const date = selectedDayDate;

    closeDayModal();

    openAddModal(date);
}

function addMatchFromTable(){

    const today = new Date();

    let defaultDate;

    if(
        today.getFullYear() === currentYear &&
        today.getMonth() === currentMonth
    ){

        defaultDate = formatDate(
            currentYear,
            currentMonth + 1,
            today.getDate()
        );

    }else{

        defaultDate = formatDate(
            currentYear,
            currentMonth + 1,
            1
        );
    }

    openAddModal(defaultDate);
}

/* ======================================
   IMPORT Z OBSAD PZPN
====================================== */

const LEAGUE_MAP = [
    { test: /iv\s*liga/i, value: "4 Liga" },
    { test: /iii\s*liga/i, value: "3 Liga" },
    { test: /klasa\s*okr[eę]g/i, value: "Klasa okręgowa" },
    { test: /klasa\s*["'„”]?a["'„”]?\b/i, value: "Klasa A" },
    { test: /klasa\s*["'„”]?b["'„”]?\b/i, value: "Klasa B" }
];

function normalizeObsadyLeague(raw){

    for(const rule of LEAGUE_MAP){
        if(rule.test.test(raw)) return rule.value;
    }

    const hasBialaPodlaska = /bia[łl]a\s*podlaska/i.test(raw);
    const hasWojewodzka = /wojew[oó]dzk/i.test(raw);

    const hasJuniorStarszy =
        /junior[óoa-ząćęłńśźż]*\s*starsz/i.test(raw) ||
        /juniorów\s*starszych/i.test(raw) ||
        /\bA1\b/.test(raw);

    const hasJuniorMlodszy =
        /junior[óoa-ząćęłńśźż]*\s*m[lł]odsz/i.test(raw) ||
        /junior[óo]w\s*m[lł]odszych/i.test(raw) ||
        /\bB2\b/.test(raw);

    const hasTrampkarz =
        /trampkarz/i.test(raw) ||
        /\bC[12]\b/.test(raw);

    const hasMlodzik =
        /m[lł]odzi(cy|k)/i.test(raw) ||
        /\bD[12]\b/.test(raw);

    if(hasBialaPodlaska){

        if(hasJuniorStarszy) return "Okręgowa: Junior starszy";
        if(hasJuniorMlodszy) return "Okręgowa: Junior młodszy";
        if(hasTrampkarz) return "Okręgowa: Trampkarz";
        if(hasMlodzik) return "Okręgowa: Młodzik";
    }

    if(hasWojewodzka){

        if(hasJuniorStarszy) return "Wojewódzka: Junior starszy";
        if(hasJuniorMlodszy) return "Wojewódzka: Junior młodszy";
        if(hasTrampkarz) return "Wojewódzka: Trampkarz";
        if(hasMlodzik) return "Wojewódzka: Młodzik";
    }

    return "";
}

function parseObsadyLine(line){

    const dateMatch =
        line.match(/(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})/);

    if(!dateMatch) return null;

    const date = dateMatch[1];
    const dateIndex = line.indexOf(dateMatch[0]);

    const beforeDate = line.slice(0, dateIndex);
    const afterDate = line.slice(dateIndex + dateMatch[0].length);

    const leagueRaw =
        beforeDate.split("\t")[0].trim();

    const afterParts =
        afterDate
            .split("\t")
            .map(p => p.trim())
            .filter(p => p.length > 0);

    const homeTeam = afterParts[0] || "";
    const awayTeam = afterParts[1] || "";

    if(!homeTeam || !awayTeam) return null;

    return {
        date: date,
        leagueRaw: leagueRaw,
        league: normalizeObsadyLeague(leagueRaw),
        homeTeam: homeTeam,
        awayTeam: awayTeam,
        role: "Sędzia główny"
    };
}

function parseObsadyText(text){

    return text
        .split("\n")
        .map(line => parseObsadyLine(line))
        .filter(row => row !== null);
}

let parsedObsadyRows = [];

function renderImportPreview(){

    const container =
        document.getElementById("importObsadyPreview");

    const confirmBtn =
        document.getElementById("confirmImportObsadyBtn");

    if(parsedObsadyRows.length === 0){

        container.innerHTML =
            "<p class=\"pending-teams-empty\">Nie rozpoznano żadnych meczów. Sprawdź, czy wklejony fragment zawiera daty w formacie RRRR-MM-DD.</p>";

        confirmBtn.style.display = "none";
        return;
    }

    container.innerHTML = "";

    const leagueOptions =
        Object.keys(RATES);

    parsedObsadyRows.forEach((row, index)=>{

        const rowEl =
            document.createElement("div");

        rowEl.className =
            "import-row" + (row.league ? "" : " unmapped");

        const dateDisplay =
            formatDisplayDate(row.date);

        rowEl.innerHTML = `
            <input type="checkbox" class="import-row-check" data-index="${index}" checked>
            <span class="import-row-date">${dateDisplay}</span>
            <span class="import-row-teams">${escapeHtml(row.homeTeam)} - ${escapeHtml(row.awayTeam)}</span>
            <select class="import-row-league" data-index="${index}">
                <option value="">- wybierz ligę -</option>
                ${leagueOptions.map(l =>
                    `<option value="${escapeHtml(l)}" ${l === row.league ? "selected" : ""}>${escapeHtml(l)}</option>`
                ).join("")}
            </select>
            <span class="import-row-role">
                <button type="button" class="role-main-btn active" data-index="${index}">Główny</button>
                <button type="button" class="role-assist-btn" data-index="${index}">Asystent</button>
            </span>
            ${!row.league ? `<span class="import-row-warning">Nie rozpoznano ligi "${escapeHtml(row.leagueRaw)}" - wybierz ręcznie</span>` : ""}
        `;

        container.appendChild(rowEl);
    });

    container.querySelectorAll(".import-row-league").forEach(sel=>{
        sel.addEventListener("change", (e)=>{
            const i = Number(e.target.dataset.index);
            parsedObsadyRows[i].league = e.target.value;
        });
    });

    container.querySelectorAll(".role-main-btn").forEach(btn=>{
        btn.addEventListener("click", (e)=>{
            const i = Number(e.target.dataset.index);
            parsedObsadyRows[i].role = "Sędzia główny";

            const rowEl = e.target.closest(".import-row");
            rowEl.querySelector(".role-main-btn").classList.add("active");
            rowEl.querySelector(".role-assist-btn").classList.remove("active");
        });
    });

    container.querySelectorAll(".role-assist-btn").forEach(btn=>{
        btn.addEventListener("click", (e)=>{
            const i = Number(e.target.dataset.index);
            parsedObsadyRows[i].role = "Asystent";

            const rowEl = e.target.closest(".import-row");
            rowEl.querySelector(".role-assist-btn").classList.add("active");
            rowEl.querySelector(".role-main-btn").classList.remove("active");
        });
    });

    confirmBtn.style.display = "flex";
}

function handleParseObsady(){

    const text =
        document.getElementById("importObsadyTextarea").value;

    parsedObsadyRows = parseObsadyText(text);

    renderImportPreview();
}

function confirmImportObsady(){

    const container =
        document.getElementById("importObsadyPreview");

    const checked =
        Array.from(
            container.querySelectorAll(".import-row-check:checked")
        ).map(cb => Number(cb.dataset.index));

    if(checked.length === 0){
        alert("Zaznacz przynajmniej jeden mecz do zaimportowania.");
        return;
    }

    const missingLeague =
        checked.some(i => !parsedObsadyRows[i].league);

    if(missingLeague){
        alert("Dla niektórych zaznaczonych meczów nie wybrano ligi - uzupełnij przed importem.");
        return;
    }

    let imported = 0;
    const importedTeamNames = [];

    checked.forEach(i=>{

        const row = parsedObsadyRows[i];

        const amount =
            (RATES[row.league] && RATES[row.league][row.role]) || 0;

        matches.push({
            id: Date.now() + i,
            date: row.date,
            league: row.league,
            role: row.role,
            homeTeam: row.homeTeam,
            awayTeam: row.awayTeam,
            amount: amount,
            settled: false
        });

        importedTeamNames.push(row.homeTeam, row.awayTeam);

        imported++;
    });

    if(typeof window.LZPN_ADD_TEAMS_TO_DB === "function"){
        window.LZPN_ADD_TEAMS_TO_DB(importedTeamNames);
    }

    saveData();

    renderCalendar();
    renderMatchesTable();
    updateStatistics();

    document.getElementById("importObsadyModal").classList.remove("active");
    document.getElementById("importObsadyTextarea").value = "";
    document.getElementById("importObsadyPreview").innerHTML = "";
    document.getElementById("confirmImportObsadyBtn").style.display = "none";
    parsedObsadyRows = [];

    showToast(`Zaimportowano ${imported} ${imported === 1 ? "mecz" : "mecze(ów)"}`);
}

function editMatchFromDay(id){

    closeDayModal();

    openEditModal(id);
}

function deleteMatchFromDay(id){

    deleteMatch(id);

    if(selectedDayDate){

        renderDayMatchesList(selectedDayDate);
    }
}

/* ======================================
   EKWIWALENT
====================================== */

function calculateAmount(){

    const league =
        leagueSelect.value;

    const role =
        roleSelect.value;

    if(
        !league ||
        !role ||
        !RATES[league]
    ){
        return 0;
    }

    return RATES[league][role] || 0;
}

function updateAmountPreview(){

    const amount =
        calculateAmount();

    calculatedAmount.textContent =
        `${amount} zł`;
}

/* ======================================
   PRZYCISKI ROZLICZONE (FORMULARZ)
====================================== */

function setFormSettled(value){

    document.getElementById("settled").value =
        value ? "true" : "false";

    document.getElementById("settledYesBtn")
        .classList.toggle("active", value);

    document.getElementById("settledNoBtn")
        .classList.toggle("active", !value);
}

/* ======================================
   DODAWANIE / EDYCJA
====================================== */

function saveMatch(event){

    event.preventDefault();

    const editId =
        document.getElementById("editId").value;

    const matchData = {

        id:
            editId
            ? Number(editId)
            : Date.now(),

        date:
            document.getElementById(
                "matchDate"
            ).value,

        league:
            leagueSelect.value,

        role:
            roleSelect.value,

        homeTeam:
            document.getElementById(
                "homeTeam"
            ).value.trim(),

        awayTeam:
            document.getElementById(
                "awayTeam"
            ).value.trim(),

        amount:
            calculateAmount(),

        settled:
            document.getElementById(
                "settled"
            ).value === "true"

    };

    if(editId){

        const index =
            matches.findIndex(
                m => m.id === Number(editId)
            );

        if(index !== -1){

            matches[index] = matchData;
        }

    }else{

        matches.push(matchData);
    }

    saveData();

    renderCalendar();
    renderMatchesTable();
    updateStatistics();

    closeModalWindow(true);

    showToast(
        editId
            ? "Mecz zaktualizowany"
            : "Mecz dodany"
    );
}

/* ======================================
   USUWANIE
====================================== */

function deleteMatch(id){

    const confirmDelete =
        confirm(
            "Czy na pewno usunąć mecz?"
        );

    if(!confirmDelete){
        return;
    }

    matches =
        matches.filter(
            match => match.id !== id
        );

    saveData();

    renderCalendar();
    renderMatchesTable();
    updateStatistics();

    showToast("Mecz usunięty");
}

/* ======================================
   STATUS ROZLICZENIA
====================================== */

function toggleSettled(id){

    const match =
        matches.find(
            m => m.id === id
        );

    if(!match) return;

    setMatchSettled(id, !match.settled);
}

function setMatchSettled(id, value){

    const match =
        matches.find(
            m => m.id === id
        );

    if(!match) return;

    if(match.settled === value){
        return;
    }

    match.settled = value;

    saveData();

    renderMatchesTable();
    updateStatistics();

    if(selectedDayDate){

        renderDayMatchesList(selectedDayDate);
    }

    showToast(
        value
            ? "Mecz rozliczony"
            : "Rozliczenie cofnięte"
    );
}

/* ======================================
   MECZE AKTUALNEGO MIESIĄCA
====================================== */

function getCurrentMonthMatches(){

    return matches.filter(match=>{

        const date =
            new Date(match.date);

        return (
            date.getMonth() === currentMonth &&
            date.getFullYear() === currentYear
        );

    });

}

/* ======================================
   TABELA
====================================== */

function renderMatchesTable(){

    const monthMatches =
        getCurrentMonthMatches();

    const search =
        searchInput.value
            .toLowerCase()
            .trim();

    const leagueFilter =
        filterLeague.value;

    const roleFilter =
        filterRole.value;

    let filtered =
        monthMatches.filter(match=>{

            const teamMatch =

                match.homeTeam
                    .toLowerCase()
                    .includes(search)

                ||

                match.awayTeam
                    .toLowerCase()
                    .includes(search);

            const leagueMatch =
                !leagueFilter ||
                match.league === leagueFilter;

            const roleMatch =
                !roleFilter ||
                match.role === roleFilter;

            return (
                teamMatch &&
                leagueMatch &&
                roleMatch
            );

        });

    filtered.sort((a,b)=>{

        return new Date(a.date) -
               new Date(b.date);

    });

    if(filtered.length === 0){

        tableBody.innerHTML = `
            <tr>
                <td colspan="10"
                    class="empty-row">
                    Brak meczów
                </td>
            </tr>
        `;

        return;
    }

    tableBody.innerHTML = "";

    filtered.forEach(match=>{

        const dayMatches =
            matches.filter(m => m.date === match.date);

        const posInDay =
            dayMatches.findIndex(m => m.id === match.id);

        const canMoveUp = posInDay > 0;
        const canMoveDown = posInDay < dayMatches.length - 1;

        const row =
            document.createElement("tr");

        row.className = "match-row";

        row.innerHTML = `

            <td class="row-summary" data-label="">
                <span class="row-summary-text">
                    ${formatDisplayDate(match.date)} • ${escapeHtml(match.league)}: ${escapeHtml(match.homeTeam)} - ${escapeHtml(match.awayTeam)}
                </span>
                <i class="fa-solid fa-chevron-down row-summary-chevron"></i>
            </td>

            <td data-label="Data">${formatDisplayDate(match.date)}</td>

            <td data-label="Rozgrywki">${escapeHtml(match.league)}</td>

            <td data-label="Rola">${escapeHtml(match.role)}</td>

            <td data-label="Gospodarz">${escapeHtml(match.homeTeam)}</td>

            <td data-label="Goście">${escapeHtml(match.awayTeam)}</td>

            <td data-label="Kwota">${match.amount} zł</td>

            <td data-label="Rozliczone">

                <div class="settled-toggle-table">

                    <button
                        type="button"
                        class="toggle-btn-sm toggle-yes ${
                            match.settled ? 'active' : ''
                        }"
                        onclick="setMatchSettled(${match.id}, true)"
                        aria-label="Oznacz jako rozliczone"
                    >
                        TAK
                    </button>

                    <button
                        type="button"
                        class="toggle-btn-sm toggle-no ${
                            !match.settled ? 'active' : ''
                        }"
                        onclick="setMatchSettled(${match.id}, false)"
                        aria-label="Oznacz jako nierozliczone"
                    >
                        NIE
                    </button>

                </div>

            </td>

            <td data-label="Kolejność">

                <div class="move-btn-group">

                    <button
                        class="action-btn move-btn"
                        onclick="moveMatch(${match.id}, -1)"
                        ${canMoveUp ? "" : "disabled"}
                        aria-label="Przenieś wyżej"
                    >
                        <i class="fa-solid fa-arrow-up"></i>
                    </button>

                    <button
                        class="action-btn move-btn"
                        onclick="moveMatch(${match.id}, 1)"
                        ${canMoveDown ? "" : "disabled"}
                        aria-label="Przenieś niżej"
                    >
                        <i class="fa-solid fa-arrow-down"></i>
                    </button>

                </div>

            </td>

            <td data-label="Edytuj">

                <button
                    class="action-btn edit-btn"
                    onclick="openEditModal(${match.id})"
                    aria-label="Edytuj mecz ${escapeHtml(match.homeTeam)} - ${escapeHtml(match.awayTeam)}"
                >
                    <i class="fa-solid fa-pen"></i>
                </button>

            </td>

            <td data-label="Usuń">

                <button
                    class="action-btn delete-btn"
                    onclick="deleteMatch(${match.id})"
                    aria-label="Usuń mecz ${escapeHtml(match.homeTeam)} - ${escapeHtml(match.awayTeam)}"
                >
                    <i class="fa-solid fa-trash"></i>
                </button>

            </td>

        `;

        row.addEventListener("dblclick",()=>{

            toggleSettled(match.id);

        });

        row.querySelector(".row-summary").addEventListener("click", ()=>{

            row.classList.toggle("expanded");

        });

        tableBody.appendChild(row);

    });

}

/* ======================================
   FORMAT DATY TABELI
====================================== */

function formatDisplayDate(date){

    const d = new Date(date);

    return d.toLocaleDateString(
        "pl-PL"
    );
}

/* ======================================
   STATYSTYKI
====================================== */

function updateStatistics(){

    const monthMatches =
        getCurrentMonthMatches();

    const total =
        monthMatches.reduce(
            (sum,m)=>sum + m.amount,
            0
        );

    const settled =
        monthMatches
            .filter(m=>m.settled)
            .reduce(
                (sum,m)=>sum + m.amount,
                0
            );

    const unpaid =
        total - settled;

    const unsettledCount =
        monthMatches.filter(
            m => !m.settled
        ).length;

    document.getElementById(
        "totalAmount"
    ).textContent =
        `${total} zł`;

    document.getElementById(
        "settledAmount"
    ).textContent =
        `${settled} zł`;

    document.getElementById(
        "toPayAmount"
    ).textContent =
        `${unpaid} zł`;

    document.getElementById(
        "matchCount"
    ).textContent =
        monthMatches.length;

    const avg =
        monthMatches.length > 0
            ? Math.round(total / monthMatches.length)
            : 0;

    const avgEl =
        document.getElementById("avgAmount");

    if(avgEl){
        avgEl.textContent = `${avg} zł`;
    }
}

/* ======================================
   TOAST
====================================== */

function showToast(message){

    const toast =
        document.getElementById(
            "toast"
        );

    toast.textContent =
        message;

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove(
            "show"
        );

    },2500);
}

/* ======================================
   PDF
====================================== */

function loadLogoAsBase64(){

    return fetch("logo.png")
        .then(res => res.blob())
        .then(blob => new Promise((resolve)=>{

            const reader = new FileReader();

            reader.onloadend = ()=>
                resolve(reader.result);

            reader.onerror = ()=>
                resolve(null);

            reader.readAsDataURL(blob);

        }))
        .catch(()=> null);
}

async function exportPDF(){

    const logoBase64 =
        await loadLogoAsBase64();

    const today = new Date();

    const generatedDate =
        today.toLocaleDateString("pl-PL") +
        " " +
        today.toLocaleTimeString("pl-PL");

    const monthMatches =
        getCurrentMonthMatches();

    const referee =
        window.LZPN_AUTH.getRefereeName() || "—";

    const total =
        monthMatches.reduce(
            (sum,m)=>sum + m.amount,
            0
        );

    const settled =
        monthMatches
            .filter(m=>m.settled)
            .reduce(
                (sum,m)=>sum + m.amount,
                0
            );

    const unpaid =
        total - settled;

    const tableBody = [

        [
            { text:"Data", style:"tableHeader" },
            { text:"Rozgrywki", style:"tableHeader" },
            { text:"Rola", style:"tableHeader" },
            { text:"Gospodarz", style:"tableHeader" },
            { text:"Goście", style:"tableHeader" },
            { text:"Kwota", style:"tableHeader", alignment:"right" },
            { text:"Rozl.", style:"tableHeader", alignment:"center" }
        ]

    ];

    monthMatches
        .slice()
        .sort((a,b)=> new Date(a.date) - new Date(b.date))
        .forEach(match=>{

            tableBody.push([

                { text: formatDisplayDate(match.date), fontSize:9 },
                { text: match.league, fontSize:9 },
                { text: match.role, fontSize:9 },
                { text: match.homeTeam, fontSize:9 },
                { text: match.awayTeam, fontSize:9 },
                { text: `${match.amount} zł`, fontSize:9, alignment:"right", bold:true },
                {
                    text: match.settled ? "TAK" : "NIE",
                    fontSize:9,
                    alignment:"center",
                    bold:true,
                    color: match.settled ? "#1a8a4a" : "#c23b32"
                }

            ]);

        });

    function summaryCard(label, value, accentColor){

        return {

            table:{

                widths:["*"],

                body:[

                    [{
                        stack:[

                            {
                                canvas:[{
                                    type:"rect",
                                    x:0, y:0,
                                    w:150, h:3,
                                    color: accentColor
                                }]
                            },

                            {
                                text: label,
                                fontSize:9,
                                bold:true,
                                color:"#666666",
                                margin:[0,8,0,4]
                            },

                            {
                                text: `${value} zł`,
                                fontSize:17,
                                bold:true,
                                color:"#1a1a1a"
                            }

                        ],
                        margin:[10,8,10,10]
                    }]

                ]

            },

            layout:{

                hLineWidth: ()=> 1,
                vLineWidth: ()=> 1,
                hLineColor: ()=> "#e2e2e2",
                vLineColor: ()=> "#e2e2e2"

            }

        };

    }

    const docDefinition = {

        pageSize:"A4",

        pageMargins:[40,110,40,80],

        images: logoBase64
            ? { clubLogo: logoBase64 }
            : {},

        header:function(currentPage){

            return {

                margin:[40,28,40,0],

                stack:[

                    {
                        columns:[

                            logoBase64
                                ? { image:"clubLogo", width:42, height:42 }
                                : { text:"", width:42 },

                            {
                                width:"*",
                                margin:[12,2,0,0],
                                stack:[
                                    {
                                        text:"LZPN: BIAŁA PODLASKA",
                                        fontSize:15,
                                        bold:true,
                                        color:"#8a6a1a"
                                    },
                                    {
                                        text:"Rozliczenie ekwiwalentów sędziowskich",
                                        fontSize:9,
                                        color:"#777777"
                                    }
                                ]
                            },

                            {
                                width:"auto",
                                text:`Strona ${currentPage}`,
                                fontSize:8,
                                color:"#999999",
                                alignment:"right",
                                margin:[0,10,0,0]
                            }

                        ]
                    },

                    {
                        canvas:[{
                            type:"line",
                            x1:0, y1:12,
                            x2:515, y2:12,
                            lineWidth:1,
                            lineColor:"#d4af37"
                        }]
                    }

                ]

            };

        },

        footer:function(currentPage,pageCount){

            return {

                margin:[40,10,40,0],

                stack:[

                    {
                        canvas:[{
                            type:"line",
                            x1:0, y1:0,
                            x2:515, y2:0,
                            lineWidth:0.5,
                            lineColor:"#dddddd"
                        }]
                    },

                    {
                        columns:[

                            {
                                text:"Lubelski Związek Piłki Nożnej – Kalkulator sędziowski",
                                fontSize:8,
                                color:"#999999"
                            },

                            {
                                text:`Strona ${currentPage} z ${pageCount}`,
                                fontSize:8,
                                color:"#999999",
                                alignment:"right"
                            }

                        ],

                        margin:[0,6,0,0]
                    }

                ]

            };

        },

        styles:{

            tableHeader:{
                bold:true,
                fontSize:9,
                color:"#ffffff",
                fillColor:"#1a1a1a"
            }

        },

        content:[

            {
                columns:[

                    {
                        width:"*",
                        stack:[
                            { text:"Sędzia", fontSize:8, color:"#999999" },
                            { text:referee, fontSize:11, bold:true, margin:[0,1,0,8] },
                            { text:"Okres rozliczeniowy", fontSize:8, color:"#999999" },
                            { text:`${MONTHS[currentMonth]} ${currentYear}`, fontSize:11, bold:true }
                        ]
                    },

                    {
                        width:"*",
                        alignment:"right",
                        stack:[
                            { text:"Data wygenerowania", fontSize:8, color:"#999999" },
                            { text:generatedDate, fontSize:11, bold:true, margin:[0,1,0,8] },
                            { text:"Liczba meczów", fontSize:8, color:"#999999" },
                            { text:String(monthMatches.length), fontSize:11, bold:true }
                        ]
                    }

                ],

                margin:[0,0,0,18]
            },

            monthMatches.length > 0
            ?
            {
                table:{
                    headerRows:1,
                    widths:[55,80,60,"*","*",50,40],
                    body: tableBody
                },

                layout:{

                    hLineWidth:(i, node)=>
                        (i === 0 || i === node.table.body.length) ? 1 : 0.5,

                    vLineWidth: ()=> 0,

                    hLineColor:(i)=>
                        i === 1 ? "#1a1a1a" : "#e2e2e2",

                    paddingLeft: ()=> 8,
                    paddingRight: ()=> 8,
                    paddingTop: ()=> 7,
                    paddingBottom: ()=> 7,

                    fillColor:(rowIndex)=>
                        rowIndex > 0 && rowIndex % 2 === 0
                            ? "#f7f7f7"
                            : null

                }
            }
            :
            {
                table:{
                    widths:["*"],
                    body:[[
                        {
                            text:"Brak meczów w wybranym miesiącu.",
                            italics:true,
                            color:"#999999",
                            alignment:"center",
                            margin:[0,20,0,20]
                        }
                    ]]
                },
                layout:{
                    hLineColor: ()=> "#e2e2e2",
                    vLineColor: ()=> "#e2e2e2"
                }
            },

            {
                columns:[
                    summaryCard("ŁĄCZNA WARTOŚĆ", total, "#8a8a8a"),
                    summaryCard("ROZLICZONE", settled, "#1a8a4a"),
                    summaryCard("DO WYPŁATY", unpaid, "#d4af37")
                ],

                columnGap:14,

                margin:[0,20,0,0]
            }

        ]

    };

    pdfMake
        .createPdf(docDefinition)
        .download(
            `Ekwiwalenty_${currentMonth+1}_${currentYear}.pdf`
        );

}

/* ======================================
   EVENTY
====================================== */

monthSelect.addEventListener(
    "change",
    ()=>{

        currentMonth =
            Number(
                monthSelect.value
            );

        renderCalendar();
        renderMatchesTable();
        updateStatistics();
    }
);

yearSelect.addEventListener(
    "change",
    ()=>{

        currentYear =
            Number(
                yearSelect.value
            );

        renderCalendar();
        renderMatchesTable();
        updateStatistics();
    }
);

prevMonth.addEventListener(
    "click",
    ()=>{

        currentMonth--;

        if(currentMonth < 0){

            currentMonth = 11;
            currentYear--;
        }

        if(currentYear < 2026){

            currentYear = 2026;
            currentMonth = 0;
        }

        monthSelect.value =
            currentMonth;

        yearSelect.value =
            currentYear;

        renderCalendar();
        renderMatchesTable();
        updateStatistics();
    }
);

nextMonth.addEventListener(
    "click",
    ()=>{

        currentMonth++;

        if(currentMonth > 11){

            currentMonth = 0;
            currentYear++;
        }

        monthSelect.value =
            currentMonth;

        yearSelect.value =
            currentYear;

        renderCalendar();
        renderMatchesTable();
        updateStatistics();
    }
);

closeModal.addEventListener(
    "click",
    closeModalWindow
);

window.addEventListener(
    "click",
    (e)=>{

        if(e.target === modal){

            closeModalWindow();
        }

        if(e.target === dayModal){

            closeDayModal();
        }

    }
);

leagueSelect.addEventListener(
    "change",
    updateAmountPreview
);

roleSelect.addEventListener(
    "change",
    updateAmountPreview
);

matchForm.addEventListener(
    "submit",
    saveMatch
);

searchInput.addEventListener(
    "input",
    renderMatchesTable
);

filterLeague.addEventListener(
    "change",
    renderMatchesTable
);

filterRole.addEventListener(
    "change",
    renderMatchesTable
);

document
.getElementById("pdfBtn")
.addEventListener(
    "click",
    exportPDF
);

document
.getElementById("addMatchFromTableBtn")
.addEventListener(
    "click",
    addMatchFromTable
);

document
.getElementById("openImportObsadyBtn")
.addEventListener(
    "click",
    ()=>{
        document.getElementById("importObsadyModal").classList.add("active");
    }
);

document
.getElementById("importObsadyUnderCalendarBtn")
.addEventListener(
    "click",
    ()=>{
        document.getElementById("importObsadyModal").classList.add("active");
    }
);

document
.getElementById("closeImportObsadyModal")
.addEventListener(
    "click",
    ()=>{
        document.getElementById("importObsadyModal").classList.remove("active");
    }
);

document
.getElementById("parseObsadyBtn")
.addEventListener(
    "click",
    handleParseObsady
);

document
.getElementById("confirmImportObsadyBtn")
.addEventListener(
    "click",
    confirmImportObsady
);

/* ======================================
   START (po zalogowaniu)
====================================== */

function startApp(){

    loadData();

    initializeSelects();

    renderCalendar();

    renderMatchesTable();

    updateStatistics();

    updateAmountPreview();

    loadReferee();

    showToast(
        "Aplikacja gotowa"
    );

    maybeShowOnboarding();
}

window.LZPN_AUTH.onReady(startApp);

/* ======================================
   INSTRUKCJA "JAK SZYBKO DODAĆ MECZE"
====================================== */

let onboardingStep = 1;
const ONBOARDING_TOTAL_STEPS = 3;

function updateOnboardingStep(){

    document.querySelectorAll(".onboarding-step").forEach(el=>{
        el.classList.toggle("active", Number(el.dataset.step) === onboardingStep);
    });

    document.querySelectorAll(".onboarding-dot").forEach(el=>{
        el.classList.toggle("active", Number(el.dataset.dot) === onboardingStep);
    });

    document.getElementById("onboardingPrevBtn").disabled = onboardingStep === 1;

    const nextBtn = document.getElementById("onboardingNextBtn");

    nextBtn.innerHTML = onboardingStep === ONBOARDING_TOTAL_STEPS
        ? "<i class=\"fa-solid fa-check\"></i> Rozumiem"
        : "Dalej <i class=\"fa-solid fa-chevron-right\"></i>";
}

function openOnboardingModal(){
    onboardingStep = 1;
    updateOnboardingStep();
    document.getElementById("onboardingModal").classList.add("active");
}

function closeOnboardingModal(){
    document.getElementById("onboardingModal").classList.remove("active");
}

function maybeShowOnboarding(){

    const username = window.LZPN_AUTH.getUsername();
    if(!username) return;

    const key = `lzpn_onboarding_seen_${username}`;

    if(!localStorage.getItem(key)){
        localStorage.setItem(key, "1");
        openOnboardingModal();
    }
}

document
.getElementById("openOnboardingBtn")
.addEventListener("click", openOnboardingModal);

document
.getElementById("closeOnboardingModal")
.addEventListener("click", closeOnboardingModal);

document
.getElementById("onboardingPrevBtn")
.addEventListener("click", ()=>{

    if(onboardingStep > 1){
        onboardingStep--;
        updateOnboardingStep();
    }
});

document
.getElementById("onboardingNextBtn")
.addEventListener("click", ()=>{

    if(onboardingStep < ONBOARDING_TOTAL_STEPS){
        onboardingStep++;
        updateOnboardingStep();
    }else{
        closeOnboardingModal();
    }
});

document
.getElementById("addMatchUnderCalendarBtn")
.addEventListener("click", addMatchFromTable);

document
.getElementById("pdfBtnUnderCalendar")
.addEventListener("click", exportPDF);

/* ======================================
   DANE SĘDZIEGO
====================================== */

function loadReferee(){

    const name =
        window.LZPN_AUTH.getRefereeName();

    document
        .getElementById(
            "refereeNameDisplay"
        )
        .textContent =
        `Sędzia: ${name}`;
}

function saveReferee(){

    const name =
        document
            .getElementById(
                "refereeNameInput"
            )
            .value
            .trim();

    if(!name){

        alert(
            "Podaj imię i nazwisko"
        );

        return;
    }

    window.LZPN_AUTH.setRefereeName(name);

    document
        .getElementById(
            "refereeNameDisplay"
        )
        .textContent =
        `Sędzia: ${name}`;

    document
        .getElementById(
            "refereeModal"
        )
        .classList.remove("active");

    showToast(
        "Dane zapisane"
    );
}

document
.getElementById("saveRefereeBtn")
.addEventListener(
    "click",
    saveReferee
);

document
.getElementById("changeRefereeBtn")
.addEventListener(
    "click",
    ()=>{

        if(typeof window.LZPN_POPULATE_ACCOUNT_SUMMARY === "function"){
            window.LZPN_POPULATE_ACCOUNT_SUMMARY();
        }

        document
            .getElementById(
                "refereeModal"
            )
            .classList.add("active");

    }
);

/* ======================================
   LISTA DRUŻYN
====================================== */

const teamsList =
    document.getElementById(
        "teamsList"
    );

populateTeamsDatalist();

function normalizeText(text){

    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function setupTeamSearch(inputId, suggestionsId){

    const input =
        document.getElementById(inputId);

    const suggestions =
        document.getElementById(suggestionsId);

    input.addEventListener("input", ()=>{

        const value =
            normalizeText(input.value);

        suggestions.innerHTML = "";

        if(value.length < 2){

            suggestions.style.display = "none";
            return;
        }

        const filtered =
            TEAMS.filter(team=>

                normalizeText(team)
                .includes(value)

            ).slice(0,10);

        if(filtered.length === 0){

            suggestions.style.display = "none";
            return;
        }

        filtered.forEach(team=>{

            const item =
                document.createElement("div");

            item.className =
                "suggestion-item";

            item.textContent =
                team;

            item.addEventListener("click", ()=>{

                input.value = team;

                suggestions.style.display =
                    "none";
            });

            suggestions.appendChild(item);

        });

        suggestions.style.display =
            "block";

    });

    document.addEventListener("click",(e)=>{

        if(
            !input.contains(e.target) &&
            !suggestions.contains(e.target)
        ){

            suggestions.style.display =
                "none";
        }

    });

}

setupTeamSearch(
    "homeTeam",
    "homeTeamSuggestions"
);

setupTeamSearch(
    "awayTeam",
    "awayTeamSuggestions"
);