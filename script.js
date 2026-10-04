// stores the next pagination url returned by the api
var nextUrl = null;

// color mapping dictionary to parse api color descriptions into hex codes[cite: 10]
const colorMap = {
    "blond": "#faf0be",
    "fair": "#ffe0bd",
    "gold": "#ffd700",
    "white": "#ffffff",
    "grey": "#808080",
    "brown": "#8b4513",
    "black": "#111111",
    "blue": "#1e90ff",
    "red": "#ff4d4f",
    "yellow": "#ffd700",
    "hazel": "#8e7618",
    "light": "#f0e68c",
    "peachpuff": "#ffdab9"
};

// extracts the primary color keyword and falls back to gray if missing[cite: 10]
function getCssColor(rawColor) {
    if (!rawColor) return "#888888";
    const firstWord = rawColor.split(",")[0].trim().toLowerCase();
    return colorMap[firstWord] || firstWord;
}

// reusable fetch wrapper that automatically parses json responses[cite: 10]
function get(url, fct) {
    fetch(url)
        .then(response => response.json())
        .then(data => fct(data));
}

// name lists for character faction classification[cite: 10]
const darkSideNames = ["Darth Vader", "Palpatine", "Wilhuff Tarkin", "Boba Fett", "Darth Maul"];
const lightSideNames = ["Luke Skywalker", "Leia Organa", "Obi-Wan Kenobi", "Yoda", "Han Solo", "Chewbacca", "C-3PO", "R2-D2"];

// assigns badge label and styling classes based on character name[cite: 10]
function getAffiliation(name) {
    if (darkSideNames.some(d => name.includes(d))) {
        return { label: "Empire / Sith", class: "theme-dark", badgeClass: "badge-dark" };
    }
    if (lightSideNames.some(l => name.includes(l))) {
        return { label: "Rebellion / Jedi", class: "theme-light", badgeClass: "badge-light" };
    }
    return { label: "Independent", class: "", badgeClass: "badge-neutral" };
}

// fetches full character data and injects the card into the dom[cite: 10]
function displayOnePeople(littlePeople) {
    get(littlePeople.url, function (people) {
        var person = people.result.properties;
        var container = document.getElementById("container");

        // compute visual dots for physical traits[cite: 10]
        var eyeCss = getCssColor(person.eye_color);
        var hairCss = getCssColor(person.hair_color);
        const affiliation = getAffiliation(person.name);

        // construct card element with affiliation theme[cite: 10]
        var card = document.createElement("div");
        card.className = "card " + affiliation.class;

        card.innerHTML =
            "<div class='badge-container'>" +
            "<span class='affiliation-badge " + affiliation.badgeClass + "'>" + affiliation.label + "</span>" +
            "</div>" +
            "<h3>" + person.name + "</h3>" +
            "<p><strong>Taille :</strong> " + person.height + " cm</p>" +
            "<p><strong>Masse :</strong> " + person.mass + " kg</p>" +
            "<p><strong>Genre :</strong> " + person.gender + "</p>" +
            "<p><strong>Yeux :</strong> " + person.eye_color +
            " <span class='color-box' style='background-color: " + eyeCss + ";'></span></p>" +
            "<p><strong>Cheveux :</strong> " + person.hair_color +
            " <span class='color-box' style='background-color: " + hairCss + ";'></span></p>" +
            "<div class='homeworld-box' id='planet-" + littlePeople.uid + "'><em>Loading planet...</em></div>";

        // trigger detail modal on click[cite: 10]
        card.addEventListener("click", function () {
            openModal(person);
        });
        container.appendChild(card);

        // fetch homeworld data asynchronously without blocking the card render[cite: 10]
        if (person.homeworld) {
            get(person.homeworld, function (planetData) {
                var planet = planetData.result.properties;
                var planetEl = document.getElementById("planet-" + littlePeople.uid);
                if (planetEl) {
                    planetEl.innerHTML = "<strong>Planet:</strong> " + planet.name +
                        "<br><small>Climate: " + planet.climate + " | Terrain: " + planet.terrain + "</small>";
                }
            });
        }
    });
}

// fetches a page of characters and triggers card generation for each entry[cite: 10]
function load(url) {
    get(url, function (data) {
        nextUrl = data.next;
        // hide pagination button if no further pages exist[cite: 10]
        if (!nextUrl) {
            document.getElementById("btn-more").style.display = "none";
        }
        var loading = document.getElementById("loading");
        if (loading) {
            loading.remove();
        }
        data.results.forEach(function (littlePeople) {
            displayOnePeople(littlePeople);
        });
    });
}

// character lightbox modal element references[cite: 10]
const modal = document.getElementById("modal");
document.getElementById("modal-close").onclick = () => modal.style.display = "none";
modal.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };

// opens character lightbox and loads nested movie and transport details[cite: 10]
function openModal(person) {
    modal.style.display = "flex";
    document.getElementById("modal-title").innerText = person.name;
    const body = document.getElementById("modal-body");
    body.innerHTML = "<p>Loading episodes & vehicles...</p>";

    // combine ground vehicles and space starships into one list[cite: 10]
    const transportUrls = (person.vehicles || []).concat(person.starships || []);
    const filmUrls = person.films || [];

    // helper to recursively resolve an array of urls into readable titles[cite: 10]
    function fetchNames(urls, label, callback) {
        if (!urls.length) return callback(`<p><strong>${label}:</strong> None</p>`);
        let names = [];
        let done = 0;
        urls.forEach(url => {
            get(url, data => {
                names.push(data.result.properties.title || data.result.properties.name);
                done++;
                // return combined result once all asynchronous calls finish[cite: 10]
                if (done === urls.length) {
                    callback(`<p><strong>${label}:</strong> ${names.join(", ")}</p>`);
                }
            });
        });
    }

    // fetch films first, then transports, then inject combined html[cite: 10]
    fetchNames(filmUrls, "Appears in Episodes", filmsHtml => {
        fetchNames(transportUrls, "Piloted Transports", transportsHtml => {
            body.innerHTML = filmsHtml + transportsHtml;
        });
    });
}

// films timeline modal element references[cite: 10]
const filmsModal = document.getElementById("films-modal");
const filmsContent = document.getElementById("films-content");
const filmsViewList = document.getElementById("films-view-list");
const filmsViewDetail = document.getElementById("films-view-detail");

// dismiss films timeline modal[cite: 10]
document.getElementById("films-modal-close").onclick = () => filmsModal.style.display = "none";
filmsModal.onclick = (e) => { if (e.target === filmsModal) filmsModal.style.display = "none"; };

// back button to return from single movie view to saga list[cite: 10]
document.getElementById("films-btn-back").onclick = () => {
    filmsViewDetail.style.display = "none";
    filmsViewList.style.display = "block";
};

// open films modal and load movie data once[cite: 10]
document.getElementById("btn-films").onclick = () => {
    filmsModal.style.display = "flex";
    filmsViewDetail.style.display = "none";
    filmsViewList.style.display = "block";

    // skip re-fetching if data is already cached in dom[cite: 10]
    if (filmsContent.getAttribute("data-loaded")) return;

    get("https://www.swapi.tech/api/films", function (data) {
        const list = data.result || data.results;
        const fullFilms = list.map(item => item.properties || item);
        renderTimeline(fullFilms);
        filmsContent.setAttribute("data-loaded", "true");
    });
};

// sorts and categorizes movies into their respective trilogies[cite: 10]
function renderTimeline(films) {
    // sort movies by episode number (1 to 6+)[cite: 10]
    films.sort((a, b) => a.episode_id - b.episode_id);

    const prequels = films.filter(f => f.episode_id >= 1 && f.episode_id <= 3);
    const original = films.filter(f => f.episode_id >= 4 && f.episode_id <= 6);
    const sequels = films.filter(f => f.episode_id > 6);

    // sub-template generator for each trilogy group[cite: 10]
    function buildSection(title, list) {
        if (!list.length) return "";
        let html = "<div class='timeline-section-title'>" + title + "</div><ul class='timeline-list'>";
        list.forEach(film => {
            html += "<li class='timeline-item' data-id='" + film.episode_id + "'>" +
                "<strong>Episode " + film.episode_id + ": " + film.title + "</strong>" +
                "<span>Released: " + film.release_date + "</span>" +
                "</li>";
        });
        html += "</ul>";
        return html;
    }

    filmsContent.innerHTML =
        buildSection("Prequel Trilogy", prequels) +
        buildSection("Original Trilogy", original) +
        buildSection("Sequels & Others", sequels);

    // attach click listeners to display full movie details[cite: 10]
    document.querySelectorAll(".timeline-item").forEach(item => {
        item.addEventListener("click", () => {
            const epId = parseInt(item.getAttribute("data-id"));
            const chosen = films.find(f => f.episode_id === epId);
            showFilmDetail(chosen);
        });
    });
}

// switches to detail view and renders director, producer, and opening crawl[cite: 10]
function showFilmDetail(film) {
    filmsViewList.style.display = "none";
    filmsViewDetail.style.display = "block";

    document.getElementById("film-detail-title").innerText = "Episode " + film.episode_id + ": " + film.title;
    document.getElementById("film-detail-body").innerHTML =
        "<p><strong>Director:</strong> " + film.director + "</p>" +
        "<p><strong>Producer:</strong> " + film.producer + "</p>" +
        "<p><strong>Release Date:</strong> " + film.release_date + "</p>" +
        "<p style='margin-top: 12px;'><strong>Opening Crawl:</strong></p>" +
        "<p style='font-style: italic; color: #ddd; line-height: 1.5; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;'>" +
        film.opening_crawl.replace(/\r\n/g, "<br>") +
        "</p>";
}

// pagination listener for 'more characters' button[cite: 10]
document.getElementById("btn-more").addEventListener("click", function () {
    if (nextUrl) {
        load(nextUrl);
    }
});

// kick off first api request on page load[cite: 10]
load("https://www.swapi.tech/api/people");