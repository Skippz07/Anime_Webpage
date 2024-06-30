const apiBaseURL = 'https://animetize-api-wgiz.onrender.com';

let searchTimeout;

async function fetchRoute(route, params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseURL}/${route}?${query}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log(data); // Log API response for debugging
    return data;
}

async function displayLatestEpisodes() {
    try {
        const data = await fetchRoute('recent-episodes', { page: 1, type: 1 });
        displayAnimeList(data.results, 'latest-episodes');
    } catch (error) {
        displayError(`Error fetching latest episodes: ${error.message}`);
    }
}

async function displayTopAiringAnime() {
    try {
        const data = await fetchRoute('top-airing', { page: 1 });
        displayAnimeList(data.results, 'top-airing-anime');
    } catch (error) {
        displayError(`Error fetching top airing anime: ${error.message}`);
    }
}

async function displayPopularMovies() {
    try {
        const data = await fetchRoute('movies', { page: 1 });
        displayAnimeList(data.results, 'popular-movies');
    } catch (error) {
        displayError(`Error fetching popular movies: ${error.message}`);
    }
}

async function displayGenres() {
    try {
        const data = await fetchRoute('genre/list');
        const container = document.getElementById('genre-list');
        if (data && data.length > 0) {
            container.innerHTML = data.map(genre => `
                <div class="genre-card" onclick="fetchGenreAnime('${genre.id}', '${genre.title}')">
                    ${genre.title}
                </div>
            `).join('');
        } else {
            console.error('Invalid genres data:', data);
            displayError('Failed to load genres.');
        }
    } catch (error) {
        displayError(`Error fetching genres: ${error.message}`);
    }
}

async function fetchGenreAnime(genreId, genreTitle) {
    try {
        const data = await fetchRoute(`genre/${genreId}`);
        displayAnimeList(data.results, 'latest-episodes');
        document.getElementById('current-genre').textContent = `Now Showing: ${genreTitle} Anime`;
        highlightSelectedGenre(genreId);
    } catch (error) {
        displayError(`Error fetching anime for genre: ${error.message}`);
    }
}

async function searchAnime(query) {
    if (!query) {
        resetContent();
        return;
    }
    try {
        const data = await fetchRoute('search', { query, page: 1 });
        displayAnimeList(data.results, 'latest-episodes');
        document.getElementById('current-genre').textContent = `Search Results for: ${query}`;
    } catch (error) {
        displayError(`Error searching anime: ${error.message}`);
    }
}

function handleSearchInput() {
    const query = document.getElementById('search-input').value;
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
        searchAnime(query);
    }, 500); 
}

function displayAnimeList(animeList, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = animeList.map(anime => `
        <div class="anime-card" onclick="redirectToAnime('${anime.id}')">
            <img src="${anime.image}" alt="${anime.title}">
            <div class="type">${anime.type || 'TV'}</div>
            <h3>${anime.title}</h3>
            <p>${anime.releaseDate || ''}</p>
            <p>${anime.genres ? anime.genres.join(', ') : ''}</p>
        </div>
    `).join('');
}

function displayError(message) {
    const display = document.getElementById('dataDisplay');
    display.textContent = message;
    display.style.color = 'red';
}

function highlightSelectedGenre(genreId) {
    const genreCards = document.querySelectorAll('.genre-card');
    genreCards.forEach(card => {
        card.classList.remove('selected');
        if (card.onclick.toString().includes(genreId)) {
            card.classList.add('selected');
        }
    });
}

function closeSidebar() {
    document.getElementById('sidebar').style.display = 'none';
}

function redirectToAnime(animeId) {
    window.location.href = `anime.html?id=${animeId}`;
}

function resetContent() {
    document.getElementById('current-genre').textContent = 'Now Showing: All Anime';
    displayLatestEpisodes();
    displayTopAiringAnime();
    displayPopularMovies();
}

document.addEventListener('DOMContentLoaded', () => {
    resetContent();
    displayGenres();
});
